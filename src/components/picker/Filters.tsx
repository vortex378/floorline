"use client";

import { useEffect, useState } from "react";
import { activeFilterCount, EMPTY_FILTERS, type Range, type UnitFilters } from "@/domain/filters";
import { ORIENTATIONS, UNIT_TYPES } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";

function RangeInputs({
  label,
  value,
  onChange,
  step,
  idPrefix,
}: {
  label: string;
  value: Range;
  onChange: (r: Range) => void;
  step: number;
  idPrefix: string;
}) {
  const { t } = useI18n();
  const [min, setMin] = useState(value.min?.toString() ?? "");
  const [max, setMax] = useState(value.max?.toString() ?? "");

  useEffect(() => {
    const id = setTimeout(() => {
      setMin(value.min?.toString() ?? "");
      setMax(value.max?.toString() ?? "");
    }, 0);
    return () => clearTimeout(id);
  }, [value.min, value.max]);

  const commit = (nextMin: string, nextMax: string) =>
    onChange({ min: nextMin === "" ? null : Number(nextMin), max: nextMax === "" ? null : Number(nextMax) });

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${idPrefix}-min`} className="sr-only">{`${label} ${t("filters.min")}`}</label>
        <input
          id={`${idPrefix}-min`}
          className="field num"
          inputMode="numeric"
          type="number"
          min={0}
          step={step}
          placeholder={t("filters.min")}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => commit(min, max)}
          onKeyDown={(e) => e.key === "Enter" && commit(min, max)}
        />
        <label htmlFor={`${idPrefix}-max`} className="sr-only">{`${label} ${t("filters.max")}`}</label>
        <input
          id={`${idPrefix}-max`}
          className="field num"
          inputMode="numeric"
          type="number"
          min={0}
          step={step}
          placeholder={t("filters.max")}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => commit(min, max)}
          onKeyDown={(e) => e.key === "Enter" && commit(min, max)}
        />
      </div>
    </fieldset>
  );
}

export function Filters({ value, onChange }: { value: UnitFilters; onChange: (f: UnitFilters) => void }) {
  const { t } = useI18n();
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const count = activeFilterCount(value);

  return (
    <div className="grid gap-6" data-testid="filters">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{t("filters.title")}</h2>
        {count > 0 && (
          <button type="button" className="text-sm text-muted underline underline-offset-4 hover:text-ink" onClick={() => onChange(EMPTY_FILTERS)}>
            {t("filters.reset")}
          </button>
        )}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm font-medium">
        {t("filters.availableOnly")}
        <input
          type="checkbox"
          role="switch"
          className="h-5 w-5 accent-[var(--color-accent)]"
          checked={value.availableOnly}
          onChange={(e) => onChange({ ...value, availableOnly: e.target.checked })}
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("filters.type")}</legend>
        <div className="flex flex-wrap gap-2">
          {UNIT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="chip"
              aria-pressed={value.types.includes(type)}
              onClick={() => onChange({ ...value, types: toggle(value.types, type) })}
            >
              {t(`types.${type}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <RangeInputs idPrefix="price" label={t("filters.price")} step={5000} value={value.price} onChange={(price) => onChange({ ...value, price })} />
      <RangeInputs idPrefix="area" label={t("filters.area")} step={5} value={value.area} onChange={(area) => onChange({ ...value, area })} />
      <RangeInputs idPrefix="floor" label={t("filters.floor")} step={1} value={value.floor} onChange={(floor) => onChange({ ...value, floor })} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("filters.orientation")}</legend>
        <div className="grid grid-cols-4 gap-2">
          {ORIENTATIONS.map((o) => (
            <button
              key={o}
              type="button"
              className="chip justify-center"
              aria-pressed={value.orientations.includes(o)}
              aria-label={t(`orientation.${o}`)}
              onClick={() => onChange({ ...value, orientations: toggle(value.orientations, o) })}
            >
              {o}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
