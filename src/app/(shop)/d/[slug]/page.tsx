import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseView } from "@/components/BrowseView";
import { byDept, getTaxonomy, getRunningAssumptions } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = (await getTaxonomy()).departments.find((x) => x.slug === slug);
  return d
    ? { title: `${d.name} — buy online`, description: `${d.blurb}. ${d.count} products with free delivery over ₹999.` }
    : { title: "Not found" };
}

export default async function DeptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = (await getTaxonomy()).departments.find((x) => x.slug === slug);
  if (!d) notFound();
  const [products, running] = await Promise.all([byDept(slug), getRunningAssumptions()]);
  return <BrowseView products={products} title={d.name} sub={d.blurb} running={running} />;
}
