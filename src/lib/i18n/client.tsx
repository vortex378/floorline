"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createFormatters } from "../format";
import { createTranslator, type Dictionary } from "./translate";

interface I18nValue {
  locale: Locale;
  t: ReturnType<typeof createTranslator>;
  fmt: ReturnType<typeof createFormatters>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(dict), fmt: createFormatters(locale) }),
    [locale, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
