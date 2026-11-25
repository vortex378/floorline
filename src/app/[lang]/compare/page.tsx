import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ComparePage } from "@/components/unit/ComparePage";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/compare">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.compare, robots: { index: false } };
}

export default async function Page({ params }: PageProps<"/[lang]/compare">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <Header />
      <main id="main">
        <ComparePage />
      </main>
      <Footer />
    </>
  );
}
