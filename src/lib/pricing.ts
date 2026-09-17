import type { Product } from "./types";

/**
 * Pure price/format helpers. Deliberately free of any database import so
 * client components (cards, cart, buy box) can use the same arithmetic the
 * server uses — there is only ever one definition of "what does this cost".
 */

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const priceRange = (lo: number, hi: number) =>
  lo === hi ? inr(lo) : `${inr(lo)} – ${inr(hi)}`;

export const discountPct = (mrp: number, price: number) =>
  mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const productDiscount = (p: Product) => discountPct(p.mrp, p.price);

/** Default running-cost assumptions; the admin panel can change both. */
export const RUNNING_DEFAULTS = { hoursPerDay: 8, ratePerUnit: 8 };

export const yearlyCost = (
  watts: number,
  opts: { hoursPerDay: number; ratePerUnit: number } = RUNNING_DEFAULTS
) => Math.round((watts / 1000) * opts.hoursPerDay * 365 * opts.ratePerUnit);

/** Running cost is only meaningful where something is left switched on. */
export const showsRunningCost = (dept: string) => dept === "fans" || dept === "lighting";

export type ShippingRules = {
  freeOver: number;
  flatRate: number;
  codLimit: number;
  tricityDays: number;
  northDays: number;
  restDays: number;
};

export const SHIPPING_DEFAULTS: ShippingRules = {
  freeOver: 999,
  flatRate: 79,
  codLimit: 15000,
  tricityDays: 2,
  northDays: 4,
  restDays: 6,
};

export const shippingFor = (subtotal: number, rules: ShippingRules = SHIPPING_DEFAULTS) =>
  subtotal >= rules.freeOver || subtotal === 0 ? 0 : rules.flatRate;

/**
 * Delivery promise from a pincode. Swapping in a courier's serviceability API
 * later means replacing this one function — product page, checkout and the
 * order confirmation all read the same answer.
 */
export function deliveryEstimate(pincode: string, rules: ShippingRules = SHIPPING_DEFAULTS) {
  const p = pincode.trim();
  if (!/^\d{6}$/.test(p)) return null;
  const tricity = /^(140|160|134)/.test(p);
  const north = /^(11|12|13|14|15|16|17|18|20|21|22|24|25|26|27|30|31|32|33|34)/.test(p);
  const days = tricity ? rules.tricityDays : north ? rules.northDays : rules.restDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return {
    days,
    date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    zone: tricity ? "Tricity" : north ? "North India" : "Rest of India",
    cod: tricity || north,
  };
}

/** Applies a coupon to a subtotal and says why, if it does not apply. */
export function couponDiscount(
  coupon: { type: string; value: number; minOrder: number; maxDiscount: number | null } | null,
  subtotal: number
): { discount: number; reason: string | null } {
  if (!coupon) return { discount: 0, reason: null };
  if (subtotal < coupon.minOrder)
    return { discount: 0, reason: `Spend ${inr(coupon.minOrder)} to use this code` };
  const raw = coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return { discount: Math.min(Math.round(capped), subtotal), reason: null };
}
