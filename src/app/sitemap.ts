import type { MetadataRoute } from "next";
import carsJson from "@/data/cars.json";
import { CarsFileSchema } from "@/engine";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const cars = CarsFileSchema.parse(carsJson);
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/classify`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/cars`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, priority: 0.3 },
    ...cars.map((c) => ({
      url: `${SITE_URL}/car/${c.id}`,
      lastModified: now,
      priority: 0.6,
    })),
  ];
}
