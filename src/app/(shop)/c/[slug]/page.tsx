import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseView } from "@/components/BrowseView";
import { byCategory, getTaxonomy, getRunningAssumptions } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getTaxonomy()).categories.find((x) => x.slug === slug);
  return c
    ? { title: `${c.name} — buy online`, description: `Shop ${c.count} ${c.name.toLowerCase()} online with free delivery over ₹999.` }
    : { title: "Not found" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (await getTaxonomy()).categories.find((x) => x.slug === slug);
  if (!c) notFound();
  const [products, running] = await Promise.all([byCategory(slug), getRunningAssumptions()]);
  return (
    <BrowseView
      products={products}
      title={c.name}
      sub={`${products.length} products · full manufacturer warranty · free delivery over ₹999`}
      showCategory={false}
      running={running}
    />
  );
}
