"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <main id="main" className="container-x grid min-h-[70vh] place-content-center text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl">{t("common.notFound")}</h1>
      <Link href={`/${locale}`} className="btn btn-primary mx-auto mt-8">
        {t("common.goHome")}
      </Link>
    </main>
  );
}
