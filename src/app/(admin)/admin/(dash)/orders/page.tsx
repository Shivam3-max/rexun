import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Table, Pill, Money, dateShort, Empty, Stat } from "@/components/admin/ui";
import { OrderFilters } from "./OrderFilters";

export const metadata = { title: "Orders" };

const OPEN = ["PLACED", "CONFIRMED", "PACKED"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; payment?: string }>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.status === "open") where.status = { in: OPEN };
  else if (sp.status) where.status = sp.status;
  if (sp.payment) where.paymentMethod = sp.payment;
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [{ ref: { contains: q } }, { phone: { contains: q } }, { name: { contains: q } }];
  }

  const [orders, counts, revenue] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: 100,
      include: { items: { select: { name: true, qty: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true } }),
  ]);

  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const openCount = OPEN.reduce((sum, s) => sum + count(s), 0);

  return (
    <>
      <PageHead title="Orders" sub={`${orders.length} shown · newest first`} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Needs action" value={String(openCount)} tone={openCount ? "warn" : "good"} href="/admin/orders?status=open" />
        <Stat label="Shipped" value={String(count("SHIPPED"))} href="/admin/orders?status=SHIPPED" />
        <Stat label="Delivered" value={String(count("DELIVERED"))} tone="good" href="/admin/orders?status=DELIVERED" />
        <Stat label="Revenue, all time" value={`₹${(revenue._sum.total ?? 0).toLocaleString("en-IN")}`} />
      </div>

      <OrderFilters current={{ status: sp.status ?? "", q: sp.q ?? "", payment: sp.payment ?? "" }} />

      {orders.length === 0 ? (
        <Empty title="No orders match" body="Try clearing the filters, or search by order number, name or phone." />
      ) : (
        <Table head={["Order", "Customer", "Items", "Total", "Payment", "Status", "Placed"]}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-page">
              <td className="px-3 py-2.5">
                <Link href={`/admin/orders/${o.ref}`} className="font-bold text-ink tnum hover:text-rex-red">
                  {o.ref}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-ink-2">
                {o.name}
                <span className="block text-[12px] text-ink-3 tnum">{o.phone} · {o.city} {o.pincode}</span>
              </td>
              <td className="px-3 py-2.5 text-ink-2">
                {o.items.reduce((s, i) => s + i.qty, 0)} item{o.items.reduce((s, i) => s + i.qty, 0) === 1 ? "" : "s"}
                <span className="block truncate text-[12px] text-ink-3">
                  {o.items.map((i) => i.name).join(", ").slice(0, 40)}
                </span>
              </td>
              <td className="px-3 py-2.5 font-bold text-ink"><Money n={o.total} /></td>
              <td className="px-3 py-2.5">
                <span className="uppercase text-ink-2">{o.paymentMethod}</span>
                <span className="mt-0.5 block"><Pill value={o.paymentStatus} /></span>
              </td>
              <td className="px-3 py-2.5"><Pill value={o.status} /></td>
              <td className="px-3 py-2.5 text-ink-3 tnum">{dateShort(o.placedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="h-10" />
    </>
  );
}
