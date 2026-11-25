import { UNIT_BY_CODE } from "./catalog";
import { leadInputSchema, type LeadInput } from "./leads";
import { adjustPrice } from "./pricing";
import { can, canTransition } from "./rules";
import type { SandboxState } from "./seed";
import type { Actor, Lead, LeadStage, PriceChange, UnitStatus, UnitType } from "./types";

/**
 * Commands are pure functions: (state, input) → Result.
 * The store runs them inside a cross-tab lock against the latest persisted
 * state, so they behave like small transactions.
 */
export type CommandError =
  | { code: "not_found" }
  | { code: "forbidden" }
  | { code: "conflict"; currentVersion: number }
  | { code: "invalid_transition"; from: UnitStatus; to: UnitStatus }
  | { code: "same_status" }
  | { code: "validation"; issues: Record<string, string> }
  | { code: "rate_limited"; retryInMs: number }
  | { code: "empty_selection" };

export type Result<T> = { ok: true; state: SandboxState; value: T } | { ok: false; error: CommandError };

const ok = <T,>(state: SandboxState, value: T): Result<T> => ({ ok: true, state, value });
const fail = <T,>(error: CommandError): Result<T> => ({ ok: false, error });

export interface Ctx {
  now: number;
  id: () => string;
}

export interface ChangeStatusInput {
  code: string;
  to: UnitStatus;
  /** Version the actor saw when they opened the dialog (optimistic locking). */
  expectedVersion: number;
  actor: Actor;
  leadId?: string | null;
  note?: string;
}

export function changeUnitStatus(state: SandboxState, input: ChangeStatusInput, ctx: Ctx): Result<{ from: UnitStatus }> {
  const unit = state.units[input.code];
  if (!unit) return fail({ code: "not_found" });
  if (!can(input.actor.role, "unit.status")) return fail({ code: "forbidden" });
  if (unit.version !== input.expectedVersion) {
    return fail({ code: "conflict", currentVersion: unit.version });
  }
  const check = canTransition(unit.status, input.to, input.actor.role);
  if (!check.ok) {
    if (check.reason === "forbidden") return fail({ code: "forbidden" });
    if (check.reason === "same_status") return fail({ code: "same_status" });
    return fail({ code: "invalid_transition", from: unit.status, to: input.to });
  }

  const leadId = input.leadId ?? null;
  const leads = leadId
    ? state.leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              stage: (input.to === "sold" ? "won" : input.to === "reserved" ? "reserved" : l.stage) as LeadStage,
              unitCodes: l.unitCodes.includes(input.code) ? l.unitCodes : [...l.unitCodes, input.code],
            }
          : l,
      )
    : state.leads;

  return ok(
    {
      ...state,
      units: {
        ...state.units,
        [input.code]: { ...unit, status: input.to, version: unit.version + 1, updatedAt: ctx.now },
      },
      history: [
        {
          id: ctx.id(),
          code: input.code,
          from: unit.status,
          to: input.to,
          actor: input.actor.name,
          leadId,
          note: input.note?.trim() ?? "",
          at: ctx.now,
        },
        ...state.history,
      ],
      leads,
    },
    { from: unit.status },
  );
}

export interface SetPriceInput {
  code: string;
  price: number;
  priceVisible: boolean;
  expectedVersion: number;
  actor: Actor;
  reason?: string;
}

export function setUnitPrice(state: SandboxState, input: SetPriceInput, ctx: Ctx): Result<null> {
  const unit = state.units[input.code];
  if (!unit) return fail({ code: "not_found" });
  if (!can(input.actor.role, "unit.price")) return fail({ code: "forbidden" });
  if (unit.version !== input.expectedVersion) return fail({ code: "conflict", currentVersion: unit.version });
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return fail({ code: "validation", issues: { price: "positive" } });
  }
  const changes: PriceChange[] =
    input.price !== unit.price
      ? [{ id: ctx.id(), code: input.code, oldPrice: unit.price, newPrice: input.price, actor: input.actor.name, reason: input.reason?.trim() || "Manual edit", at: ctx.now }]
      : [];
  return ok(
    {
      ...state,
      units: {
        ...state.units,
        [input.code]: { ...unit, price: input.price, priceVisible: input.priceVisible, version: unit.version + 1, updatedAt: ctx.now },
      },
      priceChanges: [...changes, ...state.priceChanges],
    },
    null,
  );
}

export interface BulkPriceInput {
  floors: number[];
  types: UnitType[];
  percent: number;
  reason: string;
  /** Only units still on sale are repriced by default. */
  includeSold?: boolean;
  actor: Actor;
}

export interface BulkPreviewRow {
  code: string;
  oldPrice: number;
  newPrice: number;
}

