import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { UnitPicker } from "@/components/picker/UnitPicker";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/units">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.units, alternates: { canonical: `/${lang}/units` } };
}

function PickerFallback() {
  return (
    <div className="container-x pb-20 pt-28">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-paper-2" />
      <div className="mt-8 h-[520px] animate-pulse rounded-3xl bg-paper-2/70" />
    </div>
  );
}

export default async function UnitsPage({ params }: PageProps<"/[lang]/units">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<PickerFallback />}>
          <UnitPicker />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
