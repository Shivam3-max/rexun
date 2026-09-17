"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Placeholder } from "./Placeholder";
import {
  inr, discountPct, yearlyCost, showsRunningCost, deliveryEstimate,
  type ShippingRules,
} from "@/lib/pricing";
import type { Product, Variant } from "@/lib/types";

/**
 * Gallery + variant pickers + delivery + add to cart, as one client island.
 * They belong together because every one of them changes what the others say:
 * picking a finish changes the photo, the price and the SKU that goes in the
 * cart, and the pincode changes the date printed above the button.
 */
export function BuyBox({
  p,
  shipping,
  running,
}: {
  p: Product;
  shipping: ShippingRules;
  running: { hoursPerDay: number; ratePerUnit: number };
}) {
  const [choice, setChoice] = useState<Record<string, string>>(() => {
    const first = p.variants.find((v) => v.inStock) ?? p.variants[0];
    return { ...first.attrs };
  });
  const [pincode, setPincode] = useState("");
  const [added, setAdded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const { add } = useCart();

  // The chosen combination may not exist (a finish sold only in one size), so
  // fall back to the closest variant rather than showing a dead end.
  const variant: Variant = useMemo(() => {
    const exact = p.variants.find((v) => p.options.every((o) => v.attrs[o.key] === choice[o.key]));
    if (exact) return exact;
    return [...p.variants]
      .map((v) => ({ v, hits: p.options.filter((o) => v.attrs[o.key] === choice[o.key]).length }))
      .sort((a, b) => b.hits - a.hits)[0].v;
  }, [choice, p]);

  const available = (key: string, value: string) =>
    p.variants.some((v) => {
      if (v.attrs[key] !== value) return false;
      return p.options.every((o) => o.key === key || v.attrs[o.key] === choice[o.key]);
    });

  const gallery = variant.image
    ? [variant.image, ...p.images.filter((i) => i !== variant.image)]
    : p.images;
  const hero = gallery[Math.min(imgIndex, gallery.length - 1)];

  const off = discountPct(variant.mrp, variant.price);
  const watts = Number(variant.attrs.wattage?.replace(/[^\d.]/g, "")) || p.wattage;
  const showRunning = watts && showsRunningCost(p.dept);
  const delivery = deliveryEstimate(pincode, shipping);
  const lowStock = variant.inStock && variant.stock <= 5;

  const onAdd = () => {
    add({
      slug: p.slug,
      sku: variant.sku,
      name: p.name,
      brand: p.brand,
      attrs: variant.attrs,
      image: variant.image ?? p.images[0] ?? null,
      price: variant.price,
      mrp: variant.mrp,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <div className="overflow-hidden rounded-card border border-line bg-white">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={p.name} className="aspect-square w-full object-contain p-6" />
          ) : (
            <Placeholder label="Product photo" ratio="1 / 1" className="border-0" />
          )}
        </div>
        {gallery.length > 1 && (
          <div className="rail mt-3 flex gap-2 overflow-x-auto">
            {gallery.slice(0, 6).map((g, i) => (
              <button
                key={g}
                type="button"
                onClick={() => setImgIndex(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded border bg-white ${
                  i === imgIndex ? "border-rex-red" : "border-line"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g} alt="" className="h-full w-full object-contain p-1.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Link
            href={`/brands/${p.brand.toLowerCase()}`}
            className="text-[12px] font-bold uppercase tracking-wider text-rex-red hover:underline"
          >
            {p.brand}
          </Link>
          {p.own && (
            <span className="rounded bg-rex-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Our own brand
            </span>
          )}
        </div>

        <h1 className="mt-1 text-[24px] font-bold leading-tight text-ink sm:text-[28px]">{p.name}</h1>
        {p.tagline && <p className="mt-1.5 text-[15px] text-ink-2">{p.tagline}</p>}

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[30px] font-bold text-ink tnum">{inr(variant.price)}</span>
          {off > 0 && (
            <>
              <span className="text-[16px] text-ink-3 line-through tnum">{inr(variant.mrp)}</span>
              <span className="rounded bg-save-tint px-2 py-0.5 text-[13px] font-bold text-save tnum">
                {off}% off
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-[12.5px] text-ink-3">Inclusive of all taxes</p>

        {p.options.map((o) => (
          <fieldset key={o.key} className="mt-5">
            <legend className="text-[13px] font-bold text-ink">
              {o.label}: <span className="font-medium text-ink-2">{choice[o.key] ?? "—"}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {o.values.map((v) => {
                const ok = available(o.key, v);
                const on = choice[o.key] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setChoice((c) => ({ ...c, [o.key]: v }))}
                    className={`rounded border px-3 py-1.5 text-[13px] font-semibold transition ${
                      on
                        ? "border-rex-red bg-rex-red-tint text-rex-red"
                        : ok
                          ? "border-line-2 bg-card text-ink hover:border-ink-3"
                          : "border-line bg-page text-ink-3 line-through"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="mt-6 rounded-card border border-line bg-card p-4">
          <label htmlFor="pin" className="text-[13px] font-bold text-ink">Delivery &amp; installation</label>
          <div className="mt-2 flex gap-2">
            <input
              id="pin"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit pincode"
              className="w-full rounded border border-line-2 px-3 py-2 text-[14px] outline-none focus:border-rex-red"
            />
          </div>
          {delivery ? (
            <p className="mt-2 text-[13.5px] text-ink-2">
              <span className="font-bold text-save">Arrives {delivery.date}</span> · {delivery.zone} ·{" "}
              {delivery.cod ? "Cash on delivery available" : "Prepaid only"}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-3">
              Free delivery over {inr(shipping.freeOver)}. Enter a pincode for the exact date.
            </p>
          )}
        </div>

        {lowStock && (
          <p className="mt-3 text-[13.5px] font-semibold text-rex-red tnum">
            Only {variant.stock} left in this option
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onAdd}
            disabled={!variant.inStock}
            className="flex-1 rounded bg-rex-red px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-rex-red-dark disabled:cursor-not-allowed disabled:bg-ink-3"
          >
            {!variant.inStock ? "Out of stock" : added ? "Added to cart ✓" : "Add to cart"}
          </button>
          <Link
            href="/cart"
            className="grid place-items-center rounded border border-ink px-5 py-3.5 text-[15px] font-bold text-ink hover:bg-ink hover:text-white"
          >
            Go to cart
          </Link>
        </div>

        <ul className="mt-4 grid gap-2 text-[13.5px] text-ink-2">
          {p.warranty && (
            <li className="flex gap-2"><span aria-hidden="true" className="text-save">✓</span>{p.warranty}</li>
          )}
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-save">✓</span>
            {p.own ? "Serviced by our own team" : `Sold as an authorised ${p.brand} dealer`}
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-save">✓</span>7-day replacement if it arrives damaged
          </li>
        </ul>

        {showRunning && (
          <div className="mt-5 rounded-card border border-rex-gold/40 bg-rex-gold-tint p-4">
            <p className="text-[13px] font-bold text-ink">
              Costs about <span className="tnum">{inr(yearlyCost(watts as number, running))}</span> a year to run
            </p>
            <p className="mt-1 text-[12.5px] text-ink-2 tnum">
              {watts} W · {running.hoursPerDay} hours a day · ₹{running.ratePerUnit} per unit
            </p>
          </div>
        )}

        <p className="mt-4 text-[12px] text-ink-3">
          Item code {variant.sku}
          {p.skuCount > 1 ? ` · ${p.skuCount} variants available` : ""}
        </p>
      </div>
    </div>
  );
}
