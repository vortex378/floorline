import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./translate";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./messages/en.json").then((m) => m.default),
  sq: () => import("./messages/sq.json").then((m) => m.default),
  it: () => import("./messages/it.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
