import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { I18nProvider } from "@/lib/i18n/client";
import { hasLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "Vela Residence",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: lang,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f3efe7",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang}>
      <body className="min-h-dvh">
        <I18nProvider locale={lang} dict={dict}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            {dict.nav.skip}
          </a>
          <SmoothScroll />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
