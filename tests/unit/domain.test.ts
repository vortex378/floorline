import { describe, expect, it } from "vitest";
import { FLOORS, UNITS } from "@/domain/catalog";
import {
  addLeadNote,
  bulkAdjustPrices,
  changeUnitStatus,
  LEAD_RATE_LIMIT,
  moveLead,
  previewBulkPrices,
  setUnitPrice,
  submitLead,
  type Ctx,
} from "@/domain/commands";
import {
  EMPTY_FILTERS,
  filtersFromSearchParams,
  filtersToSearchParams,
  matchesFilters,
  type UnitFilters,
} from "@/domain/filters";
import { adjustPrice, listPrice, roundPrice } from "@/domain/pricing";
import { allowedTransitions, can, canTransition } from "@/domain/rules";
import { createSeedState, seedStatuses, seedUnits } from "@/domain/seed";
import type { Actor } from "@/domain/types";

const admin: Actor = { name: "Sara Prifti", role: "admin" };
const agent: Actor = { name: "Elira Dervishi", role: "agent" };
const NOW = 1_800_000_000_000;

let seq = 0;
const ctx = (now = NOW): Ctx => ({ now, id: () => `id${++seq}` });

const firstWith = (status: string) => {
  const state = createSeedState(NOW);
  const code = Object.keys(state.units).find((c) => state.units[c].status === status);
  if (!code) throw new Error(`no ${status} unit in seed`);
  return { state, code };
};

describe("catalog", () => {
  it("has 65 units across 12 levels with unique codes", () => {
    expect(UNITS).toHaveLength(65);
    expect(FLOORS).toHaveLength(12);
    expect(new Set(UNITS.map((u) => u.code)).size).toBe(65);
  });

  it("keeps every unit polygon inside the plan", () => {
    for (const u of UNITS) {
      for (const [x, y] of u.shape) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1000);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(560);
      }
    }
  });
});

describe("seed", () => {
  it("is deterministic so server and client render the same statuses", () => {
    expect(seedStatuses()).toEqual(seedStatuses());
    expect(seedUnits().map((u) => u.status)).toEqual(seedUnits().map((u) => u.status));
  });

  it("has a realistic status mix", () => {
    const statuses = Object.values(seedStatuses());
    const share = (s: string) => statuses.filter((x) => x === s).length / statuses.length;
    expect(share("sold")).toBeGreaterThan(0.3);
    expect(share("sold")).toBeLessThan(0.65);
    expect(share("available")).toBeGreaterThan(0.2);
    expect(share("reserved")).toBeGreaterThan(0.05);
  });

  it("links every sold unit to a won lead and history", () => {
    const state = createSeedState(NOW);
    for (const [code, u] of Object.entries(state.units)) {
      if (u.status !== "sold") continue;
      expect(state.history.some((e) => e.code === code && e.to === "sold")).toBe(true);
      expect(state.leads.some((l) => l.unitCodes.includes(code) && l.stage === "won")).toBe(true);
    }
  });
});

describe("pricing", () => {
  it("rounds to €500", () => {
    expect(roundPrice(123_249)).toBe(123_000);
    expect(roundPrice(123_250)).toBe(123_500);
  });

  it("charges more for higher floors and south-facing units", () => {
    const base = { type: "2+1" as const, areaGross: 100, terrace: 10 };
    expect(listPrice({ ...base, floor: 9, orientation: "S" })).toBeGreaterThan(listPrice({ ...base, floor: 2, orientation: "S" }));
    expect(listPrice({ ...base, floor: 5, orientation: "S" })).toBeGreaterThan(listPrice({ ...base, floor: 5, orientation: "N" }));
  });

  it("adjusts by percent", () => {
    expect(adjustPrice(200_000, 2.5)).toBe(205_000);
    expect(adjustPrice(200_000, -10)).toBe(180_000);
    expect(() => adjustPrice(200_000, Number.NaN)).toThrow();
  });
});

