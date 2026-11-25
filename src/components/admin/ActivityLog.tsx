"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { can } from "@/domain/rules";
import { useI18n } from "@/lib/i18n/client";
import { useSandbox } from "@/lib/store/hooks";
import { useAdmin } from "./AdminShell";

type Kind = "all" | "status" | "price";

export function ActivityLog() {
  const { t, fmt, locale } = useI18n();
  const { actor } = useAdmin();
  const state = useSandbox();
  const [kind, setKind] = useState<Kind>("all");
  const full = can(actor.role, "audit.view");

  const entries = useMemo(() => {
    const status = state.history.map((e) => ({
      id: e.id,
      at: e.at,
      kind: "status" as const,
      code: e.code,
      actor: e.actor,
      text: t("admin.unitDrawer.statusChange", { from: t(`status.${e.from}`), to: t(`status.${e.to}`) }),
      note: e.note,
    }));
    const price = full
      ? state.priceChanges.map((p) => ({
          id: p.id,
          at: p.at,
          kind: "price" as const,
          code: p.code,
          actor: p.actor,
          text: t("admin.unitDrawer.priceChange", { old: fmt.price(p.oldPrice), new: fmt.price(p.newPrice) }),
          note: p.reason,
        }))
      : [];
    return [...status, ...price]
      .filter((e) => kind === "all" || e.kind === kind)
      .sort((a, b) => b.at - a.at)
      .slice(0, 200);
  }, [state.history, state.priceChanges, kind, full, t, fmt]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{t("admin.activity.title")}</h1>
        <div className="inline-flex rounded-full border border-line p-1" role="group">
          {(["all", "status", "price"] as const).map((k) => (
            <button key={k} type="button" className="chip border-0" aria-pressed={kind === k} onClick={() => setKind(k)} disabled={k === "price" && !full}>
              {t(`admin.activity.${k}`)}
            </button>
          ))}
        </div>
      </div>
      {!full && <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">{t("admin.activity.managerOnly")}</p>}
      <ol className="divide-y divide-line rounded-2xl border border-line bg-paper">
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[150px_80px_1fr_auto] sm:items-center sm:gap-4">
            <time className="num text-xs text-muted" dateTime={new Date(e.at).toISOString()}>{fmt.dateTime(e.at)}</time>
            <Link href={`/${locale}/admin/units?unit=${e.code}`} className="font-medium hover:underline">{e.code}</Link>
            <span>
              {e.text}
              {e.note && <span className="text-muted"> · {e.note}</span>}
            </span>
            <span className="text-xs text-muted">{e.actor}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
