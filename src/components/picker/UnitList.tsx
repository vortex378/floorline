"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Unit } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { StatusBadge } from "@/components/ui/StatusBadge";

type SortKey = "code" | "floor" | "areaNet" | "price";

export function UnitList({ units, pulsing }: { units: Unit[]; pulsing: ReadonlySet<string> }) {
  const { t, fmt, locale } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "code", dir: 1 });

  const rows = useMemo(
    () =>
      [...units].sort((a, b) => {
        const av = sort.key === "code" ? a.code : sort.key === "price" ? (a.priceVisible ? a.price : Infinity) : a[sort.key];
        const bv = sort.key === "code" ? b.code : sort.key === "price" ? (b.priceVisible ? b.price : Infinity) : b[sort.key];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      }),
    [units, sort],
  );

  const th = (k: SortKey, label: string, className = "") => {
    const active = sort.key === k;
    return (
      <th key={k} scope="col" className={`px-3 py-3 font-medium ${className}`} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-ink"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
          aria-label={t("list.sortBy", { field: label })}
        >
          {label}
          {active && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </button>
      </th>
    );
  };

  if (rows.length === 0) return <p className="py-16 text-center text-muted">{t("list.empty")}</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line" data-lenis-prevent>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-paper-2/70 text-xs uppercase tracking-wider text-muted">
          <tr>
            {th("code", t("list.code"))}
            <th scope="col" className="px-3 py-3 font-medium">{t("list.type")}</th>
            {th("floor", t("list.floor"))}
            {th("areaNet", t("list.area"))}
            <th scope="col" className="px-3 py-3 font-medium">{t("list.orientation")}</th>
            {th("price", t("list.price"), "text-right")}
            <th scope="col" className="px-3 py-3 font-medium">{t("list.status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.code} className={`border-t border-line transition-colors hover:bg-paper-2/50 ${pulsing.has(u.code) ? "bg-accent/10" : ""}`}>
              <td className="px-3 py-3 font-medium">
                <Link href={`/${locale}/units/${u.code}`} className="underline-offset-4 hover:underline">
                  {u.code}
                </Link>
              </td>
              <td className="px-3 py-3">{t(`types.${u.type}`)}</td>
              <td className="num px-3 py-3">{u.floor}</td>
              <td className="num px-3 py-3">{fmt.area(u.areaNet)}</td>
              <td className="px-3 py-3">{u.orientation}</td>
              <td className="num px-3 py-3 text-right">{u.priceVisible ? fmt.price(u.price) : t("unit.onRequest")}</td>
              <td className="px-3 py-3">
                <StatusBadge status={u.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
