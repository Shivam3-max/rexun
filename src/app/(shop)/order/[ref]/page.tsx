import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { inr, deliveryEstimate } from "@/lib/pricing";
import { getShippingRules, getStoreSettings } from "@/lib/store";
import { OrderStatusTrail } from "@/components/OrderStatusTrail";
import { AfterSales } from "./AfterSales";

export const metadata = { title: "Order confirmed" };

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const order = await db.order.findUnique({
    where: { ref },
    include: { items: true, events: { orderBy: { at: "asc" } }, returns: true },
  });
  if (!order) notFound();

  const [rules, store, customer] = await Promise.all([
    getShippingRules(),
    getStoreSettings(),
    getCustomer(),
  ]);
  const delivery = deliveryEstimate(order.pincode, rules);

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10">
      <div className="rounded-card border border-line bg-card p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-save-tint text-[22px] text-save" aria-hidden="true">✓</div>
        <h1 className="mt-4 text-[24px] font-bold text-ink">Order placed</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">
          Order number <span className="font-bold text-ink tnum">{order.ref}</span>
        </p>
        {delivery && order.status !== "CANCELLED" && (
          <p className="mt-1 text-[14.5px] font-semibold text-save">Arriving {delivery.date}</p>
        )}
        <p className="mt-3 text-[13.5px] text-ink-2">
          We will send updates to {order.phone} on WhatsApp at dispatch and delivery.
        </p>
        {order.paymentMethod !== "cod" && (
          <p className="mt-3 rounded border border-rex-gold/40 bg-rex-gold-tint px-3 py-2 text-[13px] text-ink">
            Online payment is being set up. We will call you on {order.phone} to collect payment,
            or you can pay the delivery agent instead.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-card border border-line bg-card p-5">
        <h2 className="text-[15px] font-bold text-ink">Progress</h2>
        <div className="mt-3">
          <OrderStatusTrail status={order.status} events={order.events.map((e) => ({
            status: e.status, note: e.note, at: e.at.toISOString(),
          }))} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-card">
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              {i.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt="" className="h-12 w-12 shrink-0 rounded border border-line bg-white object-contain p-1" />
              )}
              <span className="min-w-0 flex-1 text-[14px] text-ink-2">
                <Link href={`/p/${i.slug}`} className="font-semibold text-ink hover:text-rex-red">{i.name}</Link>
                <span className="block text-[12.5px] text-ink-3 tnum">Qty {i.qty}</span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold text-ink tnum">{inr(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line px-4 py-3 text-[14px]">
          <div className="flex justify-between"><dt className="text-ink-2">Items</dt><dd className="tnum">{inr(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between"><dt className="text-ink-2">Coupon {order.couponCode}</dt><dd className="font-semibold text-save tnum">− {inr(order.discount)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-ink-2">Delivery</dt><dd className="tnum">{order.shipping ? inr(order.shipping) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-bold text-ink">
            <dt>Total</dt><dd className="tnum">{inr(order.total)}</dd>
          </div>
        </dl>
      </div>

      <AfterSales
        orderRef={order.ref}
        phone={order.phone}
        status={order.status}
        items={order.items.map((i) => ({ sku: i.sku, name: i.name }))}
        openReturns={order.returns.map((r) => ({
          sku: r.sku, type: r.type, status: r.status, resolution: r.resolution,
        }))}
      />

      <div className="mt-4 rounded-card border border-line bg-card p-4">
        <h2 className="text-[15px] font-bold text-ink">Delivering to</h2>
        <p className="mt-1.5 text-[14px] text-ink-2">
          {order.name}<br />{order.address}<br />{order.city} {order.pincode}<br />{order.phone}
        </p>
      </div>

      <div className="mt-4 rounded-card border border-line bg-card p-4">
        <h2 className="text-[15px] font-bold text-ink">Keep this order number</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          {customer
            ? "It is saved to your account — open Your orders any time."
            : "Track it any time with your mobile number — no password, no account."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/track" className="rounded bg-ink px-4 py-2.5 text-[14px] font-bold text-white hover:bg-black">Track this order</Link>
          {order.invoiceNo && (
            <Link href={`/order/${order.ref}/invoice`} className="rounded border border-ink px-4 py-2.5 text-[14px] font-bold text-ink hover:bg-ink hover:text-white">
              Download invoice
            </Link>
          )}
          {!customer && (
            <Link href="/account/register" className="rounded border border-ink px-4 py-2.5 text-[14px] font-bold text-ink hover:bg-ink hover:text-white">
              Create an account
            </Link>
          )}
          <Link href="/" className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink hover:border-ink">Continue shopping</Link>
        </div>
        {store.phone && (
          <p className="mt-3 text-[12.5px] text-ink-3">Questions? Call {store.phone} — {store.hours}</p>
        )}
      </div>
    </div>
  );
}
