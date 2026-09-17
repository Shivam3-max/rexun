import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyBox } from "@/components/BuyBox";
import { ProductRail, SectionHead } from "@/components/ProductRail";
import {
  getProduct, byCategory, getShippingRules, getRunningAssumptions,
} from "@/lib/store";
import { inr } from "@/lib/pricing";
import { ProductSchema, BreadcrumbSchema } from "@/components/StructuredData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  const description = `Buy ${p.name} online at ${inr(p.price)}. ${p.tagline} Free delivery over ₹999.`;
  return {
    title: `${p.name} — ${inr(p.price)}`,
    description,
    openGraph: {
      title: `${p.name} — ${inr(p.price)}`,
      description,
      type: "website",
      images: p.images.length ? [{ url: p.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const [related, shipping, running] = await Promise.all([
    byCategory(p.categorySlug),
    getShippingRules(),
    getRunningAssumptions(),
  ]);

  // Own-label products ship with written highlights; for the brands we carry,
  // the spec table is the only honest source, so we read the most
  // decision-relevant rows out of it.
  const highlights = p.highlights.length
    ? p.highlights
    : Object.entries(p.specs)
        .filter(([k]) => !/warranty|colour$/i.test(k))
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-5">
      <ProductSchema p={p} />
      <BreadcrumbSchema
        trail={[
          { name: "Home", path: "/" },
          { name: p.deptName, path: `/d/${p.dept}` },
          { name: p.category, path: `/c/${p.categorySlug}` },
          { name: p.name, path: `/p/${p.slug}` },
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/" className="hover:text-rex-red">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/d/${p.dept}`} className="hover:text-rex-red">{p.deptName}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/c/${p.categorySlug}`} className="hover:text-rex-red">{p.category}</Link>
      </nav>

      <BuyBox p={p} shipping={shipping} running={running} />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <div>
          <h2 className="text-[19px] font-bold text-ink">What you get</h2>
          <ul className="mt-3 grid gap-2 text-[14.5px] text-ink-2">
            {highlights.map((h) => (
              <li key={h} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-rex-red" />
                {h}
              </li>
            ))}
          </ul>

          {p.description && p.description !== p.tagline && (
            <p className="mt-5 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">{p.description}</p>
          )}

          {Object.keys(p.specs).length > 0 && (
            <>
              <h2 className="mt-8 text-[19px] font-bold text-ink">Specifications</h2>
              <div className="mt-3 overflow-hidden rounded-card border border-line bg-card">
                <table className="w-full text-[14px]">
                  <tbody>
                    {Object.entries(p.specs).map(([k, v], i) => (
                      <tr key={k} className={i % 2 ? "bg-page" : ""}>
                        <th scope="row" className="w-[42%] px-4 py-2.5 text-left font-semibold text-ink-2">{k}</th>
                        <td className="px-4 py-2.5 text-ink tnum">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-card p-4">
            <h3 className="text-[15px] font-bold text-ink">Not sure which size?</h3>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              Answer three questions about the room and we will tell you the sweep or capacity
              to buy. No jargon.
            </p>
            <Link href="/help/size-guide" className="mt-3 inline-block rounded border border-ink px-3.5 py-2 text-[13.5px] font-bold text-ink hover:bg-ink hover:text-white">
              Open the size guide
            </Link>
          </div>

          <div className="rounded-card border border-line bg-card p-4">
            <h3 className="text-[15px] font-bold text-ink">Delivery &amp; returns</h3>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink-2">
              <li>Free delivery on orders over {inr(shipping.freeOver)}.</li>
              <li>Cash on delivery across North India.</li>
              <li>7-day replacement for transit damage.</li>
              <li>Warranty claims handled by us, not passed on.</li>
            </ul>
            <Link href="/help/returns" className="mt-3 inline-block text-[13.5px] font-semibold text-rex-red hover:underline">
              Read the full policy →
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 1 && (
        <section className="mt-14">
          <SectionHead title={`More ${p.category.toLowerCase()}`} href={`/c/${p.categorySlug}`} />
          <ProductRail products={related.filter((x) => x.slug !== p.slug).slice(0, 12)} running={running} />
        </section>
      )}
    </div>
  );
}
