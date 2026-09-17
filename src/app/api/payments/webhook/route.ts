import { NextResponse } from "next/server";
import { verifyWebhook, markPaid } from "@/lib/payments";
import { db } from "@/lib/db";

/**
 * Razorpay's server-to-server confirmation. This is the source of truth, not
 * the browser callback: a customer who pays and immediately closes the tab
 * still gets their order marked paid.
 *
 * The signature is computed over the raw body, so the body is read as text and
 * only parsed after the check passes.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhook(raw, signature)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; error_description?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true });

  const order = await db.order.findFirst({ where: { gatewayOrderId: payment.order_id } });
  if (!order) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured" && payment.id) {
    await markPaid(order.ref, payment.id);
  } else if (event.event === "payment.failed") {
    await db.order.update({
      where: { ref: order.ref },
      data: { paymentStatus: "FAILED", gatewayError: payment.error_description ?? "Payment failed" },
    });
  }

  return NextResponse.json({ ok: true });
}
