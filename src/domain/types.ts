export const UNIT_TYPES = ["1+1", "2+1", "3+1", "penthouse", "commercial"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const UNIT_STATUSES = ["available", "reserved", "sold", "unavailable"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export type Point = readonly [number, number];

export interface Room {
  /** i18n key under `rooms.*` */
  label: "living" | "bed" | "bath" | "kitchen" | "terrace" | "storage" | "shop" | "lobby";
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Immutable facts about a unit — never change after seeding. */
export interface UnitSpec {
  code: string;
  floor: number;
  letter: string;
  type: UnitType;
  bedrooms: number;
  bathrooms: number;
  areaNet: number;
  areaGross: number;
  terrace: number;
  orientation: Orientation;
  /** Polygon on the floor plan (viewBox 0 0 1000 560). */
  shape: readonly Point[];
  rooms: readonly Room[];
  /** Balcony / terrace rectangle drawn outside the footprint. */
  balcony?: { x: number; y: number; w: number; h: number };
}

/** Mutable, sales-side state of a unit. Lives in the store. */
export interface UnitState {
  status: UnitStatus;
  price: number;
  priceVisible: boolean;
  /** Optimistic-concurrency version. Incremented on every write. */
  version: number;
  updatedAt: number;
}

export type Unit = UnitSpec & UnitState;

export interface FloorSpec {
  number: number;
  kind: "commercial" | "residential" | "penthouse";
  unitCodes: string[];
}

export type Role = "admin" | "agent";

export const LEAD_STAGES = ["new", "contacted", "viewing", "reserved", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = ["unit_page", "picker", "contact", "compare"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CONTACT_METHODS = ["whatsapp", "phone", "email"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export interface LeadNote {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

export interface Lead {
  id: string;
  createdAt: number;
  name: string;
  phone: string;
  email: string;
  locale: string;
  message: string;
  source: LeadSource;
  preferredContact: ContactMethod;
  stage: LeadStage;
  assignedTo: string | null;
  unitCodes: string[];
  notes: LeadNote[];
}

export interface StatusEvent {
  id: string;
  code: string;
  from: UnitStatus;
  to: UnitStatus;
  actor: string;
  leadId: string | null;
  note: string;
  at: number;
}

export interface PriceChange {
  id: string;
  code: string;
  oldPrice: number;
  newPrice: number;
  actor: string;
  reason: string;
  at: number;
}

export interface Actor {
  name: string;
  role: Role;
}
