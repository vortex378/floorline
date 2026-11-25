"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Car, Dumbbell, Leaf, Package, ShieldCheck, Sun, Check, MessageCircle } from "lucide-react";
import { PROJECT, UNITS } from "@/domain/catalog";
import { RESIDENTIAL_SLOTS, PENTHOUSE_FLOOR } from "@/domain/layouts";
import type { UnitType } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { useUnits } from "@/lib/store/hooks";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { Facade } from "@/components/building/Facade";
import { FloorPlan } from "@/components/building/FloorPlan";
import { LeadForm } from "@/components/unit/LeadForm";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Stats() {
  const { t, fmt } = useI18n();
  const units = useUnits();
  const sold = units.filter((u) => u.status === "sold").length / units.length;
  const items: Array<[string, string]> = [
    [String(UNITS.length), t("home.stats.homes")],
    [String(PROJECT.floors), t("home.stats.levels")],
    [fmt.percent(sold), t("home.stats.sold")],
    [PROJECT.deliveryQuarter, t("home.stats.handover")],
  ];
  return (
    <section id="stats" className="border-y border-line bg-paper-2/50" aria-label="Key figures">
      <Reveal as="dl" stagger={0.08} className="container-x grid grid-cols-2 divide-line py-10 md:grid-cols-4 md:divide-x">
        {items.map(([value, label]) => (
          <div key={label} className="px-2 py-3 md:px-8">
            <dt className="eyebrow">{label}</dt>
            <dd className="num mt-2 font-display text-4xl sm:text-5xl" data-testid={`stat-${label}`}>
              {value}
            </dd>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/** Sticky elevation that lights up floor by floor while the copy scrolls past. */
export function BuildingStory() {
  const { t } = useI18n();
  const root = useRef<HTMLElement>(null);
  const points = t.raw<string[]>("home.intro.points");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        const floors = Array.from(root.current!.querySelectorAll<SVGGElement>(".story-facade .fac-floor")).sort(
          (a, b) => Number(a.dataset.level) - Number(b.dataset.level),
        );
        gsap.fromTo(
          floors,
          { opacity: 0.25 },
          {
            opacity: 1,
            stagger: 0.25,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top 60%", end: "bottom 80%", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="building" ref={root} className="container-x grid gap-12 py-24 lg:grid-cols-2 lg:py-36">
      <div className="story-facade lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
        <Facade className="mx-auto h-full max-h-[640px] w-auto max-w-full" decorative />
      </div>
      <div className="lg:py-24">
        <p className="eyebrow">{t("home.intro.eyebrow")}</p>
        <SplitHeading text={t("home.intro.title")} className="mt-4 text-4xl leading-tight sm:text-6xl" />
        <Reveal>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-2">{t("home.intro.body")}</p>
        </Reveal>
        <Reveal as="ul" stagger={0.1} className="mt-10 grid gap-4">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-3 border-b border-line pb-4 text-lg">
              <Check size={18} className="text-accent" aria-hidden="true" />
              {p}
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const TYPE_SHOWCASE: Array<{ type: UnitType; code: string }> = [
  { type: "1+1", code: `05-${RESIDENTIAL_SLOTS.find((s) => s.type === "1+1")!.letter}` },
  { type: "2+1", code: `05-${RESIDENTIAL_SLOTS.find((s) => s.type === "2+1")!.letter}` },
  { type: "3+1", code: `05-${RESIDENTIAL_SLOTS.find((s) => s.type === "3+1")!.letter}` },
  { type: "penthouse", code: `${PENTHOUSE_FLOOR}-PH1` },
];

/** Horizontal, pinned gallery of typologies on desktop; a normal stack on mobile. */
export function Typologies() {
  const { t, fmt, locale } = useI18n();
  const units = useUnits();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const stats = useMemo(
    () =>
      TYPE_SHOWCASE.map(({ type, code }) => {
        const ofType = units.filter((u) => u.type === type);
        const available = ofType.filter((u) => u.status === "available");
        const visible = available.filter((u) => u.priceVisible);
        const areas = ofType.map((u) => u.areaNet);
        // Showcase an available home of this type when there is one.
        const showcase = available.find((u) => u.floor >= 4 && u.floor <= 8) ?? available[0];
        return {
          type,
          code: showcase?.code ?? code,
          available: available.length,
          from: visible.length ? Math.min(...visible.map((u) => u.price)) : null,
          minArea: Math.min(...areas),
          maxArea: Math.max(...areas),
        };
      }),
    [units],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth + 96;
        gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.6,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="overflow-hidden bg-ink py-24 text-paper lg:flex lg:h-screen lg:flex-col lg:justify-center lg:py-0" aria-labelledby="typ-title">
      <div className="container-x">
        <p className="eyebrow !text-paper/60">{t("home.typologies.eyebrow")}</p>
        <h2 id="typ-title" className="mt-3 text-4xl sm:text-6xl">{t("home.typologies.title")}</h2>
      </div>
      <div ref={track} className="mt-12 flex flex-col gap-5 px-[clamp(1.25rem,4vw,3rem)] lg:w-max lg:flex-row">
        {stats.map((s) => (
          <Link
            key={s.type}
            href={`/${locale}/units?type=${encodeURIComponent(s.type)}`}
            className="group grid rounded-3xl border border-paper/15 bg-paper/[0.04] p-6 transition-colors hover:border-paper/40 lg:w-[min(560px,42vw)]"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl">{t(`typesLong.${s.type}`)}</h3>
              <span className="num text-sm text-paper/60">{fmt.number(s.minArea)}–{fmt.number(s.maxArea)} m²</span>
            </div>
            <div className="my-6 rounded-2xl bg-paper p-3">
              <FloorPlan floor={Number(s.code.slice(0, 2))} units={units} focusCode={s.code} interactive={false} className="h-48 w-full sm:h-60" />
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-paper/50">{t("home.typologies.from")}</p>
                <p className="num font-display text-2xl">{s.from ? fmt.price(s.from) : t("home.typologies.onRequest")}</p>
              </div>
              <p className="num text-sm text-paper/70">
                {s.available > 0 ? t("home.typologies.available", { count: s.available }) : t("home.typologies.soldOut")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Location() {
  const { t } = useI18n();
  const points: Array<{ key: string; min: number; mode: "walk" | "drive"; x: number; y: number }> = [
    { key: "park", min: 6, mode: "walk", x: 140, y: 250 },
    { key: "market", min: 4, mode: "walk", x: 330, y: 110 },
    { key: "school", min: 8, mode: "drive", x: 440, y: 300 },
    { key: "center", min: 10, mode: "drive", x: 360, y: 40 },
    { key: "airport", min: 25, mode: "drive", x: 40, y: 40 },
  ];
  const home = { x: 260, y: 190 };
  return (
    <section id="location" className="container-x grid gap-12 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
      <div>
        <p className="eyebrow">{t("home.location.eyebrow")}</p>
        <SplitHeading text={t("home.location.title")} className="mt-4 text-4xl leading-tight sm:text-6xl" />
        <Reveal>
          <p className="mt-6 max-w-lg text-lg text-ink-2">{t("home.location.body")}</p>
        </Reveal>
        <Reveal as="ul" stagger={0.07} className="mt-8 divide-y divide-line border-y border-line">
          {points.map((p) => (
            <li key={p.key} className="flex items-center justify-between py-3.5">
              <span>{t(`home.location.points.${p.key}` as MessageKey)}</span>
              <span className="num text-sm text-muted">
                {t("home.location.minutes", { n: p.min })} · {t(`home.location.${p.mode}`)}
              </span>
            </li>
          ))}
        </Reveal>
      </div>
      <Reveal className="card overflow-hidden p-3">
        <svg viewBox="0 0 500 340" className="h-auto w-full" role="img" aria-label={t("home.location.title")}>
          <rect width="500" height="340" fill="var(--color-paper-2)" />
          {/* blocks */}
          {Array.from({ length: 7 }, (_, i) =>
            Array.from({ length: 5 }, (_, j) => (
              <rect key={`${i}-${j}`} x={12 + i * 70} y={12 + j * 66} width={58} height={52} rx={4} fill="var(--color-paper-3)" opacity={0.7} />
            )),
          )}
          {/* park + lake */}
          <path d="M60 200 C 90 170, 210 180, 220 240 C 230 300, 110 330, 60 300 Z" fill="var(--color-olive)" opacity={0.28} />
          <ellipse cx="135" cy="265" rx="45" ry="22" fill="#9fb5b8" opacity={0.6} />
          {/* main road */}
          <path d="M0 150 C 150 160, 300 140, 500 170" stroke="#fff" strokeWidth="10" fill="none" />
          <path d="M250 0 C 260 120, 240 220, 270 340" stroke="#fff" strokeWidth="8" fill="none" />
          {points.map((p) => (
            <g key={p.key}>
              <line x1={home.x} y1={home.y} x2={p.x} y2={p.y} stroke="var(--color-accent)" strokeDasharray="3 5" strokeWidth={1.5} />
              <circle cx={p.x} cy={p.y} r={6} fill="var(--color-ink)" />
              <text x={p.x + 10} y={p.y + 4} fontSize={12} fill="var(--color-ink)">
                {t(`home.location.points.${p.key}` as MessageKey)}
              </text>
            </g>
          ))}
          <g transform={`translate(${home.x} ${home.y})`}>
            <circle r={18} fill="var(--color-accent)" opacity={0.18} />
            <rect x={-7} y={-9} width={14} height={18} fill="var(--color-accent)" />
            <text y={-24} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-ink)">
              Vela
            </text>
          </g>
        </svg>
      </Reveal>
    </section>
  );
}

const AMENITIES = [
  { key: "garden", Icon: Leaf },
  { key: "parking", Icon: Car },
  { key: "lobby", Icon: ShieldCheck },
  { key: "gym", Icon: Dumbbell },
  { key: "storage", Icon: Package },
  { key: "solar", Icon: Sun },
] as const;

export function Amenities() {
  const { t } = useI18n();
  return (
    <section className="border-t border-line bg-paper-2/40 py-24 lg:py-32">
      <div className="container-x">
        <p className="eyebrow">{t("home.amenities.eyebrow")}</p>
        <SplitHeading text={t("home.amenities.title")} className="mt-4 text-4xl sm:text-6xl" />
        <Reveal stagger={0.07} className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map(({ key, Icon }) => {
            const [title, body] = t.raw<[string, string]>(`home.amenities.items.${key}` as MessageKey);
            return (
              <div key={key} className="bg-paper p-8">
                <Icon size={22} className="text-accent" aria-hidden="true" />
                <h3 className="mt-6 text-2xl">{title}</h3>
                <p className="mt-2 text-ink-2">{body}</p>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function Progress() {
  const { t } = useI18n();
  const stages = t.raw<string[]>("home.progress.stages");
  const current = PROJECT.constructionStage;
  return (
    <section id="progress" className="container-x py-24 lg:py-32">
      <p className="eyebrow">{t("home.progress.eyebrow")}</p>
      <SplitHeading text={t("home.progress.title", { delivery: PROJECT.deliveryQuarter })} className="mt-4 text-4xl sm:text-6xl" />
      <Reveal as="ol" stagger={0.1} className="mt-14 grid gap-6 md:grid-cols-5">
        {stages.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "next";
          return (
            <li key={s} className="relative border-t-2 pt-5" style={{ borderColor: state === "next" ? "var(--color-line)" : "var(--color-accent)" }}>
              <span className="num text-sm text-muted">0{i + 1}</span>
              <h3 className="mt-2 text-xl">{s}</h3>
              <p className={`mt-1 text-sm ${state === "current" ? "font-medium text-accent" : "text-muted"}`}>
                {t(`home.progress.${state}`)}
              </p>
            </li>
          );
        })}
      </Reveal>
    </section>
  );
}

export function Contact() {
  const { t } = useI18n();
  return (
    <section id="contact" className="border-t border-line bg-paper-2/50 py-24 lg:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">{t("home.contact.eyebrow")}</p>
          <SplitHeading text={t("home.contact.title")} className="mt-4 text-4xl sm:text-6xl" />
          <p className="mt-6 max-w-md text-lg text-ink-2">{t("home.contact.body")}</p>
          <div className="mt-10 grid gap-1 text-sm">
            <p className="font-medium">{t("home.contact.office")}</p>
            <p className="text-muted">{t("home.contact.hours")}</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Vela Residence")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-fit items-center gap-2 text-ink underline underline-offset-4"
            >
              <MessageCircle size={16} aria-hidden="true" /> {t("home.contact.whatsapp")}
            </a>
          </div>
        </div>
        <div className="card p-6 sm:p-10">
          <LeadForm unitCodes={[]} source="contact" />
        </div>
      </div>
    </section>
  );
}
