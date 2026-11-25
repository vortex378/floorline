import { INTL_LOCALE, type Locale } from "./i18n/config";

export function createFormatters(locale: Locale) {
  const intl = INTL_LOCALE[locale];
  const eur = new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eurCompact = new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const num = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric" });
  const dateTime = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const month = new Intl.DateTimeFormat(intl, { month: "short" });
  const rel = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });

  return {
    price: (v: number) => eur.format(v),
    priceCompact: (v: number) => eurCompact.format(v),
    area: (v: number) => `${num.format(v)} m²`,
    number: (v: number) => num.format(v),
    percent: (v: number) => pct.format(v),
    date: (ts: number) => date.format(ts),
    dateTime: (ts: number) => dateTime.format(ts),
    month: (ts: number) => month.format(ts),
    relative: (ts: number, now: number) => {
      const diff = ts - now;
      const abs = Math.abs(diff);
      if (abs < 3_600_000) return rel.format(Math.round(diff / 60_000), "minute");
      if (abs < 86_400_000) return rel.format(Math.round(diff / 3_600_000), "hour");
      return rel.format(Math.round(diff / 86_400_000), "day");
    },
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
