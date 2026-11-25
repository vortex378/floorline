import type { Orientation, Point, Room, UnitSpec, UnitType } from "./types";

/**
 * Floor plan geometry. Everything is drawn in a 1000 × 560 viewBox.
 * The same polygons are used for the drawing and for the click targets,
 * so the plan and the hit areas can never drift apart.
 */
export const PLAN_W = 1000;
export const PLAN_H = 560;
export const FOOTPRINT = { x: 40, y: 40, w: 920, h: 480 } as const;
export const CORE = { x: 455, y: 245, w: 90, h: 70 } as const;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectShape = (r: Rect): Point[] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.h],
  [r.x, r.y + r.h],
];

type Side = "north" | "south";

/** Split a band into rooms by relative widths. */
function band(
  x: number,
  y: number,
  w: number,
  h: number,
  parts: Array<[Room["label"], number]>,
): Room[] {
  const total = parts.reduce((s, [, p]) => s + p, 0);
  let cursor = x;
  return parts.map(([label, p], i) => {
    const rw = i === parts.length - 1 ? x + w - cursor : Math.round((w * p) / total);
    const room: Room = { label, x: cursor, y, w: rw, h };
    cursor += rw;
    return room;
  });
}

const EXTERIOR_DEPTH = 120;

const ROOM_PROGRAM: Record<
  "1+1" | "2+1" | "3+1",
  { exterior: Array<[Room["label"], number]>; interior: Array<[Room["label"], number]> }
> = {
  "1+1": {
    exterior: [
      ["living", 14],
      ["bed", 10],
    ],
    interior: [
      ["kitchen", 12],
      ["bath", 7],
      ["storage", 5],
    ],
  },
  "2+1": {
    exterior: [
      ["bed", 10],
      ["living", 15],
      ["bed", 10],
    ],
    interior: [
      ["bath", 8],
      ["kitchen", 14],
      ["bath", 7],
      ["storage", 6],
    ],
  },
  "3+1": {
    exterior: [
      ["bed", 9.5],
      ["living", 14],
      ["bed", 9.5],
    ],
    interior: [
      ["bed", 11],
      ["bath", 7],
      ["kitchen", 9],
      ["bath", 6],
    ],
  },
};

function residentialRooms(type: "1+1" | "2+1" | "3+1", r: Rect, side: Side): Room[] {
  const program = ROOM_PROGRAM[type];
  const interiorDepth = r.h - EXTERIOR_DEPTH;
  if (side === "north") {
    return [
      ...band(r.x, r.y, r.w, EXTERIOR_DEPTH, program.exterior),
      ...band(r.x, r.y + EXTERIOR_DEPTH, r.w, interiorDepth, program.interior),
    ];
  }
  return [
    ...band(r.x, r.y, r.w, interiorDepth, program.interior),
    ...band(r.x, r.y + interiorDepth, r.w, EXTERIOR_DEPTH, program.exterior),
  ];
}

interface ResidentialSlot {
  letter: string;
  type: "1+1" | "2+1" | "3+1";
  rect: Rect;
  side: Side;
  orientation: Orientation;
  bedrooms: number;
  bathrooms: number;
  areaNet: number;
  areaGross: number;
  terrace: number;
}

/** Floors 1–10: six apartments around a central core. */
export const RESIDENTIAL_SLOTS: readonly ResidentialSlot[] = [
  { letter: "A", type: "3+1", rect: { x: 40, y: 40, w: 330, h: 200 }, side: "north", orientation: "NW", bedrooms: 3, bathrooms: 2, areaNet: 118, areaGross: 132, terrace: 12 },
  { letter: "B", type: "1+1", rect: { x: 370, y: 40, w: 240, h: 200 }, side: "north", orientation: "N", bedrooms: 1, bathrooms: 1, areaNet: 61, areaGross: 70, terrace: 6 },
  { letter: "C", type: "2+1", rect: { x: 610, y: 40, w: 350, h: 200 }, side: "north", orientation: "NE", bedrooms: 2, bathrooms: 2, areaNet: 92, areaGross: 104, terrace: 10 },
  { letter: "D", type: "2+1", rect: { x: 610, y: 320, w: 350, h: 200 }, side: "south", orientation: "SE", bedrooms: 2, bathrooms: 2, areaNet: 89, areaGross: 101, terrace: 9 },
  { letter: "E", type: "1+1", rect: { x: 370, y: 320, w: 240, h: 200 }, side: "south", orientation: "S", bedrooms: 1, bathrooms: 1, areaNet: 64, areaGross: 73, terrace: 7 },
  { letter: "F", type: "3+1", rect: { x: 40, y: 320, w: 330, h: 200 }, side: "south", orientation: "SW", bedrooms: 3, bathrooms: 2, areaNet: 124, areaGross: 139, terrace: 14 },
];

export const PENTHOUSE_FLOOR = 11;
export const TOP_FLOOR = PENTHOUSE_FLOOR;
export const RESIDENTIAL_FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const ALL_FLOORS = [0, ...RESIDENTIAL_FLOORS, PENTHOUSE_FLOOR] as const;

export const unitCode = (floor: number, letter: string) =>
  `${String(floor).padStart(2, "0")}-${letter}`;

