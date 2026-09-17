import "server-only";
import { cache } from "react";
import { db } from "./db";
import { SHIPPING_DEFAULTS, RUNNING_DEFAULTS, type ShippingRules } from "./pricing";
import type { Product, Taxonomy, Option, Variant } from "./types";

/**
 * The storefront's read layer. Everything the shop renders comes through here,
 * so an edit in the admin panel shows up on the site without a rebuild.
 *
 * React's `cache` dedupes within a single request — a page that asks for the
 * catalogue three times hits SQLite once.
 */

type ProductRow = NonNullable<Awaited<ReturnType<typeof db.product.findFirst>>> & {
  variants: Awaited<ReturnType<typeof db.variant.findMany>>;
  dept: { slug: string; name: string };
  category: { slug: string; name: string };
};

const parse = <T,>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

function toProduct(row: ProductRow): Product {
  const variants: Variant[] = row.variants.map((v) => ({
    sku: v.sku,
    attrs: parse<Record<string, string>>(v.attrs, {}),
    mrp: v.mrp,
    price: v.price,
    image: v.image,
    stock: v.stock,
    inStock: v.active && v.stock > 0,
  }));
  const live = variants.filter((v) => v.inStock);
  const priced = live.length ? live : variants;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    dept: row.dept.slug,
    deptName: row.dept.name,
    category: row.category.name,
    categorySlug: row.category.slug,
    rooms: parse<string[]>(row.rooms, []),
    tagline: row.tagline,
    description: row.description,
    specs: parse<Record<string, string>>(row.specs, {}),
    highlights: parse<string[]>(row.highlights, []),
    options: parse<Option[]>(row.options, []),
    variants,
    price: Math.min(...priced.map((v) => v.price)),
    priceMax: Math.max(...priced.map((v) => v.price)),
    mrp: Math.min(...priced.map((v) => v.mrp)),
    mrpMax: Math.max(...priced.map((v) => v.mrp)),
    estimatedPrice: row.estimatedPrice,
    images: parse<string[]>(row.images, []),
    wattage: row.wattage,
    sweep: row.sweep,
    warranty: row.warranty,
    skuCount: variants.length,
    inStock: live.length > 0,
    own: row.own,
    featured: row.featured,
  };
}

const include = {
  variants: { orderBy: { position: "asc" } },
  dept: { select: { slug: true, name: true } },
  category: { select: { slug: true, name: true } },
} as const;

/** Every product a shopper may see. Drafts and archived items are excluded. */
export const getCatalog = cache(async (): Promise<Product[]> => {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    include,
    orderBy: { position: "asc" },
  });
  return (rows as unknown as ProductRow[]).map(toProduct);
});

export const getProduct = cache(async (slug: string): Promise<Product | null> => {
  const row = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, include });
  return row ? toProduct(row as unknown as ProductRow) : null;
});

export const getTaxonomy = cache(async (): Promise<Taxonomy> => {
  const [depts, cats, products, roomSetting] = await Promise.all([
    db.department.findMany({ where: { visible: true }, orderBy: { position: "asc" } }),
    db.category.findMany({
      where: { visible: true },
      include: { dept: { select: { slug: true } } },
      orderBy: { position: "asc" },
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { brand: true, deptId: true, categoryId: true, rooms: true },
    }),
    getSetting<{ slug: string; name: string; image: string | null }[]>("rooms", []),
  ]);

  const countBy = <T,>(list: T[], key: (t: T) => string) =>
    list.reduce<Record<string, number>>((acc, t) => {
      const k = key(t);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const byDept = countBy(products, (p) => p.deptId);
  const byCat = countBy(products, (p) => p.categoryId);
  const byBrand = countBy(products, (p) => p.brand);

  const roomCount: Record<string, number> = {};
  for (const p of products)
    for (const r of parse<string[]>(p.rooms, [])) roomCount[r] = (roomCount[r] ?? 0) + 1;

  return {
    departments: depts.map((d) => ({
      slug: d.slug, name: d.name, blurb: d.blurb, image: d.image, count: byDept[d.id] ?? 0,
    })),
    categories: cats.map((c) => ({
      slug: c.slug, name: c.name, dept: c.dept.slug, image: c.image, count: byCat[c.id] ?? 0,
    })),
    brands: Object.entries(byBrand)
      .map(([name, count]) => ({ slug: name.toLowerCase(), name, count }))
      .sort((a, b) => b.count - a.count),
    rooms: roomSetting.map((r) => ({ ...r, count: roomCount[r.slug] ?? 0 })),
  };
});

// ------------------------------------------------------------------ slices

export const byDept = async (slug: string) =>
  (await getCatalog()).filter((p) => p.dept === slug);
export const byCategory = async (slug: string) =>
  (await getCatalog()).filter((p) => p.categorySlug === slug);
export const byRoom = async (slug: string) =>
  (await getCatalog()).filter((p) => p.rooms.includes(slug));
export const byBrand = async (name: string) =>
  (await getCatalog()).filter((p) => p.brand.toLowerCase() === name.toLowerCase());
export const getOwnBrand = async () => (await getCatalog()).filter((p) => p.own);

export const getFeatured = async (n: number) =>
  [...(await getCatalog())]
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.skuCount - a.skuCount)
    .slice(0, n);

/**
 * Relevance search over 268 products. A term the catalogue does not contain at
 * all drops the product, so "polycab bldc" narrows rather than widens.
 */
export async function searchProducts(q: string): Promise<Product[]> {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return (await getCatalog())
    .map((p) => {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.tagline}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (!hay.includes(t)) return { p, score: -1 };
        if (p.name.toLowerCase().includes(t)) score += 3;
        if (p.category.toLowerCase().includes(t)) score += 2;
        if (p.brand.toLowerCase().startsWith(t)) score += 2;
        score += 1;
      }
      if (p.own) score += 2;
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.p);
}

// ---------------------------------------------------------------- settings

export const getSetting = cache(async <T,>(key: string, fallback: T): Promise<T> => {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
});

export type StoreSettings = {
  name: string; tagline: string; phone: string; whatsapp: string;
  email: string; address: string; gstin: string; hours: string;
};

export const getStoreSettings = () =>
  getSetting<StoreSettings>("store", {
    name: "Rexsun", tagline: "Life Banaye Easy", phone: "", whatsapp: "",
    email: "", address: "", gstin: "", hours: "",
  });

export const getShippingRules = () => getSetting<ShippingRules>("shipping", SHIPPING_DEFAULTS);
export const getRunningAssumptions = () =>
  getSetting<{ hoursPerDay: number; ratePerUnit: number }>("running", RUNNING_DEFAULTS);
export const getPaymentMethods = () =>
  getSetting<Record<string, boolean>>("payments", { upi: true, card: true, netbanking: true, cod: true });
export const getAnnouncement = () =>
  getSetting<{ text: string; active: boolean }>("announcement", { text: "", active: false });

export const getBanners = cache(async (slot: string) =>
  db.banner.findMany({ where: { slot, active: true }, orderBy: { position: "asc" } })
);
