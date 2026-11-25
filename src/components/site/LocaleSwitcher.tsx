"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_LABELS, LOCALES, switchLocalePath, type Locale } from "@/lib/i18n/config";

function Switcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();

  return (
    <label className={className}>
      <span className="sr-only">{t("nav.language")}</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale;
          const qs = search.toString();
          router.push(`${switchLocalePath(pathname, next)}${qs ? `?${qs}` : ""}`, { scroll: false });
        }}
        className="cursor-pointer appearance-none rounded-full border border-line bg-transparent px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:border-ink"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {l.toUpperCase()} · {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LocaleSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<span className={className} />}>
      <Switcher className={className} />
    </Suspense>
  );
}
