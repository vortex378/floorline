"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Link2, MessageCircle, Printer } from "lucide-react";
import { PENTHOUSE_FLOOR } from "@/domain/layouts";
import { pricePerM2 } from "@/domain/pricing";
import type { Orientation } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { useHydrated, useRemoteChanges, useUnits } from "@/lib/store/hooks";
import { FloorPlan } from "@/components/building/FloorPlan";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Reveal } from "@/components/motion/Reveal";
import { CompareButton, FavoriteButton, RequestButton } from "./UnitActions";

const ANGLE: Record<Orientation, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

function Compass({ dir, label }: { dir: Orientation; label: string }) {
  return (
    <svg viewBox="-30 -30 60 60" className="h-16 w-16" role="img" aria-label={label}>
      <circle r="26" fill="none" stroke="var(--color-line)" />
      {(["N", "E", "S", "W"] as const).map((d) => {
        const a = (ANGLE[d] * Math.PI) / 180;
        return (
          <text key={d} x={Math.sin(a) * 19} y={-Math.cos(a) * 19 + 3} fontSize="7" textAnchor="middle" fill="var(--color-muted)">
            {d}
          </text>
        );
      })}
      <g transform={`rotate(${ANGLE[dir]})`}>
        <path d="M0 -14 L5 4 L0 1 L-5 4 Z" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}

export function UnitDetail({ code }: { code: string }) {
  const { t, fmt, locale } = useI18n();
  const units = useUnits();
  const pulsing = useRemoteChanges();
  const hydrated = useHydrated();
  const [copied, setCopied] = useState(false);
  const unit = units.find((u) => u.code === code)!;

  const similar = useMemo(
    () =>
      units
        .filter((u) => u.code !== code && u.type === unit.type && u.status === "available")
        .sort((a, b) => Math.abs(a.floor - unit.floor) - Math.abs(b.floor - unit.floor))
        .slice(0, 3),
    [units, code, unit.type, unit.floor],
  );

  const floorName =
    unit.floor === 0 ? t("floors.ground") : unit.floor === PENTHOUSE_FLOOR ? t("floors.penthouse") : t("floors.floor", { n: unit.floor });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing else to do.
    }
  };

  const whatsappHref = () => {
    if (!hydrated) return "https://wa.me/";
    const url = window.location.href;
    return `https://wa.me/?text=${encodeURIComponent(t("unit.whatsappText", { code: unit.code, type: t(`types.${unit.type}`), url }))}`;
  };

  const facts: Array<[string, string]> = [
    [t("unit.type"), t(`typesLong.${unit.type}`)],
    [t("unit.floor"), floorName],
    [t("unit.areaNet"), fmt.area(unit.areaNet)],
    [t("unit.areaGross"), fmt.area(unit.areaGross)],
    [t("unit.terrace"), fmt.area(unit.terrace)],
    ...(unit.type !== "commercial" ? ([[t("unit.bedrooms"), String(unit.bedrooms)]] as Array<[string, string]>) : []),
    [t("unit.bathrooms"), String(unit.bathrooms)],
    [t("unit.orientation"), t(`orientation.${unit.orientation}`)],
  ];

  return (
    <div className="container-x pb-20 pt-24 lg:pt-28">
      <Link href={`/${locale}/units?floor=${unit.floor}`} className="no-print inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> {t("unit.back")}
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("unit.eyebrow", { code: unit.code })}</p>
          <h1 className="mt-2 text-4xl sm:text-6xl">{t(`typesLong.${unit.type}`)}</h1>
        </div>
        <div className="flex items-center gap-3" aria-live="polite">
          {pulsing.has(unit.code) && <span className="text-xs text-accent">{t("unit.updated")}</span>}
          <StatusBadge status={unit.status} className="text-sm" />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-label={t("unit.planTitle", { code: unit.code })} className="card relative p-4 sm:p-8">
          <FloorPlan floor={unit.floor} units={units} focusCode={unit.code} interactive={false} className="h-auto max-h-[560px] w-full" title={t("unit.planTitle", { code: unit.code })} />
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div className="w-40 sm:w-56">
              <p className="eyebrow mb-2">{floorName}</p>
              <FloorPlan floor={unit.floor} units={units} selectedCode={unit.code} interactive={false} className="h-auto w-full" />
            </div>
            <div className="flex items-center gap-3 text-sm text-ink-2">
              <Compass dir={unit.orientation} label={t("unit.compass", { dir: t(`orientation.${unit.orientation}`) })} />
            </div>
          </div>
        </section>

        <div className="grid content-start gap-6">
          <section className="card p-6 sm:p-8">
            {unit.priceVisible ? (
              <>
                <p className="num font-display text-4xl sm:text-5xl" data-testid="unit-price">{fmt.price(unit.price)}</p>
                <p className="num mt-1 text-sm text-muted">{t("unit.pricePerM2", { price: fmt.price(pricePerM2(unit.price, unit.areaGross)) })}</p>
              </>
            ) : (
              <p className="font-display text-3xl">{t("unit.onRequest")}</p>
            )}

            {unit.status !== "available" && (
              <p className="mt-4 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-2">
                {t("unit.notAvailable", { status: t(`status.${unit.status}`).toLowerCase() })}
              </p>
            )}

            <div className="no-print mt-6 grid gap-2">
              <RequestButton
                codes={[unit.code]}
                source="unit_page"
                label={unit.status === "available" ? t("unit.request") : t("unit.request")}
                className="btn btn-accent w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <FavoriteButton code={unit.code} className="w-full" />
                <CompareButton code={unit.code} className="w-full" />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
                <a href={whatsappHref()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                  <MessageCircle size={15} aria-hidden="true" /> {t("unit.whatsapp")}
                </a>
                <button type="button" onClick={share} className="inline-flex items-center gap-1.5 hover:text-ink">
                  {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                  <span aria-live="polite">{copied ? t("unit.copied") : t("unit.copyLink")}</span>
                </button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 hover:text-ink">
                  <Printer size={15} aria-hidden="true" /> {t("unit.print")}
                </button>
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="text-xl">{t("unit.facts")}</h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <section className="no-print mt-16" aria-labelledby="similar">
        <h2 id="similar" className="text-3xl">{t("unit.similar")}</h2>
        {similar.length === 0 ? (
          <p className="mt-4 text-muted">{t("unit.noSimilar")}</p>
        ) : (
          <Reveal className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
            {similar.map((u) => (
              <Link key={u.code} href={`/${locale}/units/${u.code}`} className="card group block p-5 transition-colors hover:border-ink">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{u.code}</span>
                  <StatusBadge status={u.status} />
                </div>
                <FloorPlan floor={u.floor} units={units} focusCode={u.code} interactive={false} className="my-3 h-36 w-full" />
                <div className="flex items-center justify-between text-sm">
                  <span className="num text-muted">
                    {fmt.area(u.areaNet)} · {t("floors.floor", { n: u.floor })}
                  </span>
                  <span className="num font-medium">{u.priceVisible ? fmt.price(u.price) : t("unit.onRequest")}</span>
                </div>
              </Link>
            ))}
          </Reveal>
        )}
      </section>
    </div>
  );
}
