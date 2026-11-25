export const LOCALES = ["en", "sq", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  sq: "Shqip",
  it: "Italiano",
};

/** Intl locale used for number and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  sq: "sq-AL",
  it: "it-IT",
};

export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** Replace the locale segment of a pathname. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const parts = pathname.split("/");
  if (parts.length > 1 && hasLocale(parts[1])) parts[1] = next;
  else parts.splice(1, 0, next);
  return parts.join("/") || `/${next}`;
}
