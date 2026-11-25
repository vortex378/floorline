import type { MetadataRoute } from "next";
import { UNITS } from "@/domain/catalog";
import { LOCALES } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/units", ...UNITS.map((u) => `/units/${u.code}`)];
  return paths.map((path) => ({
    url: `${SITE_URL}/en${path}`,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));
}