export function previewBulkPrices(state: SandboxState, input: Omit<BulkPriceInput, "actor" | "reason">): BulkPreviewRow[] {
  return Object.entries(state.units)
    .filter(([code, u]) => {
      const spec = UNIT_BY_CODE.get(code);
      if (!spec) return false;
      if (!input.includeSold && (u.status === "sold" || u.status === "unavailable")) return false;
      const floorOk = input.floors.length === 0 || input.floors.includes(spec.floor);
      const typeOk = input.types.length === 0 || input.types.includes(spec.type);
      return floorOk && typeOk;
    })
    .map(([code, u]) => ({ code, oldPrice: u.price, newPrice: adjustPrice(u.price, input.percent) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function bulkAdjustPrices(state: SandboxState, input: BulkPriceInput, ctx: Ctx): Result<{ changed: number }> {
  if (!can(input.actor.role, "unit.bulkPrice")) return fail({ code: "forbidden" });
  if (!Number.isFinite(input.percent) || input.percent === 0 || Math.abs(input.percent) > 25) {
    return fail({ code: "validation", issues: { percent: "range" } });
  }
  if (input.reason.trim().length < 3) return fail({ code: "validation", issues: { reason: "required" } });
  const rows = previewBulkPrices(state, input).filter((r) => r.newPrice !== r.oldPrice);
  if (rows.length === 0) return fail({ code: "empty_selection" });

  const units = { ...state.units };
  const changes: PriceChange[] = [];
  for (const row of rows) {
    const u = units[row.code];
    units[row.code] = { ...u, price: row.newPrice, version: u.version + 1, updatedAt: ctx.now };
    changes.push({ id: ctx.id(), code: row.code, oldPrice: row.oldPrice, newPrice: row.newPrice, actor: input.actor.name, reason: input.reason.trim(), at: ctx.now });
  }
  return ok({ ...state, units, priceChanges: [...changes, ...state.priceChanges] }, { changed: rows.length });
}

/** Anti-spam: at most 3 leads per visitor per 10 minutes. */
export const LEAD_RATE_LIMIT = { max: 3, windowMs: 10 * 60_000 } as const;

export function submitLead(
  state: SandboxState,
  raw: unknown,
  ctx: Ctx & { recentSubmissions: number[] },
): Result<{ lead: Lead }> {
  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      issues[key] ??= issue.message;
    }
    return fail({ code: "validation", issues });
  }
  const input: LeadInput = parsed.data;
  // Honeypot: real users never fill the hidden field. Pretend success.
  if (input.company) {
    return ok(state, { lead: toLead(input, ctx, "spam") });
  }
  const recent = ctx.recentSubmissions.filter((t) => ctx.now - t < LEAD_RATE_LIMIT.windowMs);
  if (recent.length >= LEAD_RATE_LIMIT.max) {
    const oldest = Math.min(...recent);
    return fail({ code: "rate_limited", retryInMs: LEAD_RATE_LIMIT.windowMs - (ctx.now - oldest) });
  }
  const unknownUnit = input.unitCodes.find((c) => !UNIT_BY_CODE.has(c));
  if (unknownUnit) return fail({ code: "validation", issues: { unitCodes: "unknown_unit" } });

  const lead = toLead(input, ctx);
  return ok({ ...state, leads: [lead, ...state.leads] }, { lead });
}

function toLead(input: LeadInput, ctx: Ctx, idPrefix = "lead"): Lead {
  return {
    id: `${idPrefix}_${ctx.id()}`,
    createdAt: ctx.now,
    name: input.name,
    phone: input.phone,
    email: input.email,
    locale: input.locale,
    message: input.message,
    source: input.source,
    preferredContact: input.preferredContact,
    stage: "new",
    assignedTo: null,
    unitCodes: [...new Set(input.unitCodes)],
    notes: [],
  };
}

export function moveLead(state: SandboxState, input: { id: string; stage: LeadStage; actor: Actor }): Result<null> {
  if (!can(input.actor.role, "lead.manage")) return fail({ code: "forbidden" });
  const lead = state.leads.find((l) => l.id === input.id);
  if (!lead) return fail({ code: "not_found" });
  return ok(
    {
      ...state,
      leads: state.leads.map((l) =>
        l.id === input.id ? { ...l, stage: input.stage, assignedTo: l.assignedTo ?? input.actor.name } : l,
      ),
    },
    null,
  );
}

export function assignLead(state: SandboxState, input: { id: string; assignee: string | null; actor: Actor }): Result<null> {
  if (!can(input.actor.role, "lead.manage")) return fail({ code: "forbidden" });
  if (!state.leads.some((l) => l.id === input.id)) return fail({ code: "not_found" });
  return ok({ ...state, leads: state.leads.map((l) => (l.id === input.id ? { ...l, assignedTo: input.assignee } : l)) }, null);
}

export function addLeadNote(state: SandboxState, input: { id: string; body: string; actor: Actor }, ctx: Ctx): Result<null> {
  if (!can(input.actor.role, "lead.manage")) return fail({ code: "forbidden" });
  const body = input.body.trim();
  if (body.length === 0) return fail({ code: "validation", issues: { body: "required" } });
  if (!state.leads.some((l) => l.id === input.id)) return fail({ code: "not_found" });
  return ok(
    {
      ...state,
      leads: state.leads.map((l) =>
        l.id === input.id
          ? { ...l, notes: [...l.notes, { id: ctx.id(), author: input.actor.name, body, createdAt: ctx.now }] }
          : l,
      ),
    },
    null,
  );
}
