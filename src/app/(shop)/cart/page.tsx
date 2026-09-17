"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { Placeholder } from "@/components/Placeholder";
import { inr, shippingFor, SHIPPING_DEFAULTS } from "@/lib/pricing";

export default function CartPage() {
  const { lines, subtotal, savings, setQty, remove, ready } = useCart();
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const toFree = SHIPPING_DEFAULTS.freeOver - subtotal;

  if (!ready) return <div className="mx-auto max-w-[1240px] px-4 py-16 text-ink-3">Loading your cart…</div>;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <h1 className="text-[24px] font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-[15px] text-ink-2">Start with a ceiling fan, or a bulb to top up an order.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/c/ceiling-fans" className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark">
            Browse fans
          </Link>
          <Link href="/d/lighting" className="rounded border border-ink px-4 py-2.5 text-[14px] font-bold text-ink hover:bg-ink hover:text-white">
            Browse lighting
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6">
      <h1 className="text-[24px] font-bold text-ink sm:text-[28px]">
        Your cart <span className="text-[16px] font-medium text-ink-3 tnum">({lines.length})</span>
      </h1>

      {toFree > 0 && (
        <p className="mt-3 rounded-card border border-rex-gold/40 bg-rex-gold-tint px-4 py-2.5 text-[13.5px] text-ink">
          Add <span className="font-bold tnum">{inr(toFree)}</span> more for free delivery.
        </p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {lines.map((l) => (
            <li key={l.sku} className="flex gap-4 p-4">
              <Link href={`/p/${l.slug}`} className="shrink-0">
                {l.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="h-[86px] w-[86px] rounded border border-line bg-white object-contain p-1.5" />
                ) : (
                  <Placeholder label="Photo" ratio="1 / 1" className="h-[86px] w-[86px] rounded" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/p/${l.slug}`} className="text-[14.5px] font-bold text-ink hover:text-rex-red">
                  {l.name}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {Object.values(l.attrs).filter(Boolean).join(" · ") || l.brand}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded border border-line-2">
                    <button type="button" onClick={() => setQty(l.sku, l.qty - 1)} aria-label="Reduce quantity"
                      className="px-2.5 py-1 text-[16px] leading-none text-ink-2 hover:text-ink">−</button>
                    <span className="min-w-7 text-center text-[14px] font-semibold tnum">{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.sku, l.qty + 1)} aria-label="Increase quantity"
                      className="px-2.5 py-1 text-[16px] leading-none text-ink-2 hover:text-ink">+</button>
                  </div>
                  <button type="button" onClick={() => remove(l.sku)} className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">
                    Remove
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[15px] font-bold text-ink tnum">{inr(l.price * l.qty)}</p>
                {l.mrp > l.price && (
                  <p className="text-[12px] text-ink-3 line-through tnum">{inr(l.mrp * l.qty)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-card border border-line bg-card p-4">
            <h2 className="text-[16px] font-bold text-ink">Order summary</h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <Row label={`Items (${lines.reduce((s, l) => s + l.qty, 0)})`} value={inr(subtotal)} />
              <Row label="Delivery" value={shipping === 0 ? "Free" : inr(shipping)} good={shipping === 0} />
              {savings > 0 && <Row label="You save" value={`− ${inr(savings)}`} good />}
              <div className="flex justify-between border-t border-line pt-2.5 text-[17px] font-bold text-ink">
                <dt>Total</dt>
                <dd className="tnum">{inr(total)}</dd>
              </div>
            </dl>
            <Link href="/checkout" className="mt-4 block rounded bg-rex-red py-3 text-center text-[15px] font-bold text-white hover:bg-rex-red-dark">
              Proceed to checkout
            </Link>
            <p className="mt-2.5 text-center text-[12px] text-ink-3">
              Coupons apply at checkout · UPI, cards or cash on delivery
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className={`tnum ${good ? "font-semibold text-save" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
