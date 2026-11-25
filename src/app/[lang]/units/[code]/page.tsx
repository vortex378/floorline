import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UNITS, getUnitSpec } from "@/domain/catalog";
import { seedUnits } from "@/domain/seed";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { UnitDetail } from "@/components/unit/UnitDetail";
import { hasLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createTranslator } from "@/lib/i18n/translate";

export async function generateStaticParams() {
  return UNITS.map((u) => ({ code: u.code }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/units/[code]">): Promise<Metadata> {
  const { lang, code } = await params;
  const spec = getUnitSpec(code);
  if (!hasLocale(lang) || !spec) return {};
  const t = createTranslator(await getDictionary(lang));
  const title = `${spec.code} · ${t(`typesLong.${spec.type}`)}`;
  const description = `${t(`typesLong.${spec.type}`)} · ${spec.areaNet} m² · ${t("floors.floor", { n: spec.floor })} · ${t(`orientation.${spec.orientation}`)}`;
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/units/${code}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/units/${code}`])),
    },
    openGraph: { title, description },
  };
}

export default async function UnitPage({ params }: PageProps<"/[lang]/units/[code]">) {
  const { lang, code } = await params;
  if (!hasLocale(lang)) notFound();
  const spec = getUnitSpec(code);
  if (!spec) notFound();
  const t = createTranslator(await getDictionary(lang));
  const seeded = seedUnits().find((u) => u.code === code)!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: `Vela Residence ${spec.code}`,
    description: t(`typesLong.${spec.type}`),
    numberOfRooms: spec.bedrooms + 1,
    numberOfBedrooms: spec.bedrooms,
    numberOfBathroomsTotal: spec.bathrooms,
    floorLevel: String(spec.floor),
    floorSize: { "@type": "QuantitativeValue", value: spec.areaNet, unitCode: "MTK" },
    address: { "@type": "PostalAddress", addressLocality: "Tirana", addressCountry: "AL" },
    ...(seeded.priceVisible
      ? {
          offers: {
            "@type": "Offer",
            price: seeded.price,
            priceCurrency: "EUR",
            availability: seeded.status === "available" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          },
        }
      : {}),
  };

  return (
    <>
      <Header />
      <main id="main">
        <UnitDetail code={code} />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
