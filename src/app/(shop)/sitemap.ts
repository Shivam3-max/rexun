import type { MetadataRoute } from "next";
import { getCatalog, getTaxonomy } from "@/lib/store";
import { SITE_URL } from "@/lib/site";

/**
 * Every page worth indexing, generated from the live catalogue so a product
 * added in the admin panel is discoverable without anyone remembering to
 * update a list.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, taxonomy] = await Promise.all([getCatalog(), getTaxonomy()]);

  const staticPages = [
    "", "/categories", "/rooms", "/rexsun", "/track", "/contact",
    "/help/shipping", "/help/returns", "/help/warranty", "/help/size-guide",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const listings = [
    ...taxonomy.departments.map((d) => `/d/${d.slug}`),
    ...taxonomy.categories.map((c) => `/c/${c.slug}`),
    ...taxonomy.rooms.map((r) => `/rooms/${r.slug}`),
    ...taxonomy.brands.map((b) => `/brands/${b.slug}`),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const products = catalog.map((p) => ({
    url: `${SITE_URL}/p/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p.own ? 0.9 : 0.7,
  }));

  return [...staticPages, ...listings, ...products];
}
