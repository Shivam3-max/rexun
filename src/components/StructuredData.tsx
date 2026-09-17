import type { Product } from "@/lib/types";
import { SITE_URL, absolute } from "@/lib/site";

/**
 * schema.org JSON-LD. Worth the effort in this category: a price, a rating-free
 * availability flag and a brand are exactly what a search result needs to show
 * a product card rather than a blue link.
 */
export function ProductSchema({ p }: { p: Product }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.tagline || p.description || `${p.name} from ${p.brand}`,
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: p.brand },
    image: p.images.map((i) => absolute(i)),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: p.price,
      highPrice: p.priceMax,
      offerCount: p.variants.length,
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absolute(`/p/${p.slug}`),
    },
    ...(p.warranty ? { warranty: p.warranty } : {}),
  };
  return <Script data={data} />;
}

export function BreadcrumbSchema({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absolute(t.path),
    })),
  };
  return <Script data={data} />;
}

export function OrganizationSchema({
  store,
}: {
  store: { name: string; phone: string; email: string; address: string };
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: SITE_URL,
    ...(store.phone ? { telephone: store.phone } : {}),
    ...(store.email ? { email: store.email } : {}),
    ...(store.address ? { address: { "@type": "PostalAddress", streetAddress: store.address } } : {}),
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking, Cash on Delivery",
    currenciesAccepted: "INR",
  };
  return <Script data={data} />;
}

function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built here from our own data, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
