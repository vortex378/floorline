import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/home/Hero";
import { Amenities, BuildingStory, Contact, Location, Progress, Stats, Typologies } from "@/components/home/Sections";
import { DemoBanner } from "@/components/site/DemoBanner";
import { hasLocale } from "@/lib/i18n/config";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <Header tone="transparent" />
      <main id="main">
        <Hero />
        <Stats />
        <BuildingStory />
        <Typologies />
        <Location />
        <Amenities />
        <Progress />
        <Contact />
      </main>
      <DemoBanner />
      <Footer />
    </>
  );
}
