import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

/**
 * Razorpay, talked to over plain fetch rather than their SDK — the three calls
 * a storefront needs are small, and an unconfigured store must degrade to
 * "pay on delivery, we will call you" rather than crash.
 *
 * Keys live in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET. The secret never leaves
 * the server: the browser only ever sees the key id, the gateway order id and
 * the amount, and every signature is verified here afterwards.
 */

const API = "https://api.razorpay.com/v1";

export type GatewayConfig = {
  configured: boolean;
  keyId: string | null;
  testMode: boolean;
};

export function gatewayConfig(): GatewayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || null;
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() || null;
  return {
    configured: Boolean(keyId && secret),
    keyId,
    // Razorpay's own convention: test keys are prefixed rzp_test_.
    testMode: !!keyId?.startsWith("rzp_test_"),
  };
}

const authHeader = () =>
  "Basic " +
  Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

/** Creates the gateway-side order. Amounts are in paise, hence the ×100. */
export async function createGatewayOrder(input: {
  ref: string;
  amount: number;
  name: string;
  phone: string;
  email?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = gatewayConfig();
  if (!cfg.configured) return { ok: false, error: "Online payment is not set up yet" };

  try {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: "INR",
        receipt: input.ref,
        notes: { ref: input.ref, name: input.name, phone: input.phone },
      }),
    });
    const json = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !json.id)
      return { ok: false, error: json.error?.description ?? "The payment gateway refused the order" };
    return { ok: true, id: json.id };
  } catch {
    return { ok: false, error: "Could not reach the payment gateway" };
  }
}

/**
 * Razorpay signs `order_id|payment_id` with the key secret. Comparing with
 * timingSafeEqual rather than === keeps the check constant-time.
 */
export function verifySignature(input: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Webhooks are signed over the raw body, so the caller must not re-serialise. */
export function verifyWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Refunds a captured payment, in full or in part. */
export async function refundPayment(paymentId: string, amount?: number) {
  const cfg = gatewayConfig();
  if (!cfg.configured) return { ok: false as const, error: "Online payment is not set up yet" };
  try {
    const res = await fetch(`${API}/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify(amount ? { amount: Math.round(amount * 100) } : {}),
    });
    const json = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !json.id)
      return { ok: false as const, error: json.error?.description ?? "The refund was refused" };
    return { ok: true as const, id: json.id };
  } catch {
    return { ok: false as const, error: "Could not reach the payment gateway" };
  }
}

/**
 * Marks an order paid and records the gateway's ids. Written once and called
 * from both the browser callback and the webhook, because either can arrive
 * first and both must end in the same state.
 */
export async function markPaid(ref: string, paymentId: string) {
  const order = await db.order.findUnique({ where: { ref } });
  if (!order) return { ok: false as const, error: "No such order" };
  if (order.paymentStatus === "PAID") return { ok: true as const, alreadyPaid: true };

  await db.order.update({
    where: { ref },
    data: {
      paymentStatus: "PAID",
      gatewayPaymentId: paymentId,
      gatewayError: null,
      events: { create: { status: "PAYMENT", note: `Paid online · ${paymentId}`, actor: "gateway" } },
    },
  });
  return { ok: true as const, alreadyPaid: false };
}
