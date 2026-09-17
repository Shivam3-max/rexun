"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCustomer, normalisePhone } from "@/lib/auth";
import { getShippingRules } from "@/lib/store";
import { couponDiscount, shippingFor, deliveryEstimate } from "@/lib/pricing";
import { createGatewayOrder, gatewayConfig, verifySignature, markPaid } from "@/lib/payments";
import { notify } from "@/lib/notify";
import type { CartLine } from "@/lib/types";

/**
 * Everything a shopper can change on the server. The rule throughout: the
 * browser proposes, the database decides. A cart posted from localStorage is
 * treated as a list of SKUs and quantities only — every price is read fresh.
 */

type PricedLine = {
  slug: string; sku: string; name: string; attrs: string;
  image: string | null; qty: number; price: number; mrp: number; productId: string;
};

async function repriceCart(lines: CartLine[]) {
  const skus = lines.map((l) => l.sku);
  const variants = await db.variant.findMany({
    where: { sku: { in: skus }, active: true },
    include: { product: { select: { id: true, slug: true, name: true, status: true, images: true } } },
  });

  const priced: PricedLine[] = [];
  const dropped: string[] = [];

  for (const line of lines) {
    const v = variants.find((x) => x.sku === line.sku);
    if (!v || v.product.status !== "ACTIVE") {
      dropped.push(line.name);
      continue;
    }
    const qty = Math.max(1, Math.min(10, line.qty, v.stock));
    if (v.stock <= 0) {
      dropped.push(line.name);
      continue;
    }
    priced.push({
      slug: v.product.slug,
      sku: v.sku,
      name: v.product.name,
      attrs: v.attrs,
      image: v.image ?? (JSON.parse(v.product.images || "[]")[0] ?? null),
      qty,
      price: v.price,
      mrp: v.mrp,
      productId: v.product.id,
    });
  }
  return { priced, dropped };
}

export async function checkCoupon(code: string, subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.active) return { ok: false as const, error: "That code is not valid" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false as const, error: "That code is not active yet" };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false as const, error: "That code has expired" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false as const, error: "That code has been fully used" };

  const { discount, reason } = couponDiscount(coupon, subtotal);
  if (reason) return { ok: false as const, error: reason };
  return { ok: true as const, code: coupon.code, discount, description: coupon.description };
}

