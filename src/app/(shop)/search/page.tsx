import Link from "next/link";
import { BrowseView } from "@/components/BrowseView";
import { searchProducts, getTaxonomy, getRunningAssumptions } from "@/lib/store";
import { db } from "@/lib/db";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const taxonomy = await getTaxonomy();

  if (!term) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-12">
        <h1 className="text-[24px] font-bold text-ink">What are you looking for?</h1>
        <p className="mt-2 text-[15px] text-ink-2">Try a category, or a brand name.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {taxonomy.categories.slice(0, 14).map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="rounded-full border border-line-2 bg-card px-3.5 py-1.5 text-[13.5px] font-semibold text-ink hover:border-rex-red hover:text-rex-red">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [hits, running] = await Promise.all([searchProducts(term), getRunningAssumptions()]);

  // Logged so the admin panel can show what people look for and, more usefully,
  // what they look for and do not find.
  await db.searchLog.create({ data: { term: term.toLowerCase(), results: hits.length } }).catch(() => {});

  if (!hits.length) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-14 text-center">
        <h1 className="text-[22px] font-bold text-ink">No results for “{term}”</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          We stock fans, lighting, kitchen appliances, geysers, coolers, heaters, irons and
          home electricals. Try one of those.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {taxonomy.departments.map((d) => (
            <Link key={d.slug} href={`/d/${d.slug}`} className="rounded-full border border-line-2 bg-card px-3.5 py-1.5 text-[13.5px] font-semibold text-ink hover:border-rex-red hover:text-rex-red">
              {d.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return <BrowseView products={hits} title={`Results for “${term}”`} sub={`${hits.length} products`} running={running} />;
}
