"use client";

import { useState } from "react";
import clsx from "clsx";
import { Heart, Scale } from "lucide-react";
import type { LeadSource } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { usePrefs, useHydrated } from "@/lib/store/hooks";
import { MAX_COMPARE, toggleIn, updatePrefs } from "@/lib/store/prefs";
import { Sheet } from "@/components/ui/Sheet";
import { LeadForm } from "./LeadForm";

export function FavoriteButton({ code, className }: { code: string; className?: string }) {
  const { t } = useI18n();
  const prefs = usePrefs();
  const hydrated = useHydrated();
  const active = hydrated && prefs.favorites.includes(code);
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx("btn btn-ghost btn-sm", className)}
      onClick={() => updatePrefs((p) => ({ ...p, favorites: toggleIn(p.favorites, code) }))}
    >
      <Heart size={15} className={active ? "fill-accent text-accent" : ""} aria-hidden="true" />
      {active ? t("unit.saved") : t("unit.save")}
    </button>
  );
}

export function CompareButton({ code, className }: { code: string; className?: string }) {
  const { t } = useI18n();
  const prefs = usePrefs();
  const hydrated = useHydrated();
  const active = hydrated && prefs.compare.includes(code);
  const full = hydrated && !active && prefs.compare.length >= MAX_COMPARE;
  return (
    <button
      type="button"
      aria-pressed={active}
      title={full ? t("compare.max") : undefined}
      disabled={full}
      className={clsx("btn btn-ghost btn-sm", className)}
      onClick={() => updatePrefs((p) => ({ ...p, compare: toggleIn(p.compare, code, MAX_COMPARE) }))}
    >
      <Scale size={15} className={active ? "text-accent" : ""} aria-hidden="true" />
      {active ? t("unit.comparing") : t("unit.compare")}
    </button>
  );
}

export function RequestButton({
  codes,
  source,
  label,
  className = "btn btn-accent",
}: {
  codes: string[];
  source: LeadSource;
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} data-testid="request-button">
        {label ?? t("unit.request")}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("lead.title")} description={t("lead.subtitle")} side="center" wide>
        <LeadForm unitCodes={codes} source={source} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
