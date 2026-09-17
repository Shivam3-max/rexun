// Seeds the database from the generated catalogue files.
//
//   node scripts/seed.mjs            keep existing orders/customers
//   node scripts/seed.mjs --reset    wipe everything first
//
// Catalogue rows are upserted by slug, so re-running after `npm run catalog`
// picks up new products without touching prices an admin has since edited —
// only genuinely new products and new variants are inserted.

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const HERE = path.resolve(import.meta.dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(HERE, "src/data", f), "utf8"));

const products = read("catalog.json");
const taxonomy = read("taxonomy.json");
const reset = process.argv.includes("--reset");

const ROOM_NAMES = {
  "living-room": "Living Room", bedroom: "Bedroom", kitchen: "Kitchen",
  bathroom: "Bathroom", outdoor: "Outdoor",
};

const DEFAULT_SETTINGS = {
  store: {
    name: "Rexsun",
    tagline: "Life Banaye Easy",
    phone: "+91 00000 00000",
    whatsapp: "+91 00000 00000",
    email: "support@rexsun.in",
    address: "Registered address to be confirmed",
    gstin: "",
    hours: "Mon–Sat, 10am – 7pm",
  },
  shipping: {
    freeOver: 999,
    flatRate: 79,
    codLimit: 15000,
    tricityDays: 2,
    northDays: 4,
    restDays: 6,
  },
  payments: { upi: true, card: true, netbanking: true, cod: true },
  running: { hoursPerDay: 8, ratePerUnit: 8 },
  announcement: {
    text: "Authorised dealer for Polycab, Surya, Halonix and Indo",
    active: true,
  },
};

async function main() {
  if (reset) {
    // Child rows first — SQLite enforces the foreign keys.
    await db.orderEvent.deleteMany();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.address.deleteMany();
    await db.customerSession.deleteMany();
    await db.customer.deleteMany();
    await db.variant.deleteMany();
    await db.product.deleteMany();
    await db.category.deleteMany();
    await db.department.deleteMany();
    await db.coupon.deleteMany();
    await db.banner.deleteMany();
    await db.enquiry.deleteMany();
    await db.searchLog.deleteMany();
    await db.auditLog.deleteMany();
    await db.adminSession.deleteMany();
    await db.adminUser.deleteMany();
    await db.setting.deleteMany();
    console.log("reset      all tables cleared");
  }

  // -------------------------------------------------------------- admin
  const email = process.env.ADMIN_EMAIL || "admin@rexsun.in";
  const password = process.env.ADMIN_PASSWORD || "rexsun@2026";
  await db.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Store Owner",
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });
  console.log(`admin      ${email}`);

  // ---------------------------------------------------------- taxonomy
  const deptId = {};
  for (const [i, d] of taxonomy.departments.entries()) {
    const row = await db.department.upsert({
      where: { slug: d.slug },
      update: { name: d.name, blurb: d.blurb },
      create: { slug: d.slug, name: d.name, blurb: d.blurb, position: i },
    });
    deptId[d.slug] = row.id;
  }

  const catId = {};
  for (const [i, c] of taxonomy.categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, deptId: deptId[c.dept] },
      create: { slug: c.slug, name: c.name, deptId: deptId[c.dept], position: i },
    });
    catId[c.slug] = row.id;
  }
  console.log(`taxonomy   ${taxonomy.departments.length} departments, ${taxonomy.categories.length} categories`);

  // ---------------------------------------------------------- products
  let created = 0;
  let skipped = 0;
  for (const [i, p] of products.entries()) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) { skipped++; continue; }

    await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        deptId: deptId[p.dept],
        categoryId: catId[p.categorySlug],
        tagline: p.tagline || "",
        description: p.tagline || "",
        highlights: JSON.stringify(p.highlights || []),
        specs: JSON.stringify(p.specs || {}),
        rooms: JSON.stringify(p.rooms || []),
        images: JSON.stringify(p.images || []),
        options: JSON.stringify(p.options || []),
        warranty: p.warranty,
        wattage: p.wattage,
        sweep: p.sweep,
        price: p.price,
        priceMax: p.priceMax,
        mrp: p.mrp,
        mrpMax: p.mrpMax,
        estimatedPrice: !!p.estimatedPrice,
        own: !!p.own,
        featured: !!p.own,
        position: i,
        variants: {
          create: p.variants.map((v, vi) => ({
            sku: v.sku,
            attrs: JSON.stringify(v.attrs || {}),
            mrp: v.mrp,
            price: v.price,
            image: v.image,
            stock: 25,
            position: vi,
          })),
        },
      },
    });
    created++;
  }
  console.log(`products   ${created} created, ${skipped} already present`);

  // ---------------------------------------------------------- settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }
  await db.setting.upsert({
    where: { key: "rooms" },
    update: {},
    create: {
      key: "rooms",
      value: JSON.stringify(
        taxonomy.rooms.map((r) => ({ slug: r.slug, name: ROOM_NAMES[r.slug] ?? r.name, image: null }))
      ),
    },
  });
  console.log(`settings   ${Object.keys(DEFAULT_SETTINGS).length + 1} keys`);

  // ------------------------------------------------------------ banners
  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        { slot: "HERO", title: "Hero banner", subtitle: "1280 × 480", position: 0 },
        { slot: "PROMO", title: "Promo tile", subtitle: "320 × 228", position: 0 },
        { slot: "PROMO", title: "Promo tile", subtitle: "320 × 228", position: 1 },
      ],
    });
    console.log("banners    3 placeholder slots");
  }

  // ------------------------------------------------------------ coupons
  if ((await db.coupon.count()) === 0) {
    await db.coupon.createMany({
      data: [
        { code: "REXSUN10", description: "10% off your first order", type: "PERCENT", value: 10, minOrder: 999, maxDiscount: 1000 },
        { code: "FLAT200", description: "₹200 off over ₹2,500", type: "FLAT", value: 200, minOrder: 2500 },
      ],
    });
    console.log("coupons    2 starter codes");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
