"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { placeOrder, checkCoupon, confirmPayment, abandonPayment } from "@/app/actions/shop";
import { openRazorpay, PreloadRazorpay } from "@/components/RazorpayCheckout";
import { inr, shippingFor, deliveryEstimate, type ShippingRules } from "@/lib/pricing";

const ALL_PAYMENTS = [
  { id: "upi", label: "UPI", note: "GPay, PhonePe, Paytm — pay in seconds" },
  { id: "card", label: "Card", note: "Credit or debit" },
  { id: "netbanking", label: "Net banking", note: "All major banks" },
  { id: "cod", label: "Cash on delivery", note: "Pay the delivery agent" },
];

type Prefill = {
  name: string; phone: string; address: string; city: string; state: string; pincode: string;
} | null;

/**
 * One page, no steps. Name, phone, address, pay — in that order, because that
 * is the order a person can answer them. Account creation is offered on the
 * confirmation screen instead of standing in front of the order.
 */
export function CheckoutForm({
  shipping: rules,
  methods,
  prefill,
  signedIn,
  gatewayLive,
}: {
  shipping: ShippingRules;
  methods: Record<string, boolean>;
  prefill: Prefill;
  signedIn: boolean;
  gatewayLive: boolean;
}) {
  const { lines, subtotal, savings, clear, ready } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: prefill?.name ?? "",
    phone: prefill?.phone ?? "",
    email: "",
    address: prefill?.address ?? "",
    city: prefill?.city ?? "",
    state: prefill?.state ?? "",
    pincode: prefill?.pincode ?? "",
  });
  const [pay, setPay] = useState("upi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saveAddress, setSaveAddress] = useState(signedIn);

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [couponError, setCouponError] = useState("");

  const payments = ALL_PAYMENTS.filter((m) => methods[m.id] !== false);
  const discount = coupon?.discount ?? 0;
  const ship = shippingFor(subtotal - discount, rules);
  const total = subtotal - discount + ship;
  const delivery = deliveryEstimate(form.pincode, rules);
  const codBlocked = total > rules.codLimit;

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setFormError("");
  };

  const applyCoupon = () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError("");
    startTransition(async () => {
      const res = await checkCoupon(code, subtotal);
      if (res.ok) {
        setCoupon({ code: res.code, discount: res.discount, description: res.description });
        setCouponError("");
      } else {
        setCoupon(null);
        setCouponError(res.error);
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter the name for the delivery";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, ""))) next.phone = "Enter a 10-digit mobile number";
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = "Enter a 6-digit pincode";
    if (form.address.trim().length < 8) next.address = "Enter the full address, including house number";
    if (!form.city.trim()) next.city = "Enter your city";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }

    startTransition(async () => {
      const res = await placeOrder({
        lines,
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        paymentMethod: pay,
        couponCode: coupon?.code,
        saveAddress,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }

      // The order exists either way. If the gateway handed us a payment
      // session, open it; if the customer closes the sheet the order is still
      // there, waiting to be paid or collected on delivery.
      if (res.pay) {
        clear();
        try {
          await openRazorpay({
            ...res.pay,
            ref: res.ref,
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            onPaid: async (r) => {
              await confirmPayment({
                ref: res.ref,
                gatewayPaymentId: r.paymentId,
                gatewayOrderId: r.orderId,
                signature: r.signature,
              });
              router.push(`/order/${res.ref}`);
            },
            onDismiss: () => {
              void abandonPayment(res.ref);
              router.push(`/order/${res.ref}`);
            },
          });
        } catch {
          router.push(`/order/${res.ref}`);
        }
        return;
      }

      clear();
      router.push(`/order/${res.ref}`);
    });
  };

  if (!ready) return <div className="mx-auto max-w-[1000px] px-4 py-16 text-ink-3">Loading…</div>;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <h1 className="text-[22px] font-bold text-ink">There is nothing to check out</h1>
        <Link href="/" className="mt-5 inline-block rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1000px] px-4 py-6">
      <PreloadRazorpay enabled={gatewayLive && pay !== "cod"} />
      <h1 className="text-[24px] font-bold text-ink sm:text-[28px]">Checkout</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {signedIn ? "Signed in — your details are filled in." : "No account needed. We only ask for what the courier needs."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-card border border-line bg-card p-4 sm:p-5">
            <h2 className="text-[16px] font-bold text-ink">Where should it go?</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Full name" value={form.name} onChange={set} error={errors.name} />
              <Field id="phone" label="Mobile number" value={form.phone} onChange={set} error={errors.phone}
                inputMode="numeric" maxLength={10} hint="For delivery updates on WhatsApp" />
              <Field id="pincode" label="Pincode" value={form.pincode} onChange={set} error={errors.pincode}
                inputMode="numeric" maxLength={6} />
              <Field id="city" label="City" value={form.city} onChange={set} error={errors.city} />
              <div className="sm:col-span-2">
                <Field id="address" label="Address" value={form.address} onChange={set} error={errors.address}
                  textarea hint="House / flat number, street, landmark" />
              </div>
              <Field id="email" label="Email (optional)" value={form.email} onChange={set} hint="For the invoice" />
            </div>
            {delivery && (
              <p className="mt-3 rounded border border-save/30 bg-save-tint px-3 py-2 text-[13.5px] font-semibold text-save">
                Arrives {delivery.date} · {delivery.zone}
              </p>
            )}
            {signedIn && (
              <label className="mt-3 flex items-center gap-2 text-[13.5px] text-ink-2">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)}
                  className="h-4 w-4 accent-[#d01c22]" />
                Save this address for next time
              </label>
            )}
          </section>

          <section className="rounded-card border border-line bg-card p-4 sm:p-5">
            <h2 className="text-[16px] font-bold text-ink">How would you like to pay?</h2>
            <div className="mt-3 grid gap-2">
              {payments.map((m) => {
                const disabled =
                  m.id === "cod" && ((delivery !== null && !delivery.cod) || codBlocked);
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                      pay === m.id ? "border-rex-red bg-rex-red-tint" : "border-line-2 bg-card"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input type="radio" name="pay" value={m.id} checked={pay === m.id} disabled={disabled}
                      onChange={() => setPay(m.id)} className="mt-0.5 h-4 w-4 accent-[#d01c22]" />
                    <span>
                      <span className="block text-[14.5px] font-bold text-ink">{m.label}</span>
                      <span className="block text-[12.5px] text-ink-2">
                        {disabled
                          ? codBlocked
                            ? `Not available over ${inr(rules.codLimit)}`
                            : "Not available for this pincode"
                          : m.note}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {!gatewayLive && pay !== "cod" && (
              <p className="mt-3 rounded border border-rex-gold/40 bg-rex-gold-tint px-3 py-2 text-[13px] text-ink">
                Online payment is being set up. Place the order and we will call you to collect
                payment — or choose cash on delivery and pay the delivery agent.
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-card border border-line bg-card p-4">
            <h2 className="text-[16px] font-bold text-ink">Order summary</h2>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              {lines.map((l) => (
                <li key={l.sku} className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {l.name} <span className="text-ink-3 tnum">× {l.qty}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink tnum">{inr(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-line pt-3">
              {coupon ? (
                <div className="flex items-center justify-between rounded border border-save/40 bg-save-tint px-3 py-2">
                  <span className="text-[13px] font-bold text-save">{coupon.code} applied</span>
                  <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }}
                    className="text-[12.5px] font-semibold text-ink-2 hover:text-rex-red">
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="coupon" className="text-[12.5px] font-bold text-ink">Have a coupon?</label>
                  <div className="mt-1 flex gap-2">
                    <input id="coupon" value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Enter code"
                      className="w-full rounded border border-line-2 px-3 py-2 text-[13.5px] uppercase outline-none focus:border-rex-red" />
                    <button type="button" onClick={applyCoupon} disabled={pending}
                      className="shrink-0 rounded border border-ink px-3 py-2 text-[13px] font-bold text-ink hover:bg-ink hover:text-white disabled:opacity-50">
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="mt-1 text-[12.5px] font-semibold text-rex-red">{couponError}</p>}
                </>
              )}
            </div>

            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[14px]">
              <Row label="Items" value={inr(subtotal)} />
              {discount > 0 && <Row label={`Coupon ${coupon?.code}`} value={`− ${inr(discount)}`} good />}
              <Row label="Delivery" value={ship ? inr(ship) : "Free"} good={ship === 0} />
              {savings > 0 && <Row label="You save" value={`− ${inr(savings)}`} good />}
              <div className="flex justify-between border-t border-line pt-2.5 text-[18px] font-bold text-ink">
                <dt>Total</dt>
                <dd className="tnum">{inr(total)}</dd>
              </div>
            </dl>

            {formError && (
              <p className="mt-3 rounded border border-rex-red/40 bg-rex-red-tint px-3 py-2 text-[13px] font-semibold text-rex-red">
                {formError}
              </p>
            )}

            <button type="submit" disabled={pending}
              className="mt-4 w-full rounded bg-rex-red py-3 text-[15px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Placing order…" : pay === "cod" ? "Place order" : `Pay ${inr(total)}`}
            </button>
            <p className="mt-2.5 text-center text-[12px] text-ink-3">
              The price you see is the price you pay. No charges added later.
            </p>
          </div>
        </aside>
      </div>
    </form>
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

function Field({
  id, label, value, onChange, error, hint, textarea, ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (k: string, v: string) => void;
  error?: string;
  hint?: string;
  textarea?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  const cls = `mt-1 w-full rounded border px-3 py-2.5 text-[14.5px] outline-none ${
    error ? "border-rex-red" : "border-line-2 focus:border-rex-red"
  }`;
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold text-ink">{label}</label>
      {textarea ? (
        <textarea id={id} rows={3} value={value} onChange={(e) => onChange(id, e.target.value)} className={cls} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(id, e.target.value)} className={cls} {...rest} />
      )}
      {error ? (
        <p className="mt-1 text-[12.5px] font-semibold text-rex-red">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
