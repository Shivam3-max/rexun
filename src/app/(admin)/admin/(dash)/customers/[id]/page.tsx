import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Stat, Table, Pill, Money, dateShort, dateLong } from "@/components/admin/ui";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { placedAt: "desc" }, include: { items: { select: { name: true, qty: true } } } },
      addresses: true,
    },
  });
  if (!customer) notFound();

  const live = customer.orders.filter((o) => o.status !== "CANCELLED");
  const spent = live.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <Link href="/admin/customers" className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">← Customers</Link>

      <div className="mt-2 mb-5">
        <h1 className="text-[24px] font-bold text-ink">{customer.name}</h1>
        <p className="mt-1 text-[14px] text-ink-2 tnum">
          {customer.phone}{customer.email && ` · ${customer.email}`}
          {" · "}{customer.passwordHash ? "has an account" : "guest checkout only"}
          {" · joined "}{dateShort(customer.createdAt)}
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={String(live.length)} />
        <Stat label="Lifetime spend" value={`₹${spent.toLocaleString("en-IN")}`} />
        <Stat label="Average order" value={`₹${live.length ? Math.round(spent / live.length).toLocaleString("en-IN") : 0}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-2 text-[16px] font-bold text-ink">Order history</h2>
          {customer.orders.length === 0 ? (
            <p className="rounded-card border border-line bg-card px-4 py-5 text-[13.5px] text-ink-2">
              No orders yet.
            </p>
          ) : (
            <Table head={["Order", "Items", "Total", "Status", "Placed"]}>
              {customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-page">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/orders/${o.ref}`} className="font-bold text-ink tnum hover:text-rex-red">{o.ref}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">
                    {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ").slice(0, 50)}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-ink"><Money n={o.total} /></td>
                  <td className="px-3 py-2.5"><Pill value={o.status} /></td>
                  <td className="px-3 py-2.5 text-ink-3 tnum">{dateShort(o.placedAt)}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Card title={`Saved addresses (${customer.addresses.length})`}>
          {customer.addresses.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">None saved.</p>
          ) : (
            <ul className="space-y-3">
              {customer.addresses.map((a) => (
                <li key={a.id} className="text-[13.5px] text-ink-2">
                  <span className="font-bold text-ink">
                    {a.label}{a.isDefault && <span className="ml-1.5 text-[11px] uppercase tracking-wider text-save">default</span>}
                  </span>
                  <br />{a.name} · <span className="tnum">{a.phone}</span>
                  <br />{a.line1}
                  <br />{a.city} {a.pincode}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="h-10" />
    </>
  );
}
