import { ALL_FLOORS, PENTHOUSE_FLOOR, buildFloorUnits } from "./layouts";
import type { FloorSpec, UnitSpec, UnitType } from "./types";

/** Fictional demo project. */
export const PROJECT = {
  name: "Vela Residence",
  city: "Tirana",
  floors: ALL_FLOORS.length,
  deliveryQuarter: "Q2 2028",
  whatsapp: "355690000000",
  constructionStage: 2, // index into progress stages (0-based)
} as const;

export const UNITS: readonly UnitSpec[] = ALL_FLOORS.flatMap((f) => buildFloorUnits(f));

export const UNIT_BY_CODE: ReadonlyMap<string, UnitSpec> = new Map(UNITS.map((u) => [u.code, u]));

export const FLOORS: readonly FloorSpec[] = ALL_FLOORS.map((number) => ({
  number,
  kind: number === 0 ? "commercial" : number === PENTHOUSE_FLOOR ? "penthouse" : "residential",
  unitCodes: UNITS.filter((u) => u.floor === number).map((u) => u.code),
}));

export const RESIDENTIAL_TYPES: readonly UnitType[] = ["1+1", "2+1", "3+1", "penthouse"];

export function getUnitSpec(code: string): UnitSpec | undefined {
  return UNIT_BY_CODE.get(code);
}
