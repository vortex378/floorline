"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Building2, List, SlidersHorizontal, Radio } from "lucide-react";
import { ALL_FLOORS, PENTHOUSE_FLOOR } from "@/domain/layouts";
import { activeFilterCount, filtersFromSearchParams, filtersToSearchParams, matchesFilters, type UnitFilters } from "@/domain/filters";
import { useI18n } from "@/lib/i18n/client";
import { useRemoteChanges, useUnits } from "@/lib/store/hooks";
import { Facade } from "@/components/building/Facade";
import { FloorPlan } from "@/components/building/FloorPlan";
import { StatusBadge, StatusLegend } from "@/components/ui/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { CompareButton, FavoriteButton, RequestButton } from "@/components/unit/UnitActions";
import { Filters } from "./Filters";
import { UnitList } from "./UnitList";

gsap.registerPlugin(useGSAP);

export function UnitPicker() {
  const { t, fmt, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const units = useUnits();
  const pulsing = useRemoteChanges();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => filtersFromSearchParams(new URLSearchParams(search.toString())), [search]);
  const view = search.get("view") === "list" ? "list" : "building";
  const selectedCode = search.get("unit");

  const matching = useMemo(() => new Set(units.filter((u) => matchesFilters(u, filters)).map((u) => u.code)), [units, filters]);
  const filterCount = activeFilterCount(filters);

  const counts = useMemo(() => {
    const map = new Map<number, { available: number; total: number; matching: number; minPrice: number | null }>();
    for (const f of ALL_FLOORS) map.set(f, { available: 0, total: 0, matching: 0, minPrice: null });
    for (const u of units) {
      const c = map.get(u.floor)!;
      c.total += 1;
      if (u.status === "available") {
        c.available += 1;
        if (u.priceVisible) c.minPrice = c.minPrice === null ? u.price : Math.min(c.minPrice, u.price);
      }
      if (matching.has(u.code)) c.matching += 1;
    }
    return map;
  }, [units, matching]);

  const floorParam = search.get("floor");
  const floor = useMemo(() => {
    const n = floorParam === null ? NaN : Number(floorParam);
    if ((ALL_FLOORS as readonly number[]).includes(n)) return n;
    // Default: the middle-most floor that has matching homes.
    const withMatches = ALL_FLOORS.filter((f) => (counts.get(f)?.matching ?? 0) > 0 && f !== 0);
    return withMatches[Math.floor(withMatches.length / 2)] ?? 5;
  }, [floorParam, counts]);

  const setParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(search.toString());
      mutate(p);
      const qs = p.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [search, router, pathname],
  );

  const setFilters = (f: UnitFilters) =>
    setParams((p) => {
      const keep = { floor: p.get("floor"), view: p.get("view") };
      const next = filtersToSearchParams(f);
      for (const key of [...p.keys()]) p.delete(key);
      next.forEach((v, k) => p.set(k, v));
      if (keep.floor) p.set("floor", keep.floor);
      if (keep.view) p.set("view", keep.view);
    });

  const selectFloor = (f: number) => setParams((p) => {
    p.set("floor", String(f));
    p.delete("unit");
  });
  const selectUnit = (code: string | null) => setParams((p) => (code ? p.set("unit", code) : p.delete("unit")));
  const setView = (v: "building" | "list") => setParams((p) => (v === "list" ? p.set("view", "list") : p.delete("view")));

  const floorLabel = (f: number) =>
    f === 0 ? t("floors.ground") : f === PENTHOUSE_FLOOR ? t("floors.penthouse") : t("floors.floor", { n: f });
  const floorShort = (f: number) => (f === 0 ? t("floors.groundShort") : f === PENTHOUSE_FLOOR ? t("floors.phShort") : String(f));

  const selected = selectedCode ? units.find((u) => u.code === selectedCode) : undefined;
  const floorInfo = counts.get(floor)!;

  // Plan transition when the floor changes.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(planRef.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" });
    },
    { dependencies: [floor, view] },
  );

  return (
    <div className="container-x pb-20 pt-24 lg:pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("picker.eyebrow")}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{t("picker.title")}</h1>
          <p className="mt-2 text-ink-2">{t("picker.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="num mr-2 text-sm text-muted" aria-live="polite">
            {t("picker.results", { count: matching.size })}
          </p>
          <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="View">
            <button type="button" className="chip border-0" aria-pressed={view === "building"} onClick={() => setView("building")}>
              <Building2 size={14} aria-hidden="true" /> {t("picker.building")}
            </button>
            <button type="button" className="chip border-0" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <List size={14} aria-hidden="true" /> {t("picker.list")}
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={14} aria-hidden="true" />
            {t("filters.open")}
            {filterCount > 0 && <span className="num rounded-full bg-accent px-1.5 text-[10px] text-white">{filterCount}</span>}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {view === "building" ? (
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
              {/* Floor selector: elevation on desktop, chips on mobile */}
              <div className="hidden md:block">
                <p className="eyebrow mb-2">{t("picker.selectFloor")}</p>
                <Facade
                  className="w-full"
                  interactive
                  activeFloor={floor}
                  onSelectFloor={selectFloor}
                  floorLabel={floorLabel}
                  counts={counts}
                />
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden" role="group" aria-label={t("picker.selectFloor")} data-lenis-prevent>
                {[...ALL_FLOORS].reverse().map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="chip num shrink-0"
                    aria-pressed={floor === f}
                    aria-label={floorLabel(f)}
                    onClick={() => selectFloor(f)}
                  >
                    {floorShort(f)}
                    <span className="text-[10px] opacity-60">{counts.get(f)?.available}</span>
                  </button>
                ))}
              </div>

              <section aria-labelledby="floor-title" className="card min-w-0 p-4 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="floor-title" className="text-2xl">{floorLabel(floor)}</h2>
                  <p className="num text-sm text-ink-2">
                    {t("picker.floorSummary", { available: floorInfo.available, total: floorInfo.total })}
                    {floorInfo.minPrice !== null && <> · {t("picker.from", { price: fmt.price(floorInfo.minPrice) })}</>}
                  </p>
                </div>
                <div ref={planRef} className="mt-4">
                  <FloorPlan
                    floor={floor}
                    units={units}
                    matching={filterCount > 0 ? matching : null}
                    selectedCode={selectedCode}
                    pulsing={pulsing}
                    onSelect={selectUnit}
                    className="h-auto w-full"
                    title={floorLabel(floor)}
                  />
                </div>
                {floorInfo.matching === 0 && filterCount > 0 && (
                  <p className="mt-3 text-center text-sm text-muted">{t("picker.noneOnFloor")}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <StatusLegend />
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Radio size={13} className="text-st-available" aria-hidden="true" />
                    <span>
                      {t("picker.liveHint")}{" "}
                      <Link href={`/${locale}/admin/units`} target="_blank" className="underline underline-offset-2 hover:text-ink">
                        {t("picker.openSalesOffice")}
                      </Link>
                    </span>
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div ref={planRef}>
              <UnitList units={units.filter((u) => matching.has(u.code))} pulsing={pulsing} />
            </div>
          )}
        </div>

        <aside className="hidden lg:block" aria-label={t("filters.title")}>
          <div className="card sticky top-24 p-5">
            <Filters value={filters} onChange={setFilters} />
          </div>
        </aside>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title={t("filters.title")} side="bottom">
        <Filters value={filters} onChange={setFilters} />
        <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setFiltersOpen(false)}>
          {t("filters.apply", { count: matching.size })}
        </button>
      </Sheet>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && selectUnit(null)}
        title={selected ? `${selected.code} · ${t(`types.${selected.type}`)}` : ""}
        description={selected ? floorLabel(selected.floor) : undefined}
      >
        {selected && (
          <div className="grid gap-5" data-testid="unit-sheet">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} />
              <p className="num font-display text-2xl">
                {selected.priceVisible ? fmt.price(selected.price) : <span className="text-base text-muted">{t("unit.onRequest")}</span>}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-paper-2/40 p-2">
              <FloorPlan floor={selected.floor} units={units} focusCode={selected.code} interactive={false} className="h-56 w-full" />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted">{t("unit.areaNet")}</dt>
                <dd className="num font-medium">{fmt.area(selected.areaNet)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("unit.terrace")}</dt>
                <dd className="num font-medium">{fmt.area(selected.terrace)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("unit.bedrooms")}</dt>
                <dd className="num font-medium">{selected.bedrooms}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("unit.orientation")}</dt>
                <dd className="font-medium">{t(`orientation.${selected.orientation}`)}</dd>
              </div>
            </dl>
            <div className="grid gap-2">
              <Link href={`/${locale}/units/${selected.code}`} className="btn btn-primary w-full">
                {t("unit.view")}
              </Link>
              {selected.status === "available" && (
                <RequestButton codes={[selected.code]} source="picker" className="btn btn-accent w-full" />
              )}
              <div className="grid grid-cols-2 gap-2">
                <FavoriteButton code={selected.code} className="w-full" />
                <CompareButton code={selected.code} className="w-full" />
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
