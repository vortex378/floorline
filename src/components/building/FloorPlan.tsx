"use client";

import { useId, type KeyboardEvent } from "react";
import { CORE, FOOTPRINT, PENTHOUSE_FLOOR, PLAN_H, PLAN_W, commonAreas } from "@/domain/layouts";
import type { Point, Unit } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { STATUS_FILL, STATUS_INK, STATUS_PATTERN, StatusPatterns } from "./status";

const pointsAttr = (shape: readonly Point[]) => shape.map(([x, y]) => `${x},${y}`).join(" ");

export function centroid(shape: readonly Point[]): Point {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export function bbox(shape: readonly Point[]) {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

interface FloorPlanProps {
  floor: number;
  units: Unit[];
  selectedCode?: string | null;
  /** Codes that match the active filters. Others are dimmed. */
  matching?: ReadonlySet<string> | null;
  pulsing?: ReadonlySet<string>;
  onSelect?: (code: string) => void;
  /** Zoom the drawing to one unit (unit page). */
  focusCode?: string;
  interactive?: boolean;
  className?: string;
  title?: string;
}

export function FloorPlan({
  floor,
  units,
  selectedCode,
  matching,
  pulsing,
  onSelect,
  focusCode,
  interactive = true,
  className,
  title,
}: FloorPlanProps) {
  const { t, fmt } = useI18n();
  const uid = useId().replace(/:/g, "");
  const floorUnits = units.filter((u) => u.floor === floor);
  const focus = focusCode ? floorUnits.find((u) => u.code === focusCode) : undefined;

  const viewBox = focus
    ? (() => {
        const b = bbox(focus.shape);
        const pad = 70;
        return `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
      })()
    : `0 0 ${PLAN_W} ${PLAN_H}`;

  const onKey = (e: KeyboardEvent, code: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(code);
    }
  };

  const fillUrl = (u: Unit) => {
    const pat = STATUS_PATTERN[u.status];
    return pat ? `url(#${uid}${pat.slice(5)}` : null;
  };

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="group"
      aria-label={title ?? t("floors.floor", { n: floor })}
      preserveAspectRatio="xMidYMid meet"
    >
      <StatusPatterns idPrefix={uid} />

      {/* Balconies and terraces outside the footprint */}
      {floorUnits.map(
        (u) =>
          u.balcony && (
            <rect
              key={`b-${u.code}`}
              x={u.balcony.x}
              y={u.balcony.y}
              width={u.balcony.w}
              height={u.balcony.h}
              fill="none"
              stroke="var(--color-ink-2)"
              strokeWidth={1.2}
              strokeDasharray="5 4"
              opacity={0.6}
            />
          ),
      )}

      {/* Common areas */}
      {commonAreas(floor).map((r, i) => (
        <g key={`c-${i}`}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--color-paper-2)" />
          <text x={r.x + r.w / 2} y={r.y + 24} textAnchor="middle" className="plan-label">
            {t(`rooms.${r.label}`)}
          </text>
        </g>
      ))}

      {/* Units */}
      {floorUnits.map((u) => {
        const [cx, cy] = centroid(u.shape);
        const isFocus = focus?.code === u.code;
        const dim = (matching && !matching.has(u.code)) || (focus && !isFocus);
        const label = t("picker.unitLabel", {
          code: u.code,
          type: t(`types.${u.type}`),
          area: fmt.area(u.areaNet),
          status: t(`status.${u.status}`),
        });
        const pattern = fillUrl(u);
        return (
          <g
            key={u.code}
            className="plan-unit"
            data-dim={dim ? "true" : "false"}
            data-selected={selectedCode === u.code || isFocus ? "true" : "false"}
            data-pulse={pulsing?.has(u.code) ? "true" : "false"}
            data-testid={`unit-${u.code}`}
            {...(interactive && !focus
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": label,
                  "aria-pressed": selectedCode === u.code,
                  onClick: () => onSelect?.(u.code),
                  onKeyDown: (e: KeyboardEvent) => onKey(e, u.code),
                }
              : { "aria-hidden": !isFocus || undefined })}
          >
            <polygon className="unit-fill" points={pointsAttr(u.shape)} fill={STATUS_FILL[u.status]} fillOpacity={0.85} />
            {pattern && <polygon points={pointsAttr(u.shape)} fill={pattern} pointerEvents="none" />}
            {u.rooms.map((r, i) => (
              <g key={i} pointerEvents="none">
                <rect x={r.x} y={r.y} width={r.w} height={r.h} className="plan-room" strokeDasharray={r.label === "terrace" ? "4 4" : undefined} />
                {r.w > 70 && r.h > 50 && (
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} textAnchor="middle" className="plan-label" opacity={0.75}>
                    {t(`rooms.${r.label}`)}
                  </text>
                )}
              </g>
            ))}
            <polygon className="unit-outline" points={pointsAttr(u.shape)} fill="none" stroke={STATUS_INK[u.status]} strokeWidth={1.5} />
            <g pointerEvents="none" transform={`translate(${cx} ${cy})`}>
              <rect x={-38} y={-22} width={76} height={40} rx={8} fill="var(--color-paper)" opacity={0.92} stroke={STATUS_INK[u.status]} strokeWidth={1} />
              <text y={-4} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--color-ink)" className="num">
                {u.letter}
              </text>
              <text y={11} textAnchor="middle" fontSize={10} fill={STATUS_INK[u.status]} letterSpacing="0.04em">
                {t(`types.${u.type}`)}
              </text>
            </g>
          </g>
        );
      })}

      {/* Core: lifts + stairs */}
      {floor !== 0 && (
        <g pointerEvents="none">
          <rect x={CORE.x} y={CORE.y} width={CORE.w} height={CORE.h} fill="var(--color-paper-3)" stroke="var(--color-ink)" strokeWidth={2} />
          <path d={`M${CORE.x} ${CORE.y}L${CORE.x + 40} ${CORE.y + CORE.h}M${CORE.x + 40} ${CORE.y}L${CORE.x} ${CORE.y + CORE.h}`} stroke="var(--color-ink-2)" strokeWidth={1} />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={CORE.x + 48} x2={CORE.x + CORE.w} y1={CORE.y + 8 + i * 10} y2={CORE.y + 8 + i * 10} stroke="var(--color-ink-2)" strokeWidth={1} />
          ))}
        </g>
      )}

      {/* Outer walls */}
      <rect x={FOOTPRINT.x} y={FOOTPRINT.y} width={FOOTPRINT.w} height={FOOTPRINT.h} className="plan-wall" pointerEvents="none" />
      {floor !== 0 && floor !== PENTHOUSE_FLOOR && (
        <g pointerEvents="none" stroke="var(--color-ink)" strokeWidth={3}>
          <line x1={FOOTPRINT.x} x2={FOOTPRINT.x + FOOTPRINT.w} y1={240} y2={240} />
          <line x1={FOOTPRINT.x} x2={FOOTPRINT.x + FOOTPRINT.w} y1={320} y2={320} />
        </g>
      )}

      {/* North arrow + scale */}
      {!focus && (
        <g transform={`translate(${PLAN_W - 28} ${PLAN_H - 40})`} pointerEvents="none" aria-hidden="true">
          <circle r={13} fill="none" stroke="var(--color-ink-2)" strokeWidth={1} />
          <path d="M0 -10 L5 6 L0 2 L-5 6 Z" fill="var(--color-ink)" />
          <text y={-17} textAnchor="middle" fontSize={10} fill="var(--color-ink-2)">
            {t("picker.north")}
          </text>
        </g>
      )}
    </svg>
  );
}
