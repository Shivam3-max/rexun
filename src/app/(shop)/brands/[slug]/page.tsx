import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseView } from "@/components/BrowseView";
import { byBrand, getTaxonomy, getRunningAssumptions } from "@/lib/store";

const BLURB: Record<string, string> = {
  rexsun: "Our own brand — priced by us, serviced by us.",
  polycab: "Fans, lighting and electricals from one of India's largest manufacturers.",
  surya: "Lighting and home appliances, sold here as an authorised dealer.",
  halonix: "LED lighting and fans, sold here as an authorised dealer.",
  indo: "Value appliances — geysers, irons, coolers and fans.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = (await getTaxonomy()).brands.find((x) => x.slug === slug);
  return b
    ? { title: `${b.name} products`, description: BLURB[slug] ?? `Shop ${b.count} ${b.name} products.` }
    : { title: "Not found" };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = (await getTaxonomy()).brands.find((x) => x.slug === slug);
  if (!b) notFound();
  const [products, running] = await Promise.all([byBrand(b.name), getRunningAssumptions()]);
  return <BrowseView products={products} title={b.name} sub={BLURB[slug] ?? `${b.count} products`} running={running} />;
}
