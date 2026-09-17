import Link from "next/link";
import { getTaxonomy } from "@/lib/store";

export const metadata = { title: "All categories" };

export default async function CategoriesPage() {
  const taxonomy = await getTaxonomy();
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-[28px] font-bold text-ink sm:text-[32px]">All categories</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {taxonomy.categories.reduce((s, c) => s + c.count, 0)} products across{" "}
        {taxonomy.departments.length} departments.
      </p>

      <div className="mt-7 space-y-8">
        {taxonomy.departments.map((d) => (
          <section key={d.slug}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <h2 className="text-[19px] font-bold text-ink">{d.name}</h2>
              <Link href={`/d/${d.slug}`} className="text-[13.5px] font-semibold text-rex-red hover:underline">
                View all {d.count} →
              </Link>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {taxonomy.categories
                .filter((c) => c.dept === d.slug)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/c/${c.slug}`}
                      className="flex items-center justify-between rounded-card border border-line bg-card px-4 py-3 text-[14.5px] font-semibold text-ink hover:border-rex-red hover:text-rex-red"
                    >
                      {c.name}
                      <span className="text-[12.5px] font-medium text-ink-3 tnum">{c.count}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
