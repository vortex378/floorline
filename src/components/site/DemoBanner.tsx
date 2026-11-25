"use client";

import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="no-print border-t border-line bg-paper-3/60">
      <p className="container-x flex items-center gap-2 py-3 text-xs text-ink-2">
        <Info size={14} aria-hidden="true" />
        {t("demo.banner")}
      </p>
    </div>
  );
}
