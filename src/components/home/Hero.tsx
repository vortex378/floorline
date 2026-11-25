"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "lucide-react";
import { PROJECT } from "@/domain/catalog";
import { useI18n } from "@/lib/i18n/client";
import { Facade } from "@/components/building/Facade";
import { SplitHeading } from "@/components/motion/Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Hero() {
  const { t, locale } = useI18n();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const svg = root.current?.querySelector(".hero-facade svg");
        if (!svg) return;
        const floors = Array.from(svg.querySelectorAll<SVGGElement>(".fac-floor")).sort(
          (a, b) => Number(a.dataset.level) - Number(b.dataset.level),
        );
        const outline = svg.querySelector<SVGPathElement>(".fac-outline");
        const len = outline?.getTotalLength() ?? 2000;

        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from(".hero-fade", { autoAlpha: 0, y: 18, duration: 1, stagger: 0.08 }, 0.5)
          .fromTo(outline, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" }, 0.1)
          .from(svg.querySelector(".fac-body"), { autoAlpha: 0, duration: 1.2 }, 0.6)
          .from(floors, { autoAlpha: 0, y: 10, duration: 0.9, stagger: 0.07 }, 0.7)
          .from(svg.querySelectorAll(".fac-tree"), { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 100%", duration: 1 }, 1.4);

        // Subtle parallax while scrolling away.
        gsap.to(".hero-facade", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-16">
      <div className="container-x grid min-h-[calc(100svh-4rem)] items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <p className="eyebrow hero-fade">{t("home.hero.eyebrow", { delivery: PROJECT.deliveryQuarter })}</p>
          <SplitHeading
            as="h1"
            immediate
            text={t("home.hero.title")}
            className="mt-5 text-[clamp(3rem,8vw,7rem)] leading-[0.95]"
          />
          <p className="hero-fade mt-7 max-w-xl text-lg leading-relaxed text-ink-2">
            {t("home.hero.lead")}
          </p>
          <div className="hero-fade mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/units`} className="btn btn-primary">
              {t("home.hero.cta")}
            </Link>
            <Link href={`/${locale}#contact`} className="btn btn-ghost">
              {t("home.hero.secondary")}
            </Link>
          </div>
        </div>
        <div className="hero-facade relative mx-auto w-full max-w-[460px]">
          <div className="absolute inset-x-6 bottom-6 top-1/4 -z-10 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <Facade className="w-full" decorative />
        </div>
      </div>
      <a
        href="#stats"
        className="hero-fade absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted md:flex"
      >
        <ArrowDown size={14} aria-hidden="true" /> {t("home.hero.scroll")}
      </a>
    </section>
  );
}
