import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Stat, Card, Table, Pill, Money, dateShort, Empty } from "@/components/admin/ui";
import { inr } from "@/lib/pricing";

export const metadata = { title: "Dashboard" };

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default async function AdminDashboard() {
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const monthAgo = new Date(today.getTime() - 29 * 86400000);

  const [
    ordersToday, revenueMonth, openOrders, recentOrders,
    productCount, draftCount, estimatedCount, outOfStock, lowStock,
    newEnquiries, customerCount, deadSearches, topProducts, dailyRows, openReturns,
  ] = await Promise.all([
    db.order.count({ where: { placedAt: { gte: today } } }),
    db.order.aggregate({
      where: { placedAt: { gte: monthAgo }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.count({ where: { status: { in: ["PLACED", "CONFIRMED", "PACKED"] } } }),
    db.order.findMany({ orderBy: { placedAt: "desc" }, take: 8, include: { items: { take: 2 } } }),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.product.count({ where: { estimatedPrice: true, status: "ACTIVE" } }),
    db.variant.count({ where: { stock: 0, active: true } }),
    db.variant.count({ where: { stock: { gt: 0, lte: 5 }, active: true } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.customer.count(),
    db.searchLog.findMany({ where: { results: 0, at: { gte: monthAgo } }, orderBy: { at: "desc" }, take: 6 }),
    db.orderItem.groupBy({
      by: ["slug", "name"],
      _sum: { qty: true, price: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 6,
    }),
    db.order.findMany({
      where: { placedAt: { gte: weekAgo }, status: { not: "CANCELLED" } },
      select: { placedAt: true, total: true },
    }),
    db.returnRequest.count({ where: { status: "OPEN" } }),
  ]);

  // Seven-day revenue, bucketed here rather than in SQL so the chart and the
  // numbers beside it can never disagree about what "a day" means.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo.getTime() + i * 86400000);
    const next = new Date(d.getTime() + 86400000);
    const total = dailyRows
      .filter((o) => o.placedAt >= d && o.placedAt < next)
      .reduce((s, o) => s + o.total, 0);
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), total, date: d };
  });
  const peak = Math.max(1, ...days.map((d) => d.total));
  const weekTotal = days.reduce((s, d) => s + d.total, 0);

  const aov = revenueMonth._count ? Math.round((revenueMonth._sum.total ?? 0) / revenueMonth._count) : 0;

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`${productCount} products live · ${customerCount} customers · last 30 days`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={String(ordersToday)} href="/admin/orders" />
        <Stat label="Revenue, 30 days" value={inr(revenueMonth._sum.total ?? 0)} note={`${revenueMonth._count} orders`} />
        <Stat label="Average order" value={inr(aov)} />
        <Stat
          label="Needs action"
          value={String(openOrders)}
          note="placed, confirmed or packed"
          tone={openOrders > 0 ? "warn" : "plain"}
          href="/admin/orders?status=open"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Out of stock" value={String(outOfStock)} tone={outOfStock ? "bad" : "good"} href="/admin/inventory?filter=out" />
        <Stat label="Low stock" value={String(lowStock)} tone={lowStock ? "warn" : "plain"} href="/admin/inventory?filter=low" />
        <Stat label="Estimated prices" value={String(estimatedCount)} tone={estimatedCount ? "warn" : "good"} note="need a real price" href="/admin/pricing" />
        <Stat label="New enquiries" value={String(newEnquiries)} tone={newEnquiries ? "warn" : "plain"} href="/admin/enquiries" />
      </div>

      {openReturns > 0 && (
        <div className="mt-3">
          <Stat label="Open return requests" value={String(openReturns)} tone="bad"
            note="a customer is waiting on an answer" href="/admin/returns" />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Revenue, last 7 days" sub={`${inr(weekTotal)} in total`}>
          {weekTotal === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-ink-2">No orders in the last seven days.</p>
          ) : (
            <div className="flex h-[180px] items-end gap-2">
              {days.map((d) => (
                <div key={d.label + d.date.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold text-ink-2 tnum">
                    {d.total ? inr(d.total) : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-rex-red"
                    style={{ height: `${Math.max(2, (d.total / peak) * 130)}px` }}
                    aria-label={`${d.label}: ${inr(d.total)}`}
                  />
                  <span className="text-[11px] text-ink-3">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Best sellers" sub="By units, all time">
          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-ink-2">Nothing sold yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topProducts.map((t) => (
                <li key={t.slug} className="flex items-baseline justify-between gap-3">
                  <Link href={`/p/${t.slug}`} target="_blank" className="truncate text-[13.5px] text-ink-2 hover:text-rex-red">
                    {t.name}
                  </Link>
                  <span className="shrink-0 text-[13px] font-bold text-ink tnum">{t._sum.qty} sold</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">Latest orders</h2>
      {recentOrders.length === 0 ? (
        <Empty
          title="No orders yet"
          body="Orders placed on the shop appear here the moment they come in, with everything you need to pack and dispatch them."
        />
      ) : (
        <Table head={["Order", "Customer", "Items", "Total", "Payment", "Status", "Placed"]}>
          {recentOrders.map((o) => (
            <tr key={o.id} className="hover:bg-page">
              <td className="px-3 py-2.5">
                <Link href={`/admin/orders/${o.ref}`} className="font-bold text-ink tnum hover:text-rex-red">
                  {o.ref}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-ink-2">
                {o.name}
                <span className="block text-[12px] text-ink-3 tnum">{o.phone}</span>
              </td>
              <td className="px-3 py-2.5 text-ink-2">
                {o.items.map((i) => i.name).join(", ").slice(0, 44)}
              </td>
              <td className="px-3 py-2.5 font-bold text-ink"><Money n={o.total} /></td>
              <td className="px-3 py-2.5 uppercase text-ink-2">{o.paymentMethod}</td>
              <td className="px-3 py-2.5"><Pill value={o.status} /></td>
              <td className="px-3 py-2.5 text-ink-3 tnum">{dateShort(o.placedAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      {(deadSearches.length > 0 || draftCount > 0) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {deadSearches.length > 0 && (
            <Card title="Searches with no results" sub="What people wanted and we did not have">
              <ul className="flex flex-wrap gap-2">
                {deadSearches.map((s) => (
                  <li key={s.id} className="rounded-full border border-line-2 px-3 py-1 text-[13px] text-ink-2">
                    {s.term}
                  </li>
                ))}
              </ul>
              <Link href="/admin/insights" className="mt-3 inline-block text-[13px] font-semibold text-rex-red hover:underline">
                See all search terms →
              </Link>
            </Card>
          )}
          {draftCount > 0 && (
            <Card title="Drafts waiting" sub={`${draftCount} products are not live yet`}>
              <Link href="/admin/products?status=DRAFT" className="text-[13.5px] font-semibold text-rex-red hover:underline">
                Review drafts →
              </Link>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
