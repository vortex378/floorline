"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ALL_FLOORS, PENTHOUSE_FLOOR } from "@/domain/layouts";
import { LEAD_SOURCES, type UnitStatus } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { useSandbox, useUnits } from "@/lib/store/hooks";
import { STATUS_FILL, STATUS_INK } from "@/components/building/status";
import { StatusLegend } from "@/components/ui/StatusBadge";

const DAY = 86_400_000;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card bg-paper p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="num mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="num mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Dashboard() {
  const { t, fmt, locale } = useI18n();
  const state = useSandbox();
  const units = useUnits();
  const [now] = useState(() => Date.now());

  const kpi = useMemo(() => {
    const by = (s: UnitStatus) => units.filter((u) => u.status === s);
    const sold = by("sold");
    const reserved = by("reserved");
    const residential = units.length;
    const newLeads = state.leads.filter((l) => now - l.createdAt < 7 * DAY && !l.id.startsWith("spam")).length;
    const closed = state.leads.filter((l) => l.stage === "won" || l.stage === "lost");
    const won = closed.filter((l) => l.stage === "won").length;
    return {
      sold: sold.length,
      reserved: reserved.length,
      available: by("available").length,
      total: residential,
      soldValue: sold.reduce((s, u) => s + u.price, 0),
      reservedValue: reserved.reduce((s, u) => s + u.price, 0),
      newLeads,
      conversion: closed.length ? won / closed.length : 0,
    };
  }, [units, state.leads, now]);

  const months = useMemo(() => {
    const out: Array<{ key: string; ts: number; count: number; value: number }> = [];
    const d = new Date(now);
    for (let i = 13; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ key: `${m.getFullYear()}-${m.getMonth()}`, ts: m.getTime(), count: 0, value: 0 });
    }
    for (const e of state.history) {
      if (e.to !== "sold") continue;
      const m = new Date(e.at);
      const bucket = out.find((b) => b.key === `${m.getFullYear()}-${m.getMonth()}`);
      if (bucket) {
        bucket.count += 1;
        bucket.value += state.units[e.code]?.price ?? 0;
      }
    }
    return out;
  }, [state.history, state.units, now]);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  const sources = useMemo(
    () =>
      LEAD_SOURCES.map((s) => ({ source: s, count: state.leads.filter((l) => l.source === s && !l.id.startsWith("spam")).length })).sort(
        (a, b) => b.count - a.count,
      ),
    [state.leads],
  );
  const maxSource = Math.max(1, ...sources.map((s) => s.count));

  const recent = state.history.slice(0, 8);

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">{t("admin.nav.dashboard")}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("admin.kpi.sold")} value={String(kpi.sold)} hint={t("admin.kpi.ofUnits", { total: kpi.total })} />
        <Kpi label={t("admin.kpi.reserved")} value={String(kpi.reserved)} hint={t("admin.kpi.ofUnits", { total: kpi.total })} />
        <Kpi label={t("admin.kpi.soldValue")} value={fmt.priceCompact(kpi.soldValue)} hint={`${t("admin.kpi.reservedValue")}: ${fmt.priceCompact(kpi.reservedValue)}`} />
        <Kpi label={t("admin.kpi.newLeads")} value={String(kpi.newLeads)} hint={`${t("admin.kpi.conversion")}: ${fmt.percent(kpi.conversion)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card bg-paper p-6" aria-labelledby="sales-chart">
          <h2 id="sales-chart" className="text-xl">{t("admin.charts.salesByMonth")}</h2>
          <div className="mt-6 flex h-52 items-end gap-1.5" role="list">
            {months.map((m) => (
              <div key={m.key} role="listitem" className="group flex h-full flex-1 flex-col items-center justify-end gap-2" aria-label={`${fmt.month(m.ts)}: ${m.count}`}>
                <span className="num text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">{m.count}</span>
                <div
                  className="w-full rounded-t-md bg-ink transition-colors group-hover:bg-accent"
                  style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? 4 : 1 }}
                />
                <span className="text-[10px] text-muted">{fmt.month(m.ts)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card bg-paper p-6" aria-labelledby="sources-chart">
          <h2 id="sources-chart" className="text-xl">{t("admin.charts.leadsBySource")}</h2>
          <ul className="mt-6 grid gap-4">
            {sources.map((s) => (
              <li key={s.source}>
                <div className="flex justify-between text-sm">
                  <span>{t(`admin.sources.${s.source}`)}</span>
                  <span className="num text-muted">{s.count}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-paper-2">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card bg-paper p-6" aria-labelledby="inventory">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="inventory" className="text-xl">{t("admin.charts.inventory")}</h2>
            <StatusLegend />
          </div>
          <div className="mt-5 grid gap-1.5">
            {[...ALL_FLOORS].reverse().map((f) => {
              const row = units.filter((u) => u.floor === f);
              return (
                <div key={f} className="grid grid-cols-[40px_1fr] items-center gap-2">
                  <span className="num text-right text-xs text-muted">
                    {f === 0 ? t("floors.groundShort") : f === PENTHOUSE_FLOOR ? t("floors.phShort") : f}
                  </span>
                  <div className="flex gap-1.5">
                    {row.map((u) => (
                      <Link
                        key={u.code}
                        href={`/${locale}/admin/units?unit=${u.code}`}
                        className="num flex h-8 flex-1 items-center justify-center rounded-md border text-[11px] font-medium transition-transform hover:-translate-y-0.5"
                        style={{ background: STATUS_FILL[u.status], borderColor: STATUS_INK[u.status], color: STATUS_INK[u.status] }}
                        title={`${u.code} · ${t(`status.${u.status}`)}`}
                        aria-label={`${u.code}, ${t(`status.${u.status}`)}`}
                      >
                        {u.letter}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card bg-paper p-6" aria-labelledby="recent">
          <h2 id="recent" className="text-xl">{t("admin.recent")}</h2>
          <ol className="mt-4 divide-y divide-line">
            {recent.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p>
                    <Link href={`/${locale}/admin/units?unit=${e.code}`} className="font-medium hover:underline">{e.code}</Link>{" "}
                    <span className="text-ink-2">
                      {t("admin.unitDrawer.statusChange", { from: t(`status.${e.from}`), to: t(`status.${e.to}`) })}
                    </span>
                  </p>
                  <p className="text-xs text-muted">{t("admin.activity.by", { actor: e.actor })}{e.note ? ` · ${e.note}` : ""}</p>
                </div>
                <time className="num shrink-0 text-xs text-muted" dateTime={new Date(e.at).toISOString()}>
                  {fmt.relative(e.at, now)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