export async function placeOrder(input: {
  lines: CartLine[];
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state?: string;
  pincode: string;
  paymentMethod: string;
  couponCode?: string;
  saveAddress?: boolean;
}) {
  const phone = normalisePhone(input.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a valid 10-digit mobile number" };
  if (!/^\d{6}$/.test(input.pincode)) return { ok: false as const, error: "Enter a valid 6-digit pincode" };
  if (!input.lines.length) return { ok: false as const, error: "Your cart is empty" };

  const { priced, dropped } = await repriceCart(input.lines);
  if (!priced.length)
    return { ok: false as const, error: "Those items are no longer available. Please rebuild your cart." };

  const subtotal = priced.reduce((s, l) => s + l.price * l.qty, 0);

  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const res = await checkCoupon(input.couponCode, subtotal);
    if (res.ok) {
      discount = res.discount;
      couponCode = res.code;
    }
  }

  const rules = await getShippingRules();
  const shipping = shippingFor(subtotal - discount, rules);
  const total = subtotal - discount + shipping;

  if (input.paymentMethod === "cod" && total > rules.codLimit)
    return { ok: false as const, error: `Cash on delivery is available up to ₹${rules.codLimit.toLocaleString("en-IN")}` };

  // A guest order still creates (or finds) the customer record, so the same
  // phone number later signing up inherits its own order history.
  const signedIn = await getCustomer();
  const customer =
    signedIn ??
    (await db.customer.upsert({
      where: { phone },
      update: { name: input.name.trim() },
      create: { phone, name: input.name.trim(), email: input.email || null },
    }));

  const ref = "RX" + Date.now().toString(36).toUpperCase().slice(-6) +
    Math.floor(Math.random() * 90 + 10);

  const order = await db.order.create({
    data: {
      ref,
      customerId: customer.id,
      name: input.name.trim(),
      phone,
      email: input.email || null,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state?.trim() ?? "",
      pincode: input.pincode,
      paymentMethod: input.paymentMethod,
      // Nothing is charged until a gateway is connected; cash on delivery is
      // the only method that is legitimately "pending" rather than unpaid.
      paymentStatus: "PENDING",
      subtotal,
      discount,
      shipping,
      total,
      couponCode,
      items: {
        create: priced.map((l) => ({
          productId: l.productId, slug: l.slug, sku: l.sku, name: l.name,
          attrs: l.attrs, image: l.image, qty: l.qty, price: l.price, mrp: l.mrp,
        })),
      },
      events: {
        create: { status: "PLACED", note: `Placed on the website · ${input.paymentMethod.toUpperCase()}`, actor: "customer" },
      },
    },
  });

  // Reserve the stock. Orders are small and rare enough that a loop is clearer
  // than a batched raw update, and it keeps each SKU's floor at zero.
  for (const l of priced) {
    await db.variant.update({
      where: { sku: l.sku },
      data: { stock: { decrement: Math.min(l.qty, 1_000_000) } },
    });
  }
  await db.variant.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });

  if (couponCode) await db.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });

  if (input.saveAddress && signedIn) {
    await db.address.create({
      data: {
        customerId: signedIn.id, name: input.name.trim(), phone,
        line1: input.address.trim(), city: input.city.trim(),
        state: input.state?.trim() ?? "", pincode: input.pincode,
      },
    });
  }

  const delivery = deliveryEstimate(input.pincode, rules);
  await notify("order_placed", {
    ref: order.ref, name: order.name, phone: order.phone, email: order.email,
    total: order.total, date: delivery?.date ?? null,
  });

  // A prepaid order needs a gateway order id before the browser can open the
  // payment sheet. If the gateway is not configured the order still stands —
  // it simply waits to be collected by hand, which is what the confirmation
  // page tells the customer.
  let pay: { keyId: string; gatewayOrderId: string; amount: number } | null = null;
  if (input.paymentMethod !== "cod") {
    const cfg = gatewayConfig();
    if (cfg.configured && cfg.keyId) {
      const created = await createGatewayOrder({
        ref: order.ref, amount: total, name: order.name, phone, email: order.email,
      });
      if (created.ok) {
        await db.order.update({ where: { ref: order.ref }, data: { gatewayOrderId: created.id } });
        pay = { keyId: cfg.keyId, gatewayOrderId: created.id, amount: total };
      } else {
        await db.order.update({ where: { ref: order.ref }, data: { gatewayError: created.error } });
      }
    }
  }

  revalidatePath("/admin/orders");
  return { ok: true as const, ref: order.ref, dropped, total, pay };
}

/**
 * Called by the browser after Razorpay's sheet closes. The signature proves the
 * payment really happened; an unsigned or mismatched call is recorded and
 * refused rather than trusted.
 */
