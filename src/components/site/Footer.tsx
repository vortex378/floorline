"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { AUTHOR } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  const { t, locale } = useI18n();
  const home = `/${locale}`;
  return (
    <footer className="no-print border-t border-line bg-paper-2/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-sm leading-relaxed text-muted">{t("demo.footer")}</p>
        </div>
        <nav aria-label="Footer" className="grid gap-2 text-sm">
          <Link href={`${home}/units`} className="hover:underline">{t("nav.residences")}</Link>
          <Link href={`${home}/compare`} className="hover:underline">{t("nav.compare")}</Link>
          <Link href={`${home}#contact`} className="hover:underline">{t("nav.contact")}</Link>
          <Link href={`${home}/admin`} className="hover:underline">{t("nav.salesOffice")}</Link>
        </nav>
        <div className="text-sm text-muted">
          <p>
            {t("demo.builtBy")} ·{" "}
            <a href={AUTHOR.github} className="underline underline-offset-4 hover:text-ink" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </p>
          <p className="mt-2">
            <a href={AUTHOR.repo} className="underline underline-offset-4 hover:text-ink" target="_blank" rel="noreferrer">
              {t("demo.source")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
