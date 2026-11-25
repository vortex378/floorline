import type { UnitStatus } from "@/domain/types";

export const STATUS_FILL: Record<UnitStatus, string> = {
  available: "var(--color-st-available-bg)",
  reserved: "var(--color-st-reserved-bg)",
  sold: "var(--color-st-sold-bg)",
  unavailable: "var(--color-st-unavailable-bg)",
};

export const STATUS_INK: Record<UnitStatus, string> = {
  available: "var(--color-st-available)",
  reserved: "var(--color-st-reserved)",
  sold: "var(--color-st-sold)",
  unavailable: "var(--color-st-unavailable)",
};

/** Status is never shown by color alone: each one also has a pattern. */
export const STATUS_PATTERN: Record<UnitStatus, string | null> = {
  available: null,
  reserved: "url(#pat-reserved)",
  sold: "url(#pat-sold)",
  unavailable: "url(#pat-unavailable)",
};

export function StatusPatterns({ idPrefix = "" }: { idPrefix?: string }) {
  return (
    <defs>
      <pattern id={`${idPrefix}pat-reserved`} width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1.4" fill="var(--color-st-reserved)" opacity="0.55" />
      </pattern>
      <pattern id={`${idPrefix}pat-sold`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="9" stroke="var(--color-st-sold)" strokeWidth="1.6" opacity="0.45" />
      </pattern>
      <pattern id={`${idPrefix}pat-unavailable`} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 0L10 10M10 0L0 10" stroke="var(--color-st-unavailable)" strokeWidth="0.8" opacity="0.5" />
      </pattern>
    </defs>
  );
}

export function StatusSwatch({ status, size = 14 }: { status: UnitStatus; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <StatusPatterns idPrefix={`sw-${status}-`} />
      <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill={STATUS_FILL[status]} stroke={STATUS_INK[status]} />
      {STATUS_PATTERN[status] && (
        <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill={`url(#sw-${status}-${STATUS_PATTERN[status]!.slice(5)}`} />
      )}
    </svg>
  );
}