export async function confirmPayment(input: {
  ref: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  signature: string;
}) {
  const order = await db.order.findUnique({ where: { ref: input.ref } });
  if (!order) return { ok: false as const, error: "No such order" };

  if (!verifySignature(input)) {
    await db.order.update({
      where: { ref: input.ref },
      data: { gatewayError: "Signature did not verify", paymentStatus: "FAILED" },
    });
    return { ok: false as const, error: "We could not verify that payment. Nothing has been charged twice — call us and we will sort it out." };
  }

  await markPaid(input.ref, input.gatewayPaymentId);
  revalidatePath(`/order/${input.ref}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

/** Records that the customer closed the payment sheet without paying. */
export async function abandonPayment(ref: string, reason = "Payment window closed") {
  await db.order.update({ where: { ref }, data: { gatewayError: reason } }).catch(() => {});
  return { ok: true as const };
}

/**
 * Customer-side cancellation. Allowed only while the order has not shipped —
 * after that it is a return, which is a different conversation.
 */
export async function cancelOrder(ref: string, phoneInput: string, reason: string) {
  const phone = normalisePhone(phoneInput);
  const order = await db.order.findUnique({ where: { ref }, include: { items: true } });
  if (!order || order.phone !== phone) return { ok: false as const, error: "We could not find that order" };
  if (!["PLACED", "CONFIRMED"].includes(order.status))
    return { ok: false as const, error: "This order has already been packed — call us and we will help" };

  await db.order.update({
    where: { ref },
    data: {
      status: "CANCELLED",
      cancelReason: reason.trim() || "Cancelled by customer",
      events: { create: { status: "CANCELLED", note: reason.trim() || "Cancelled by customer", actor: "customer" } },
    },
  });
  for (const item of order.items) {
    await db.variant.updateMany({ where: { sku: item.sku }, data: { stock: { increment: item.qty } } });
  }

  await notify("order_cancelled", {
    ref: order.ref, name: order.name, phone: order.phone, email: order.email,
    reason: reason.trim() || null,
  });

  revalidatePath(`/order/${ref}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

/** Raises a replacement or refund request against a delivered order. */
export async function requestReturn(input: {
  ref: string; phone: string; sku: string; type: string; reason: string; detail: string;
}) {
  const phone = normalisePhone(input.phone);
  const order = await db.order.findUnique({ where: { ref: input.ref }, include: { items: true } });
  if (!order || order.phone !== phone) return { ok: false as const, error: "We could not find that order" };
  if (order.status !== "DELIVERED")
    return { ok: false as const, error: "Returns open once the order has been delivered" };

  const item = order.items.find((i) => i.sku === input.sku);
  if (!item) return { ok: false as const, error: "That item is not on this order" };

  const days = (Date.now() - order.updatedAt.getTime()) / 86400000;
  if (days > 7)
    return { ok: false as const, error: "The 7-day replacement window has closed. This is a warranty claim now — call us and we will raise it." };

  const existing = await db.returnRequest.findFirst({
    where: { orderId: order.id, sku: input.sku, status: { in: ["OPEN", "APPROVED"] } },
  });
  if (existing) return { ok: false as const, error: "There is already an open request for this item" };

  await db.returnRequest.create({
    data: {
      orderId: order.id, sku: item.sku, itemName: item.name, qty: item.qty,
      type: input.type === "REFUND" ? "REFUND" : "REPLACE",
      reason: input.reason, detail: input.detail.trim(),
    },
  });

  await notify("return_received", {
    ref: order.ref, name: order.name, phone: order.phone, email: order.email,
  });

  revalidatePath("/admin/returns");
  revalidatePath(`/order/${input.ref}`);
  return { ok: true as const };
}

export async function submitEnquiry(input: {
  name: string; phone: string; email?: string; subject: string; message: string;
}) {
  const phone = normalisePhone(input.phone);
  if (!input.name.trim()) return { ok: false as const, error: "Tell us your name" };
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a valid 10-digit mobile number" };
  if (input.message.trim().length < 5) return { ok: false as const, error: "Tell us a little more" };

  await db.enquiry.create({
    data: {
      name: input.name.trim(), phone, email: input.email || null,
      subject: input.subject || "General", message: input.message.trim(),
    },
  });
  revalidatePath("/admin/enquiries");
  return { ok: true as const };
}

export async function lookupOrders(phoneInput: string) {
  const phone = normalisePhone(phoneInput);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a 10-digit mobile number" };
  const orders = await db.order.findMany({
    where: { phone },
    orderBy: { placedAt: "desc" },
    include: { items: true, events: { orderBy: { at: "asc" } } },
    take: 20,
  });
  return {
    ok: true as const,
    orders: orders.map((o) => ({
      ref: o.ref,
      status: o.status,
      total: o.total,
      placedAt: o.placedAt.toISOString(),
      courier: o.courier,
      trackingNumber: o.trackingNumber,
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, image: i.image })),
      events: o.events.map((e) => ({ status: e.status, note: e.note, at: e.at.toISOString() })),
    })),
  };
}