function balconyFor(rect: Rect, side: Side) {
  return side === "north"
    ? { x: rect.x + 24, y: 18, w: rect.w - 48, h: 22 }
    : { x: rect.x + 24, y: 520, w: rect.w - 48, h: 22 };
}

function residentialFloor(floor: number): UnitSpec[] {
  return RESIDENTIAL_SLOTS.map((s) => ({
    code: unitCode(floor, s.letter),
    floor,
    letter: s.letter,
    type: s.type,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms,
    areaNet: s.areaNet,
    areaGross: s.areaGross,
    terrace: s.terrace,
    orientation: s.orientation,
    shape: rectShape(s.rect),
    rooms: residentialRooms(s.type, s.rect, s.side),
    balcony: balconyFor(s.rect, s.side),
  }));
}

const mirrorRoom = (r: Room): Room => ({ ...r, x: PLAN_W - r.x - r.w });
const mirrorPoint = ([x, y]: Point): Point => [PLAN_W - x, y];

function penthouseFloor(): UnitSpec[] {
  const ph1Rect: Rect = { x: 40, y: 40, w: 415, h: 480 };
  const ph1Rooms: Room[] = [
    { label: "terrace", x: 40, y: 40, w: 100, h: 480 },
    { label: "living", x: 140, y: 40, w: 200, h: 240 },
    { label: "kitchen", x: 340, y: 40, w: 115, h: 150 },
    { label: "storage", x: 340, y: 190, w: 115, h: 90 },
    { label: "bed", x: 140, y: 280, w: 120, h: 120 },
    { label: "bed", x: 140, y: 400, w: 120, h: 120 },
    { label: "bath", x: 260, y: 280, w: 120, h: 100 },
    { label: "bed", x: 260, y: 380, w: 120, h: 140 },
    { label: "bath", x: 380, y: 280, w: 75, h: 240 },
  ];
  const ph1: UnitSpec = {
    code: unitCode(PENTHOUSE_FLOOR, "PH1"),
    floor: PENTHOUSE_FLOOR,
    letter: "PH1",
    type: "penthouse",
    bedrooms: 3,
    bathrooms: 2,
    areaNet: 196,
    areaGross: 221,
    terrace: 88,
    orientation: "W",
    shape: rectShape(ph1Rect),
    rooms: ph1Rooms,
  };
  const ph2: UnitSpec = {
    ...ph1,
    code: unitCode(PENTHOUSE_FLOOR, "PH2"),
    letter: "PH2",
    areaNet: 192,
    areaGross: 216,
    terrace: 84,
    orientation: "E",
    shape: rectShape(ph1Rect).map(mirrorPoint).reverse(),
    rooms: ph1Rooms.map(mirrorRoom),
  };
  return [ph1, ph2];
}

function groundFloor(): UnitSpec[] {
  const c1: Rect = { x: 40, y: 40, w: 360, h: 480 };
  const c2: Rect = { x: 600, y: 40, w: 360, h: 240 };
  const c3: Rect = { x: 600, y: 280, w: 360, h: 240 };
  const shop = (
    letter: string,
    r: Rect,
    orientation: Orientation,
    areaNet: number,
    areaGross: number,
    rooms: Room[],
  ): UnitSpec => ({
    code: unitCode(0, letter),
    floor: 0,
    letter,
    type: "commercial",
    bedrooms: 0,
    bathrooms: 1,
    areaNet,
    areaGross,
    terrace: 0,
    orientation,
    shape: rectShape(r),
    rooms,
  });
  return [
    shop("C1", c1, "W", 172, 186, [
      { label: "shop", x: 40, y: 40, w: 360, h: 380 },
      { label: "storage", x: 40, y: 420, w: 220, h: 100 },
      { label: "bath", x: 260, y: 420, w: 140, h: 100 },
    ]),
    shop("C2", c2, "NE", 88, 96, [
      { label: "shop", x: 600, y: 40, w: 360, h: 170 },
      { label: "storage", x: 600, y: 210, w: 240, h: 70 },
      { label: "bath", x: 840, y: 210, w: 120, h: 70 },
    ]),
    shop("C3", c3, "SE", 91, 99, [
      { label: "storage", x: 600, y: 280, w: 240, h: 70 },
      { label: "bath", x: 840, y: 280, w: 120, h: 70 },
      { label: "shop", x: 600, y: 350, w: 360, h: 170 },
    ]),
  ];
}

export function buildFloorUnits(floor: number): UnitSpec[] {
  if (floor === 0) return groundFloor();
  if (floor === PENTHOUSE_FLOOR) return penthouseFloor();
  return residentialFloor(floor);
}

/** Non-unit areas drawn on the plan (lobby, core). */
export function commonAreas(floor: number): Room[] {
  if (floor === 0) {
    return [{ label: "lobby", x: 400, y: 40, w: 200, h: 480 }];
  }
  if (floor === PENTHOUSE_FLOOR) {
    return [{ label: "lobby", x: 455, y: 40, w: 90, h: 480 }];
  }
  return [];
}

export const isResidential = (type: UnitType) =>
  type === "1+1" || type === "2+1" || type === "3+1" || type === "penthouse";
