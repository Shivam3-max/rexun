"use client";

import { useEffect } from "react";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email?: string };
  theme: { color: string };
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

/**
 * Opens Razorpay's own payment sheet. The script is loaded on demand rather
 * than on every page, because the overwhelming majority of visits never reach
 * checkout and should not pay for a payment SDK.
 */
export async function openRazorpay(input: {
  keyId: string;
  gatewayOrderId: string;
  amount: number;
  ref: string;
  name: string;
  phone: string;
  email?: string;
  onPaid: (r: { paymentId: string; orderId: string; signature: string }) => void;
  onDismiss: () => void;
}) {
  if (!window.Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the payment window"));
      document.body.appendChild(s);
    });
  }
  if (!window.Razorpay) throw new Error("Could not load the payment window");

  new window.Razorpay({
    key: input.keyId,
    amount: Math.round(input.amount * 100),
    currency: "INR",
    name: "Rexsun",
    description: `Order ${input.ref}`,
    order_id: input.gatewayOrderId,
    prefill: { name: input.name, contact: input.phone, email: input.email },
    theme: { color: "#d01c22" },
    handler: (r) =>
      input.onPaid({
        paymentId: r.razorpay_payment_id,
        orderId: r.razorpay_order_id,
        signature: r.razorpay_signature,
      }),
    modal: { ondismiss: input.onDismiss },
  }).open();
}

/** Warms the SDK up while the customer is still filling in their address. */
export function PreloadRazorpay({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || window.Razorpay) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, [enabled]);
  return null;
}
