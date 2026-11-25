"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, X, Scale } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { usePrefs, useHydrated } from "@/lib/store/hooks";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

export function Header({ tone = "paper" }: { tone?: "paper" | "transparent" }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const prefs = usePrefs();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  const home = `/${locale}`;
  const links = [
    { href: `${home}/units`, label: t("nav.residences") },
    { href: `${home}#building`, label: t("nav.building") },
    { href: `${home}#location`, label: t("nav.location") },
    { href: `${home}#progress`, label: t("nav.progress") },
    { href: `${home}#contact`, label: t("nav.contact") },
  ];
  const compareCount = hydrated ? prefs.compare.length : 0;

  return (
    <header
      className={clsx(
        "no-print fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || tone === "paper" || open
          ? "border-b border-line/70 bg-paper/85 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href={home} className="shrink-0" aria-label="Vela Residence">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-2 transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`${home}/compare`}
            className="relative hidden rounded-full p-2 text-ink-2 hover:text-ink sm:inline-flex"
            aria-label={`${t("nav.compare")} (${compareCount})`}
          >
            <Scale size={18} />
            {compareCount > 0 && (
              <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                {compareCount}
              </span>
            )}
          </Link>
          <LocaleSwitcher className="hidden sm:block" />
          <Link href={`${home}/units`} className="btn btn-primary btn-sm hidden sm:inline-flex">
            {t("nav.findHome")}
          </Link>
          <button
            type="button"
            className="rounded-full p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container-x border-t border-line/70 pb-6 lg:hidden">
          <ul className="flex flex-col py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-3 font-display text-2xl" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`${home}/compare`} className="block py-3 font-display text-2xl" onClick={() => setOpen(false)}>
                {t("nav.compare")} {compareCount > 0 ? `(${compareCount})` : ""}
              </Link>
            </li>
          </ul>
          <div className="flex items-center justify-between gap-3">
            <LocaleSwitcher />
            <Link href={`${home}/admin`} className="text-sm text-muted underline underline-offset-4">
              {t("nav.salesOffice")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
