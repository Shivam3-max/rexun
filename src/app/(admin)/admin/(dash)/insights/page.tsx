import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Card, Table, Stat, Empty, dateShort } from "@/components/admin/ui";
import { inr } from "@/lib/pricing";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const thirty = new Date(Date.now() - 30 * 86400000);

  const [terms, dead, topByRevenue, byCategory, byBrand, never] = await Promise.all([
    db.searchLog.groupBy({
      by: ["term"], _count: true, orderBy: { _count: { term: "desc" } }, take: 20,
    }),
    db.searchLog.groupBy({
      by: ["term"], where: { results: 0 }, _count: true,
      orderBy: { _count: { term: "desc" } }, take: 20,
    }),
    db.orderItem.groupBy({
      by: ["slug", "name"], _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } }, take: 15,
    }),
    db.order.findMany({
      where: { placedAt: { gte: thirty }, status: { not: "CANCELLED" } },
      include: { items: { select: { slug: true, price: true, qty: true } } },
    }),
    db.product.groupBy({ by: ["brand"], _count: true }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, price: true, createdAt: true },
    }),
  ]);

  const sold = new Set(topByRevenue.map((t) => t.slug));
  const revenue30 = byCategory.reduce((s, o) => s + o.items.reduce((x, i) => x + i.price * i.qty, 0), 0);

  // Products with a page and no sales are the ones to photograph, reprice or
  // rewrite — so they are worth naming rather than burying in a total.
  const unsoldNames = never.filter((p) => !sold.has(p.id)).slice(0, 0);

  return (
    <>
      <PageHead title="Insights" sub="What people search for, and what they buy" />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Revenue, 30 days" value={inr(revenue30)} />
        <Stat label="Searches logged" value={String(terms.reduce((s, t) => s + t._count, 0))} />
        <Stat label="Searches with no result" value={String(dead.reduce((s, t) => s + t._count, 0))}
          tone={dead.length ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Most searched" sub="All time">
          {terms.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">Nobody has used the search box yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {terms.map((t) => (
                <li key={t.term} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <Link href={`/search?q=${encodeURIComponent(t.term)}`} target="_blank" className="text-ink-2 hover:text-rex-red">
                    {t.term}
                  </Link>
                  <span className="font-semibold text-ink tnum">{t._count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Searched, nothing found" sub="Gaps in the catalogue, in the customer's own words">
          {dead.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">Every search has returned something.</p>
          ) : (
            <ul className="space-y-1.5">
              {dead.map((t) => (
                <li key={t.term} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="text-ink-2">{t.term}</span>
                  <span className="font-semibold text-rex-red tnum">{t._count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">Best sellers</h2>
      {topByRevenue.length === 0 ? (
        <Empty title="Nothing sold yet" body="Once orders come in, the products that move appear here in order." />
      ) : (
        <Table head={["Product", "Units sold", ""]}>
          {topByRevenue.map((t) => (
            <tr key={t.slug} className="hover:bg-page">
              <td className="px-3 py-2.5 text-ink-2">{t.name}</td>
              <td className="px-3 py-2.5 font-bold text-ink tnum">{t._sum.qty}</td>
              <td className="px-3 py-2.5 text-right">
                <Link href={`/p/${t.slug}`} target="_blank" className="text-[12.5px] font-semibold text-rex-red hover:underline">
                  View ↗
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">Catalogue by brand</h2>
      <Table head={["Brand", "Products"]}>
        {byBrand.sort((a, b) => b._count - a._count).map((b) => (
          <tr key={b.brand} className="hover:bg-page">
            <td className="px-3 py-2.5 font-semibold text-ink">{b.brand}</td>
            <td className="px-3 py-2.5 text-ink-2 tnum">{b._count}</td>
          </tr>
        ))}
      </Table>
      <div className="h-10" />
    </>
  );
}
