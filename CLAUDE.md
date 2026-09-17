# Rexsun — D2C storefront + admin

Consumer store for the Rexsun house brand, plus the four brands the business
retails. Sister project to `../amit-electricals`, which is the B2B/dealer site
and the original source of the product data.

- `npm run dev` — port **3700** (amit-electricals owns 3690).
- `npm run catalog` — regenerates `src/data/catalog.json` + `taxonomy.json` from
  the Amit Electricals trade catalogue and copies images into `public/products/`.
- `npm run seed` — loads the generated catalogue into the database. Existing
  products are left alone, so admin price edits survive a re-seed.
- `npm run reset` — wipes every table and seeds from scratch. Destroys orders.
- `npm run db` — Prisma Studio, for looking at the data directly.

Admin sign-in: `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, seeded on first run.

## Architecture

Two **root layouts**, via route groups: `src/app/(shop)` and `src/app/(admin)`.
That is how the admin panel avoids inheriting the shop's header, footer and
mobile tab bar — a nested layout cannot escape its parent, a sibling root can.

The storefront reads everything through `src/lib/store.ts`, never from the JSON
files directly, so an admin edit shows on the shop with no rebuild. The JSON in
`src/data/` is a **seed**, not the live catalogue.

`src/lib/pricing.ts` is deliberately free of database imports so client
components (cards, cart, buy box) and the server share one definition of what
something costs.

## Two rules worth keeping

**The browser proposes, the database decides.** Cart lines carry their own name,
price and image so the cart works without the catalogue in the browser — but
`placeOrder` re-prices every line from the database before creating an order. A
stale or edited localStorage cart can never set the price that gets charged.

**The B2B file counts SKUs; this store counts products.** 677 trade SKUs collapse
into 268 product pages with variant pickers. `scripts/build-catalog.mjs` does
that merge, including working out which option axes are real choices (size,
finish, light colour) and which follow from another choice (wattage follows
sweep, so it is not a picker).

## Deliberately absent

No order pad, dealer login, tier pricing, GSTIN capture or enquiry cart — those
belong to Amit Electricals and would confuse a consumer here.

## Still to wire

- **Payments.** Checkout records the chosen method and marks prepaid orders
  PENDING; no gateway is connected. Cash on delivery works end to end today.
- **WhatsApp / email notifications.** The copy promises them; nothing sends yet.
- **Invoices.** No PDF generation.