describe("status rules", () => {
  it("follows the state machine", () => {
    expect(canTransition("available", "reserved", "agent").ok).toBe(true);
    expect(canTransition("reserved", "sold", "agent").ok).toBe(true);
    expect(canTransition("unavailable", "sold", "admin")).toEqual({ ok: false, reason: "invalid_transition" });
    expect(canTransition("sold", "sold", "admin")).toEqual({ ok: false, reason: "same_status" });
  });

  it("only lets admins undo a sale", () => {
    expect(canTransition("sold", "available", "agent")).toEqual({ ok: false, reason: "forbidden" });
    expect(canTransition("sold", "available", "admin").ok).toBe(true);
    expect(allowedTransitions("sold", "agent")).toEqual([]);
  });

  it("scopes permissions by role", () => {
    expect(can("admin", "unit.bulkPrice")).toBe(true);
    expect(can("agent", "unit.bulkPrice")).toBe(false);
    expect(can("agent", "unit.price")).toBe(false);
    expect(can(null, "unit.status")).toBe(false);
  });
});

describe("changeUnitStatus", () => {
  it("reserves a unit, bumps the version and writes history", () => {
    const { state, code } = firstWith("available");
    const res = changeUnitStatus(state, { code, to: "reserved", expectedVersion: 1, actor: agent, note: "Deposit" }, ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.units[code]).toMatchObject({ status: "reserved", version: 2 });
    expect(res.state.history[0]).toMatchObject({ code, from: "available", to: "reserved", actor: agent.name, note: "Deposit" });
    // input state is untouched (pure)
    expect(state.units[code].status).toBe("available");
  });

  it("rejects a stale write: two agents reserving the same unit — exactly one wins", () => {
    const { state, code } = firstWith("available");
    const first = changeUnitStatus(state, { code, to: "reserved", expectedVersion: 1, actor: agent }, ctx());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // The second agent opened the dialog when the unit was still at version 1.
    const second = changeUnitStatus(first.state, { code, to: "reserved", expectedVersion: 1, actor: admin }, ctx());
    expect(second).toEqual({ ok: false, error: { code: "conflict", currentVersion: 2 } });
    expect(first.state.history.filter((e) => e.code === code && e.at === NOW)).toHaveLength(1);
  });

  it("moves a linked lead along the pipeline", () => {
    const { state, code } = firstWith("available");
    const lead = state.leads.find((l) => l.stage === "viewing")!;
    const res = changeUnitStatus(state, { code, to: "reserved", expectedVersion: 1, actor: agent, leadId: lead.id }, ctx());
    if (!res.ok) throw new Error("expected ok");
    const updated = res.state.leads.find((l) => l.id === lead.id)!;
    expect(updated.stage).toBe("reserved");
    expect(updated.unitCodes).toContain(code);
  });

  it("refuses invalid and forbidden transitions", () => {
    const { state, code } = firstWith("sold");
    const v = state.units[code].version;
    expect(changeUnitStatus(state, { code, to: "available", expectedVersion: v, actor: agent }, ctx())).toEqual({ ok: false, error: { code: "forbidden" } });
    expect(changeUnitStatus(state, { code, to: "reserved", expectedVersion: v, actor: admin }, ctx())).toEqual({
      ok: false,
      error: { code: "invalid_transition", from: "sold", to: "reserved" },
    });
    expect(changeUnitStatus(state, { code: "99-Z", to: "reserved", expectedVersion: 1, actor: admin }, ctx())).toEqual({ ok: false, error: { code: "not_found" } });
  });
});

describe("pricing commands", () => {
  it("previews and applies a bulk change only to units still on sale", () => {
    const state = createSeedState(NOW);
    const preview = previewBulkPrices(state, { floors: [9, 10], types: [], percent: 3 });
    expect(preview.length).toBeGreaterThan(0);
    for (const row of preview) {
      expect(["available", "reserved"]).toContain(state.units[row.code].status);
      expect(row.newPrice).toBe(adjustPrice(row.oldPrice, 3));
    }
    const res = bulkAdjustPrices(state, { floors: [9, 10], types: [], percent: 3, reason: "Q3 update", actor: admin }, ctx());
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.changed).toBe(preview.length);
    expect(res.state.priceChanges.slice(0, preview.length).every((p) => p.reason === "Q3 update")).toBe(true);
  });

  it("forbids agents from bulk pricing and validates input", () => {
    const state = createSeedState(NOW);
    expect(bulkAdjustPrices(state, { floors: [], types: [], percent: 3, reason: "x y z", actor: agent }, ctx())).toEqual({ ok: false, error: { code: "forbidden" } });
    expect(bulkAdjustPrices(state, { floors: [], types: [], percent: 40, reason: "too much", actor: admin }, ctx())).toMatchObject({ ok: false, error: { code: "validation" } });
  });

  it("sets a single price with history", () => {
    const { state, code } = firstWith("available");
    const res = setUnitPrice(state, { code, price: 150_000, priceVisible: false, expectedVersion: 1, actor: admin }, ctx());
    if (!res.ok) throw new Error("expected ok");
    expect(res.state.units[code]).toMatchObject({ price: 150_000, priceVisible: false, version: 2 });
    expect(res.state.priceChanges[0]).toMatchObject({ code, newPrice: 150_000 });
  });
});

