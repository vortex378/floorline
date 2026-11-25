"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Animate direct children one after another instead of the wrapper. */
  stagger?: number;
  y?: number;
  delay?: number;
}

/** Fade + rise when scrolled into view. Static for reduced-motion users. */
export function Reveal({ children, as: Tag = "div", className, stagger, y = 28, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = stagger ? Array.from(el.children) : el;
        gsap.from(targets, {
          y,
          autoAlpha: 0,
          duration: 1.1,
          delay,
          ease: "expo.out",
          stagger: stagger ?? 0,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Headline that rises in word by word. */
export function SplitHeading({
  text,
  as: Tag = "h2",
  className,
  immediate = false,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(el.querySelectorAll("[data-word]"), {
          yPercent: 110,
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.06,
          delay: immediate ? 0.15 : 0,
          scrollTrigger: immediate ? undefined : { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-word className="inline-block">
            {word}
            {" "}
          </span>
        </span>
      ))}
    </Tag>
  );
}
