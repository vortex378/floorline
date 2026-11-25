import type { Orientation, UnitSpec } from "./types";

/**
 * Seed pricing model. Numbers are realistic-looking placeholders for a
 * fictional project; the shape of the formula is what matters:
 * base €/m² × floor premium × orientation premium + terrace value.
 */
export const PRICING = {
  residentialBasePerM2: 1750,
  commercialBasePerM2: 2400,
  floorPremiumPerLevel: 0.015,
  penthousePremium: 0.12,
  terraceFactor: 0.4,
  roundTo: 500,
} as const;

const ORIENTATION_PREMIUM: Record<Orientation, number> = {
  S: 0.04,
  SE: 0.03,
  SW: 0.03,
  E: 0.01,
  W: 0.01,
  NE: 0,
  NW: 0,
  N: -0.02,
};

export const roundPrice = (value: number, step: number = PRICING.roundTo) =>
  Math.round(value / step) * step;

export function listPrice(unit: Pick<UnitSpec, "type" | "floor" | "areaGross" | "terrace" | "orientation">): number {
  if (unit.type === "commercial") {
    return roundPrice(unit.areaGross * PRICING.commercialBasePerM2);
  }
  const base = PRICING.residentialBasePerM2;
  const floorFactor = 1 + PRICING.floorPremiumPerLevel * unit.floor;
  const orientationFactor = 1 + ORIENTATION_PREMIUM[unit.orientation];
  const penthouseFactor = unit.type === "penthouse" ? 1 + PRICING.penthousePremium : 1;
  const interior = unit.areaGross * base * floorFactor * orientationFactor * penthouseFactor;
  const terrace = unit.terrace * base * PRICING.terraceFactor;
  return roundPrice(interior + terrace);
}

/** Apply a percentage change and round to the pricing step. */
export function adjustPrice(price: number, percent: number): number {
  if (!Number.isFinite(percent)) throw new Error("percent must be a finite number");
  return roundPrice(price * (1 + percent / 100));
}

export const pricePerM2 = (price: number, areaGross: number) =>
  areaGross > 0 ? Math.round(price / areaGross) : 0;