describe("leads", () => {
  const valid = {
    name: "Test Buyer",
    phone: "+355 69 555 1234",
    email: "",
    preferredContact: "whatsapp",
    locale: "en",
    message: "Hi",
    unitCodes: ["05-A"],
    source: "unit_page",
    consent: true,
    company: "",
  };

  it("accepts a valid request", () => {
    const res = submitLead(createSeedState(NOW), valid, { ...ctx(), recentSubmissions: [] });
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    expect(res.state.leads[0]).toMatchObject({ name: "Test Buyer", stage: "new", unitCodes: ["05-A"] });
  });

  it("returns field errors", () => {
    const res = submitLead(createSeedState(NOW), { ...valid, phone: "abc", consent: false, preferredContact: "email" }, { ...ctx(), recentSubmissions: [] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatchObject({ code: "validation", issues: { phone: "phone_invalid", consent: "consent_required" } });
  });

  it("silently drops honeypot submissions", () => {
    const state = createSeedState(NOW);
    const res = submitLead(state, { ...valid, company: "Spam Inc" }, { ...ctx(), recentSubmissions: [] });
    expect(res.ok && res.state).toBe(state);
  });

  it("rate limits bursts", () => {
    const recent = Array.from({ length: LEAD_RATE_LIMIT.max }, (_, i) => NOW - i * 1000);
    const res = submitLead(createSeedState(NOW), valid, { ...ctx(), recentSubmissions: recent });
    expect(res).toMatchObject({ ok: false, error: { code: "rate_limited" } });
  });

  it("moves leads and adds notes", () => {
    const state = createSeedState(NOW);
    const lead = state.leads.find((l) => l.stage === "new")!;
    const moved = moveLead(state, { id: lead.id, stage: "contacted", actor: agent });
    if (!moved.ok) throw new Error("expected ok");
    expect(moved.state.leads.find((l) => l.id === lead.id)).toMatchObject({ stage: "contacted", assignedTo: agent.name });
    const noted = addLeadNote(moved.state, { id: lead.id, body: "Called back", actor: agent }, ctx());
    if (!noted.ok) throw new Error("expected ok");
    expect(noted.state.leads.find((l) => l.id === lead.id)!.notes.at(-1)).toMatchObject({ body: "Called back" });
  });
});

describe("filters", () => {
  const units = seedUnits();

  it("round-trips through the URL", () => {
    const f: UnitFilters = {
      types: ["2+1", "3+1"],
      price: { min: 100_000, max: 250_000 },
      area: { min: 60, max: null },
      floor: { min: 3, max: 8 },
      orientations: ["S", "SE"],
      availableOnly: true,
    };
    expect(filtersFromSearchParams(filtersToSearchParams(f))).toEqual(f);
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe("");
  });

  it("tolerates hand-written and broken URLs", () => {
    const f = filtersFromSearchParams(new URLSearchParams("type=2+1,9+9&price=300-100&floor=abc&orient=S,UP"));
    expect(f.types).toEqual(["2+1"]);
    expect(f.price).toEqual({ min: 100, max: 300 });
    expect(f.floor).toEqual({ min: null, max: null });
    expect(f.orientations).toEqual(["S"]);
  });

  it("filters units", () => {
    const result = units.filter((u) => matchesFilters(u, { ...EMPTY_FILTERS, types: ["1+1"], availableOnly: true }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((u) => u.type === "1+1" && u.status === "available")).toBe(true);
  });

  it("excludes price-on-request units when a price filter is set", () => {
    const result = units.filter((u) => matchesFilters(u, { ...EMPTY_FILTERS, price: { min: 0, max: null } }));
    expect(result.some((u) => u.type === "penthouse")).toBe(false);
  });
});
