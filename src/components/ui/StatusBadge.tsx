"use client";

import type { UnitStatus } from "@/domain/types";
import { StatusSwatch } from "@/components/building/status";
import { useI18n } from "@/lib/i18n/client";

export function StatusBadge({ status, className = "" }: { status: UnitStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium ${className}`}
      data-status={status}
    >
      <StatusSwatch status={status} size={12} />
      {t(`status.${status}`)}
    </span>
  );
}

export function StatusLegend({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const statuses: UnitStatus[] = ["available", "reserved", "sold", "unavailable"];
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2 ${className}`} aria-label={t("common.legend")}>
      {statuses.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <StatusSwatch status={s} />
          {t(`status.${s}`)}
        </li>
      ))}
    </ul>
  );
}
