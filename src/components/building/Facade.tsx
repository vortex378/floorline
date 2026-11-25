"use client";

import type { KeyboardEvent } from "react";
import { ALL_FLOORS, PENTHOUSE_FLOOR } from "@/domain/layouts";

/** Elevation drawing of the building. Each level is a selectable band. */
export const FACADE = {
  w: 420,
  h: 640,
  left: 40,
  right: 380,
  groundTop: 560,
  groundBottom: 616,
  floorH: 42,
  phLeft: 84,
  phRight: 336,
} as const;

export function floorBand(floor: number) {
  if (floor === 0) return { x: FACADE.left, y: FACADE.groundTop, w: FACADE.right - FACADE.left, h: FACADE.groundBottom - FACADE.groundTop };
  if (floor === PENTHOUSE_FLOOR) {
    const top = FACADE.groundTop - 10 * FACADE.floorH - 52;
    return { x: FACADE.phLeft, y: top, w: FACADE.phRight - FACADE.phLeft, h: 52 };
  }
  const y = FACADE.groundTop - floor * FACADE.floorH;
  return { x: FACADE.left, y, w: FACADE.right - FACADE.left, h: FACADE.floorH };
}

interface FacadeProps {
  className?: string;
  interactive?: boolean;
  activeFloor?: number | null;
  onSelectFloor?: (floor: number) => void;
  floorLabel?: (floor: number) => string;
  counts?: Map<number, { available: number; total: number; matching: number }>;
  /** Hide the per-floor availability markers (hero). */
  decorative?: boolean;
}

const BRONZE = "#7d5f43";
const STONE = "#e6ddcc";
const GLASS = "#c9d0cd";

function Bays({ y, h, bays, x0, x1 }: { y: number; h: number; bays: number; x0: number; x1: number }) {
  const bw = (x1 - x0) / bays;
  return (
    <>
      {Array.from({ length: bays }, (_, i) => {
        const bx = x0 + i * bw;
        const loggia = i % 3 === 1;
        return (
          <g key={i} className="fac-bay">
            <rect x={bx + 4} y={y + 5} width={bw - 8} height={h - 12} fill={loggia ? "#b9c0bc" : GLASS} className="fac-glass" />
            <line x1={bx + bw / 2} x2={bx + bw / 2} y1={y + 5} y2={y + h - 7} stroke={BRONZE} strokeWidth={1.2} className="fac-line" />
            <line x1={bx + 4} x2={bx + bw - 4} y1={y + h - 14} y2={y + h - 14} stroke={BRONZE} strokeWidth={1} opacity={0.8} className="fac-line" />
            {Array.from({ length: 5 }, (_, k) => (
              <line key={k} x1={bx + 6 + k * ((bw - 12) / 4)} x2={bx + 6 + k * ((bw - 12) / 4)} y1={y + h - 14} y2={y + h - 7} stroke={BRONZE} strokeWidth={0.8} opacity={0.7} />
            ))}
          </g>
        );
      })}
    </>
  );
}

