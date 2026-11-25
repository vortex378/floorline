import { ORIENTATIONS, UNIT_TYPES, type Orientation, type Unit, type UnitType } from "./types";

export interface Range {
  min: number | null;
  max: number | null;
}

export interface UnitFilters {
  types: UnitType[];
  price: Range;
  area: Range;
  floor: Range;
  orientations: Orientation[];
  availableOnly: boolean;
}

export const EMPTY_FILTERS: UnitFilters = {
  types: [],
  price: { min: null, max: null },
  area: { min: null, max: null },
  floor: { min: null, max: null },
  orientations: [],
  availableOnly: false,
};

const inRange = (value: number, r: Range) =>
  (r.min === null || value >= r.min) && (r.max === null || value <= r.max);

export function matchesFilters(unit: Unit, f: UnitFilters): boolean {
  if (f.types.length && !f.types.includes(unit.type)) return false;
  if (f.orientations.length && !f.orientations.includes(unit.orientation)) return false;
  if (f.availableOnly && unit.status !== "available") return false;
  if (!inRange(unit.areaNet, f.area)) return false;
  if (!inRange(unit.floor, f.floor)) return false;
  if (f.price.min !== null || f.price.max !== null) {
    // Units with hidden prices only match when no price filter is set.
    if (!unit.priceVisible) return false;
    if (!inRange(unit.price, f.price)) return false;
  }
  return true;
}

export const activeFilterCount = (f: UnitFilters) =>
  (f.types.length ? 1 : 0) +
  (f.orientations.length ? 1 : 0) +
  (f.availableOnly ? 1 : 0) +
  (f.price.min !== null || f.price.max !== null ? 1 : 0) +
  (f.area.min !== null || f.area.max !== null ? 1 : 0) +
  (f.floor.min !== null || f.floor.max !== null ? 1 : 0);

// ---- URL serialization -----------------------------------------------------
// type=2+1,3+1&price=100000-250000&area=60-&floor=3-8&orient=S,SE&avail=1

const serializeRange = (r: Range) =>
  r.min === null && r.max === null ? null : `${r.min ?? ""}-${r.max ?? ""}`;

function parseRange(raw: string | null): Range {
  if (!raw) return { min: null, max: null };
  const m = /^(\d*)-(\d*)$/.exec(raw.trim());
  if (!m) return { min: null, max: null };
  const min = m[1] === "" ? null : Number(m[1]);
  const max = m[2] === "" ? null : Number(m[2]);
  if (min !== null && max !== null && min > max) return { min: max, max: min };
  return { min, max };
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const set = new Set(allowed as readonly string[]);
  return [...new Set(raw.split(",").map((s) => s.trim()))].filter((s): s is T => set.has(s));
}

export function filtersToSearchParams(f: UnitFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.types.length) p.set("type", f.types.join(","));
  const price = serializeRange(f.price);
  if (price) p.set("price", price);
  const area = serializeRange(f.area);
  if (area) p.set("area", area);
  const floor = serializeRange(f.floor);
  if (floor) p.set("floor", floor);
  if (f.orientations.length) p.set("orient", f.orientations.join(","));
  if (f.availableOnly) p.set("avail", "1");
  return p;
}

export function filtersFromSearchParams(p: URLSearchParams): UnitFilters {
  return {
    // A literal "+" in a hand-typed URL decodes to a space ("2 1") — undo that.
    types: parseList(p.get("type")?.replace(/ /g, "+") ?? null, UNIT_TYPES),
    price: parseRange(p.get("price")),
    area: parseRange(p.get("area")),
    floor: parseRange(p.get("floor")),
    orientations: parseList(p.get("orient"), ORIENTATIONS),
    availableOnly: p.get("avail") === "1",
  };
}
