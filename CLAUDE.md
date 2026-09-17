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

Optional integrations all live in `.env` and are **off by default**; the shop
degrades honestly rather than breaking when one is missing. See `.env.example`.

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

## Integrations, and what happens without them

**Payments — Razorpay** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`). With keys, a prepaid order opens Razorpay's sheet and
is confirmed two ways: the browser callback and the webhook at
`/api/payments/webhook`. Either can arrive first; both end in the same state.
Without keys the order is still created and the customer is told plainly that we
will call to collect payment. The key secret never leaves the server, and every
signature is verified with `timingSafeEqual`.

**Messaging — WhatsApp Cloud API and Resend** (`WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_ID`, `RESEND_API_KEY`, `EMAIL_FROM`). Every message is written to
the `Notification` table *before* a provider is asked to deliver it, so nothing
is lost when a provider is down and the panel can always show what the customer
should have been told. Unconfigured channels mark messages SKIPPED with the text
intact — see `/admin/messages`.

**Invoices** need nothing. `/order/[ref]/invoice` is a printable GST tax invoice;
the browser prints it to PDF. Numbers are assigned on *confirmation*, never on
placement, so a cancelled order never takes a number out of the sequence. Prices
are GST-inclusive, so tax is extracted from the total rather than added to it —
the customer must see the number they actually paid.

## Still to wire

- **Courier integration.** Tracking numbers are typed in by hand.
- **Reviews.** Deliberately out of v1 — there is nothing to show on day one.
