import type { Role, UnitStatus } from "./types";

/**
 * Unit status state machine. Every status change in the app goes through
 * `canTransition` — UI buttons are derived from it, and the command layer
 * re-checks it before writing.
 */
const TRANSITIONS: Record<UnitStatus, readonly UnitStatus[]> = {
  available: ["reserved", "sold", "unavailable"],
  reserved: ["available", "sold"],
  unavailable: ["available"],
  sold: ["available"],
};

/** Transitions that only an admin may perform. */
const ADMIN_ONLY: ReadonlyArray<readonly [UnitStatus, UnitStatus]> = [["sold", "available"]];

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: "same_status" | "invalid_transition" | "forbidden" };

export function canTransition(from: UnitStatus, to: UnitStatus, role: Role): TransitionCheck {
  if (from === to) return { ok: false, reason: "same_status" };
  if (!TRANSITIONS[from].includes(to)) return { ok: false, reason: "invalid_transition" };
  const adminOnly = ADMIN_ONLY.some(([f, t]) => f === from && t === to);
  if (adminOnly && role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true };
}

export function allowedTransitions(from: UnitStatus, role: Role): UnitStatus[] {
  return TRANSITIONS[from].filter((to) => canTransition(from, to, role).ok);
}

export type Permission =
  | "unit.status"
  | "unit.price"
  | "unit.bulkPrice"
  | "lead.manage"
  | "lead.export"
  | "audit.view"
  | "sandbox.reset";

const PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    "unit.status",
    "unit.price",
    "unit.bulkPrice",
    "lead.manage",
    "lead.export",
    "audit.view",
    "sandbox.reset",
  ]),
  agent: new Set<Permission>(["unit.status", "lead.manage", "lead.export", "sandbox.reset"]),
};

export const can = (role: Role | null | undefined, permission: Permission) =>
  role ? PERMISSIONS[role].has(permission) : false;
