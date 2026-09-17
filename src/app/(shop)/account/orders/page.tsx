import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";
import { OrderStatusTrail } from "@/components/OrderStatusTrail";

export const metadata = { title: "Your orders" };

export default async function AccountOrdersPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");

  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { placedAt: "desc" },
    include: { items: true, events: { orderBy: { at: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8">
      <Link href="/account" className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">← Account</Link>
      <h1 className="mt-2 text-[26px] font-bold text-ink">Your orders</h1>

      {orders.length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-card px-4 py-6 text-[14.5px] text-ink-2">
          No orders yet. <Link href="/" className="font-semibold text-rex-red hover:underline">Start shopping →</Link>
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((o) => (
            <article key={o.id} className="overflow-hidden rounded-card border border-line bg-card">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <Link href={`/order/${o.ref}`} className="text-[15px] font-bold text-ink tnum hover:text-rex-red">{o.ref}</Link>
                  <p className="text-[12.5px] text-ink-3">
                    {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <p className="text-[15px] font-bold text-ink tnum">{inr(o.total)}</p>
              </header>
              <div className="px-4 py-4">
                <OrderStatusTrail
                  status={o.status}
                  events={o.events.map((e) => ({ status: e.status, note: e.note, at: e.at.toISOString() }))}
                />
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {o.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                    {i.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" className="h-10 w-10 shrink-0 rounded border border-line bg-white object-contain p-1" />
                    )}
                    <Link href={`/p/${i.slug}`} className="flex-1 text-[13.5px] text-ink-2 hover:text-rex-red">
                      {i.name} <span className="text-ink-3 tnum">× {i.qty}</span>
                    </Link>
                    <span className="text-[13.5px] font-semibold text-ink tnum">{inr(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
