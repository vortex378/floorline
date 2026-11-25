"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { pricePerM2 } from "@/domain/pricing";
import { useI18n } from "@/lib/i18n/client";
import { useHydrated, usePrefs, useUnits } from "@/lib/store/hooks";
import { updatePrefs } from "@/lib/store/prefs";
import { FloorPlan } from "@/components/building/FloorPlan";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RequestButton } from "./UnitActions";

export function ComparePage() {
  const { t, fmt, locale } = useI18n();
  const units = useUnits();
  const prefs = usePrefs();
  const hydrated = useHydrated();
  const selected = hydrated ? prefs.compare.map((c) => units.find((u) => u.code === c)).filter((u) => u !== undefined) : [];

  const rows: Array<[string, (u: (typeof selected)[number]) => string]> = [
    [t("compare.price"), (u) => (u.priceVisible ? fmt.price(u.price) : t("unit.onRequest"))],
    ["€ / m²", (u) => (u.priceVisible ? fmt.price(pricePerM2(u.price, u.areaGross)) : "—")],
    [t("unit.type"), (u) => t(`typesLong.${u.type}`)],
    [t("unit.floor"), (u) => String(u.floor)],
    [t("unit.areaNet"), (u) => fmt.area(u.areaNet)],
    [t("unit.terrace"), (u) => fmt.area(u.terrace)],
    [t("unit.bedrooms"), (u) => String(u.bedrooms)],
    [t("unit.bathrooms"), (u) => String(u.bathrooms)],
    [t("unit.orientation"), (u) => t(`orientation.${u.orientation}`)],
  ];

  return (
    <div className="container-x pb-20 pt-24 lg:pt-28">
      <p className="eyebrow">{t("compare.eyebrow")}</p>
      <h1 className="mt-2 text-4xl sm:text-6xl">{t("compare.title")}</h1>

      {selected.length === 0 ? (
        <div className="card mt-10 p-10 text-center">
          <p className="text-ink-2">{t("compare.empty")}</p>
          <Link href={`/${locale}/units`} className="btn btn-primary mt-6">
            {t("compare.browse")}
          </Link>
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[640px] table-fixed text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-40" />
                {selected.map((u) => (
                  <th key={u.code} scope="col" className="px-3 pb-4 text-left align-top font-normal">
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <Link href={`/${locale}/units/${u.code}`} className="font-display text-2xl hover:underline">
                          {u.code}
                        </Link>
                        <button
                          type="button"
                          className="rounded-full p-1.5 text-muted hover:bg-paper-2 hover:text-ink"
                          aria-label={`${t("compare.remove")} ${u.code}`}
                          onClick={() => updatePrefs((p) => ({ ...p, compare: p.compare.filter((c) => c !== u.code) }))}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <StatusBadge status={u.status} className="mt-2" />
                      <FloorPlan floor={u.floor} units={units} focusCode={u.code} interactive={false} className="mt-3 h-36 w-full" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="py-3 pr-3 text-left font-normal text-muted">{label}</th>
                  {selected.map((u) => (
                    <td key={u.code} className="num px-3 py-3 font-medium">{get(u)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                <td colSpan={selected.length} className="px-3 pt-6">
                  <RequestButton codes={selected.map((u) => u.code)} source="compare" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
