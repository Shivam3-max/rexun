"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { lookupOrders } from "@/app/actions/shop";
import { OrderStatusTrail } from "@/components/OrderStatusTrail";
import { inr } from "@/lib/pricing";

type Found = Awaited<ReturnType<typeof lookupOrders>>;

/**
 * Order tracking with no login: the mobile number used to order is the key.
 * Someone who wants a password-protected view can create an account, but they
 * are never made to in order to find out where their fan is.
 */
export default function TrackPage() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Found | null>(null);
  const [pending, startTransition] = useTransition();
  const valid = /^[6-9]\d{9}$/.test(phone);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    startTransition(async () => setResult(await lookupOrders(phone)));
  };

  return (
    <div className="mx-auto max-w-[680px] px-4 py-12">
      <h1 className="text-[26px] font-bold text-ink">Track your order</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Enter the mobile number you ordered with. No password needed.
      </p>

      <form onSubmit={submit} className="mt-6 rounded-card border border-line bg-card p-5">
        <label htmlFor="track-phone" className="text-[13px] font-bold text-ink">Mobile number</label>
        <input
          id="track-phone"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setResult(null); }}
          placeholder="10-digit number"
          className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[15px] outline-none focus:border-rex-red"
        />
        <button
          type="submit"
          disabled={!valid || pending}
          className="mt-3 w-full rounded bg-rex-red py-3 text-[15px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-50"
        >
          {pending ? "Looking…" : "Find my orders"}
        </button>
      </form>

      {result?.ok && result.orders.length === 0 && (
        <p className="mt-4 rounded-card border border-line bg-card px-4 py-5 text-[14px] text-ink-2">
          No orders found for that number. Check the number, or{" "}
          <Link href="/contact" className="font-semibold text-rex-red hover:underline">contact us</Link>{" "}
          with your order reference.
        </p>
      )}

      {result?.ok && result.orders.length > 0 && (
        <div className="mt-6 space-y-4">
          {result.orders.map((o) => (
            <article key={o.ref} className="overflow-hidden rounded-card border border-line bg-card">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <p className="text-[15px] font-bold text-ink tnum">{o.ref}</p>
                  <p className="text-[12.5px] text-ink-3">
                    {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <p className="text-[15px] font-bold text-ink tnum">{inr(o.total)}</p>
              </header>

              <div className="px-4 py-4">
                <OrderStatusTrail status={o.status} events={o.events} />
              </div>

              {o.trackingNumber && (
                <p className="border-t border-line px-4 py-2.5 text-[13.5px] text-ink-2">
                  {o.courier ?? "Courier"} · tracking{" "}
                  <span className="font-semibold text-ink tnum">{o.trackingNumber}</span>
                </p>
              )}

              <ul className="divide-y divide-line border-t border-line">
                {o.items.map((i) => (
                  <li key={i.name} className="flex items-center gap-3 px-4 py-2.5">
                    {i.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" className="h-10 w-10 shrink-0 rounded border border-line bg-white object-contain p-1" />
                    )}
                    <span className="flex-1 text-[13.5px] text-ink-2">
                      {i.name} <span className="text-ink-3 tnum">× {i.qty}</span>
                    </span>
                    <span className="text-[13.5px] font-semibold text-ink tnum">{inr(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {result && !result.ok && (
        <p className="mt-4 text-[13.5px] font-semibold text-rex-red">{result.error}</p>
      )}
    </div>
  );
}
