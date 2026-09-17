import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Pill, Money, dateLong } from "@/components/admin/ui";
import { OrderActions } from "./OrderActions";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const order = await db.order.findUnique({
    where: { ref },
    include: { items: true, events: { orderBy: { at: "desc" } }, customer: true },
  });
  if (!order) notFound();

  const history = order.customerId
    ? await db.order.count({ where: { customerId: order.customerId } })
    : 1;

  return (
    <>
      <Link href="/admin/orders" className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">← Orders</Link>

      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-ink tnum">{order.ref}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2">
            <Pill value={order.status} />
            <Pill value={order.paymentStatus} />
            <span className="uppercase">{order.paymentMethod}</span>
            <span>·</span>
            <span>{dateLong(order.placedAt)}</span>
          </p>
        </div>
        <p className="text-[26px] font-bold text-ink tnum"><Money n={order.total} /></p>
      </div>

      {order.gatewayError && (
        <p className="mb-4 rounded-card border border-rex-gold/40 bg-rex-gold-tint px-4 py-2.5 text-[13.5px] text-ink">
          Payment note: {order.gatewayError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card title={`Items (${order.items.reduce((s, i) => s + i.qty, 0)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="h-12 w-12 shrink-0 rounded border border-line bg-white object-contain p-1" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded border border-line bg-page text-[9px] text-ink-3">
                      no img
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <Link href={`/p/${i.slug}`} target="_blank" className="block truncate text-[14px] font-semibold text-ink hover:text-rex-red">
                      {i.name}
                    </Link>
                    <span className="block text-[12px] text-ink-3 tnum">
                      {i.sku}
                      {(() => {
                        try {
                          const a = Object.values(JSON.parse(i.attrs) as Record<string, string>).filter(Boolean);
                          return a.length ? ` · ${a.join(" · ")}` : "";
                        } catch { return ""; }
                      })()}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[13.5px]">
                    <span className="block text-ink-2 tnum">{i.qty} × <Money n={i.price} /></span>
                    <span className="block font-bold text-ink"><Money n={i.price * i.qty} /></span>
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13.5px]">
              <Row label="Items" value={<Money n={order.subtotal} />} />
              {order.discount > 0 && (
                <Row label={`Coupon ${order.couponCode ?? ""}`} value={<span className="text-save">− <Money n={order.discount} /></span>} />
              )}
              <Row label="Delivery" value={order.shipping ? <Money n={order.shipping} /> : <span className="text-save">Free</span>} />
              <div className="flex justify-between border-t border-line pt-2 text-[16px] font-bold text-ink">
                <dt>Total</dt>
                <dd><Money n={order.total} /></dd>
              </div>
            </dl>
          </Card>

          <Card title="History">
            <ol className="space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rex-red" aria-hidden="true" />
                  <span>
                    <span className="block text-[13.5px] font-bold text-ink">{e.status.toLowerCase()}</span>
                    {e.note && <span className="block text-[13px] text-ink-2">{e.note}</span>}
                    <span className="block text-[12px] text-ink-3 tnum">{dateLong(e.at)} · {e.actor}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <OrderActions
            order={{
              ref: order.ref,
              status: order.status,
              paymentStatus: order.paymentStatus,
              courier: order.courier ?? "",
              trackingNumber: order.trackingNumber ?? "",
              notes: order.notes ?? "",
              invoiceNo: order.invoiceNo,
              gatewayPaymentId: order.gatewayPaymentId,
              total: order.total,
            }}
          />

          <Card title="Deliver to">
            <p className="text-[14px] leading-relaxed text-ink-2">
              <span className="font-bold text-ink">{order.name}</span><br />
              {order.address}<br />
              {order.city} {order.state && `, ${order.state}`} {order.pincode}<br />
              <span className="tnum">{order.phone}</span>
              {order.email && <><br />{order.email}</>}
            </p>
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-3">
              {history > 1 ? `Repeat customer — ${history} orders` : "First order"}
              {order.customerId && (
                <>
                  {" · "}
                  <Link href={`/admin/customers/${order.customerId}`} className="font-semibold text-rex-red hover:underline">
                    Customer record
                  </Link>
                </>
              )}
            </p>
          </Card>
        </div>
      </div>
      <div className="h-10" />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold text-ink tnum">{value}</dd>
    </div>
  );
}