export function Facade({ className, interactive = false, activeFloor, onSelectFloor, floorLabel, counts, decorative }: FacadeProps) {
  const onKey = (e: KeyboardEvent<SVGGElement>, floor: number) => {
    const order = [...ALL_FLOORS];
    const idx = order.indexOf(floor as (typeof ALL_FLOORS)[number]);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectFloor?.(floor);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = order[Math.min(order.length - 1, Math.max(0, idx + (e.key === "ArrowUp" ? 1 : -1)))];
      onSelectFloor?.(next);
      const el = (e.currentTarget.ownerSVGElement ?? e.currentTarget).querySelector<SVGGElement>(`[data-floor="${next}"]`);
      el?.focus();
    }
  };

  const ph = floorBand(PENTHOUSE_FLOOR);

  return (
    <svg viewBox={`0 0 ${FACADE.w} ${FACADE.h}`} className={className} role={interactive ? "group" : "img"} aria-label="Vela Residence">
      {/* ground line + landscaping */}
      <line x1={0} x2={FACADE.w} y1={FACADE.groundBottom} y2={FACADE.groundBottom} stroke="var(--color-ink)" strokeWidth={1.5} className="fac-ground" />
      {[18, 398].map((x) => (
        <g key={x} className="fac-tree" opacity={0.85}>
          <line x1={x} x2={x} y1={FACADE.groundBottom} y2={FACADE.groundBottom - 34} stroke="var(--color-olive)" strokeWidth={1.5} />
          <circle cx={x} cy={FACADE.groundBottom - 44} r={14} fill="var(--color-olive)" opacity={0.35} />
        </g>
      ))}

      {/* body */}
      <rect x={FACADE.left} y={ph.y + ph.h} width={FACADE.right - FACADE.left} height={FACADE.groundBottom - ph.y - ph.h} fill={STONE} className="fac-body" />

      {/* residential floors */}
      {Array.from({ length: 10 }, (_, i) => {
        const f = i + 1;
        const b = floorBand(f);
        return (
          <g key={f} className="fac-floor" data-level={f}>
            <Bays y={b.y} h={b.h} bays={6} x0={b.x + 8} x1={b.x + b.w - 8} />
            <line x1={b.x - 6} x2={b.x + b.w + 6} y1={b.y + b.h} y2={b.y + b.h} stroke="var(--color-ink)" strokeWidth={2.2} className="fac-slab" />
          </g>
        );
      })}

      {/* ground floor: shopfronts + entrance */}
      <g className="fac-floor" data-level={0}>
        <rect x={FACADE.left + 10} y={FACADE.groundTop + 10} width={130} height={46} fill={GLASS} className="fac-glass" />
        <rect x={FACADE.left + 190} y={FACADE.groundTop + 10} width={140} height={46} fill={GLASS} className="fac-glass" />
        <rect x={FACADE.left + 148} y={FACADE.groundTop + 14} width={36} height={42} fill={BRONZE} className="fac-door" />
        <line x1={FACADE.left + 140} x2={FACADE.left + 192} y1={FACADE.groundTop + 10} y2={FACADE.groundTop + 10} stroke="var(--color-ink)" strokeWidth={3} />
      </g>

      {/* penthouse + roof */}
      <g className="fac-floor" data-level={PENTHOUSE_FLOOR}>
        <rect x={ph.x} y={ph.y} width={ph.w} height={ph.h} fill={STONE} />
        <Bays y={ph.y + 4} h={ph.h - 4} bays={4} x0={ph.x + 8} x1={ph.x + ph.w - 8} />
        <line x1={ph.x - 10} x2={ph.x + ph.w + 10} y1={ph.y} y2={ph.y} stroke="var(--color-ink)" strokeWidth={3} className="fac-slab" />
        {/* terrace railings */}
        {[FACADE.left, ph.x + ph.w].map((x) => (
          <rect key={x} x={x} y={ph.y + ph.h - 12} width={ph.x - FACADE.left} height={12} fill="none" stroke={BRONZE} strokeWidth={1} className="fac-line" />
        ))}
        <circle cx={FACADE.left + 22} cy={ph.y + ph.h - 20} r={9} fill="var(--color-olive)" opacity={0.4} />
        <circle cx={FACADE.right - 22} cy={ph.y + ph.h - 20} r={9} fill="var(--color-olive)" opacity={0.4} />
      </g>

      {/* outline */}
      <path
        d={`M${FACADE.left} ${FACADE.groundBottom} V${ph.y + ph.h} H${ph.x} V${ph.y} H${ph.x + ph.w} V${ph.y + ph.h} H${FACADE.right} V${FACADE.groundBottom}`}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2.5}
        className="fac-outline"
      />

      {/* interactive bands */}
      {interactive &&
        ALL_FLOORS.map((f) => {
          const b = floorBand(f);
          const c = counts?.get(f);
          const active = activeFloor === f;
          return (
            <g
              key={`hit-${f}`}
              className="facade-floor"
              data-floor={f}
              data-testid={`floor-${f}`}
              data-active={active ? "true" : "false"}
              role="button"
              tabIndex={active || (activeFloor == null && f === 1) ? 0 : -1}
              aria-pressed={active}
              aria-label={`${floorLabel?.(f) ?? f}${c ? ` — ${c.available}/${c.total}` : ""}`}
              onClick={() => onSelectFloor?.(f)}
              onKeyDown={(e) => onKey(e, f)}
            >
              <rect className="floor-hit" x={FACADE.left - 6} y={b.y} width={FACADE.right - FACADE.left + 12} height={b.h} />
              {active && <rect x={FACADE.left - 6} y={b.y} width={4} height={b.h} fill="var(--color-accent)" />}
              {!decorative && c && (
                <g transform={`translate(${FACADE.right + 12} ${b.y + b.h / 2})`} pointerEvents="none">
                  <text fontSize={11} dominantBaseline="middle" className="num" fill={c.matching > 0 ? "var(--color-ink)" : "var(--color-muted)"} fontWeight={active ? 700 : 500}>
                    {c.available}/{c.total}
                  </text>
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
}
