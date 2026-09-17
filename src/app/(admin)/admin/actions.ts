"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, audit, hashPassword, signInAdmin, signOutAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { assignInvoiceNumber } from "@/lib/invoice";
import { refundPayment } from "@/lib/payments";
import { deliveryEstimate } from "@/lib/pricing";
import { getShippingRules } from "@/lib/store";

/**
 * Every write the admin panel can make. Three rules hold throughout:
 * requireAdmin() guards the door, audit() records who changed what, and the
 * storefront paths are revalidated so a change is visible on the shop the
 * moment it is saved.
 */

/** Every action answers the same way, so callers can always read `res.error`. */
export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

type Ok<T = unknown> = { ok: true } & T;

const fail = (error: string): Result<never> => ({ ok: false, error });

function refreshShop() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------- auth

export async function adminSignIn(email: string, password: string): Promise<Result> {
  const res = await signInAdmin(email, password);
  if (!res.ok) return fail(res.error);
  await audit("SIGN_IN", "AdminUser", res.user.id, res.user.email);
  return { ok: true } as Ok;
}

export async function adminSignOut(): Promise<Result> {
  await signOutAdmin();
  return { ok: true } as Ok;
}

// --------------------------------------------------------------- products

export async function updateProduct(
  id: string,
  data: {
    name: string; brand: string; tagline: string; description: string;
    categoryId: string; warranty: string; highlights: string[];
    specs: Record<string, string>; rooms: string[]; images: string[];
    status: string; featured: boolean; own: boolean; wattage: string;
  }
): Promise<Result> {
  await requireAdmin();
  if (!data.name.trim()) return fail("A product needs a name");

  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return fail("Pick a category");

  await db.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      brand: data.brand.trim(),
      tagline: data.tagline.trim(),
      description: data.description.trim(),
      categoryId: category.id,
      deptId: category.deptId,
      warranty: data.warranty.trim() || null,
      highlights: JSON.stringify(data.highlights.filter((h) => h.trim())),
      specs: JSON.stringify(data.specs),
      rooms: JSON.stringify(data.rooms),
      images: JSON.stringify(data.images.filter(Boolean)),
      status: data.status,
      featured: data.featured,
      own: data.own,
      wattage: data.wattage ? Number(data.wattage) || null : null,
    },
  });

  await audit("UPDATE", "Product", id, data.name);
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true } as Ok;
}

/** Writes variant prices and stock, then refreshes the product's cached range. */
export async function updateVariants(
  productId: string,
  rows: { sku: string; mrp: number; price: number; stock: number; active: boolean }[]
): Promise<Result> {
  await requireAdmin();
  for (const r of rows) {
    if (r.price < 0 || r.mrp < 0) return fail("Prices cannot be negative");
    if (r.price > r.mrp && r.mrp > 0) return fail(`${r.sku}: selling price is above MRP`);
  }

  for (const r of rows) {
    await db.variant.update({
      where: { sku: r.sku },
      data: {
        mrp: Math.round(r.mrp),
        price: Math.round(r.price),
        stock: Math.max(0, Math.round(r.stock)),
        active: r.active,
      },
    });
  }
  await syncProductPrices(productId);

  await audit("UPDATE", "Variant", productId, `${rows.length} variants`);
  refreshShop();
  return { ok: true } as Ok;
}

/** The product row caches its own price range; recompute it after any edit. */
async function syncProductPrices(productId: string) {
  const variants = await db.variant.findMany({ where: { productId, active: true } });
  const pool = variants.length ? variants : await db.variant.findMany({ where: { productId } });
  if (!pool.length) return;
  await db.product.update({
    where: { id: productId },
    data: {
      price: Math.min(...pool.map((v) => v.price)),
      priceMax: Math.max(...pool.map((v) => v.price)),
      mrp: Math.min(...pool.map((v) => v.mrp)),
      mrpMax: Math.max(...pool.map((v) => v.mrp)),
      estimatedPrice: false,
    },
  });
}

export async function setProductStatus(ids: string[], status: string): Promise<Result> {
  await requireAdmin();
  await db.product.updateMany({ where: { id: { in: ids } }, data: { status } });
  await audit("STATUS", "Product", ids.join(","), status);
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true } as Ok;
}

export async function setFeatured(ids: string[], featured: boolean): Promise<Result> {
  await requireAdmin();
  await db.product.updateMany({ where: { id: { in: ids } }, data: { featured } });
  await audit("FEATURE", "Product", ids.join(","), String(featured));
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true } as Ok;
}

/**
 * Bulk repricing. `mode` is either a discount off MRP or a percentage nudge to
 * the current selling price — the two ways a price list actually changes.
 */
export async function bulkPrice(input: {
  scope: { categoryId?: string; brand?: string; ids?: string[] };
  mode: "discount-off-mrp" | "adjust-price";
  percent: number;
}): Promise<Result<{ count: number }>> {
  await requireAdmin();
  if (!Number.isFinite(input.percent)) return fail("Enter a percentage");
  if (input.mode === "discount-off-mrp" && (input.percent < 0 || input.percent > 90))
    return fail("Discount must be between 0 and 90%");

  const where: Record<string, unknown> = {};
  if (input.scope.ids?.length) where.id = { in: input.scope.ids };
  if (input.scope.categoryId) where.categoryId = input.scope.categoryId;
  if (input.scope.brand) where.brand = input.scope.brand;
  if (!Object.keys(where).length) return fail("Choose what to reprice");

  const products = await db.product.findMany({ where, include: { variants: true } });
  if (!products.length) return fail("Nothing matched that selection");

  let touched = 0;
  for (const p of products) {
    for (const v of p.variants) {
      const next =
        input.mode === "discount-off-mrp"
          ? Math.round(v.mrp * (1 - input.percent / 100))
          : Math.round(v.price * (1 + input.percent / 100));
      const price = Math.max(1, Math.min(next, v.mrp));
      await db.variant.update({ where: { id: v.id }, data: { price } });
      touched++;
    }
    await syncProductPrices(p.id);
  }

  await audit("BULK_PRICE", "Product", "", `${products.length} products, ${touched} variants, ${input.mode} ${input.percent}%`);
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, count: products.length } as Ok<{ count: number }>;
}

export async function bulkStock(ids: string[], stock: number): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const variants = await db.variant.findMany({ where: { productId: { in: ids } } });
  await db.variant.updateMany({
    where: { id: { in: variants.map((v) => v.id) } },
    data: { stock: Math.max(0, Math.round(stock)) },
  });
  await audit("BULK_STOCK", "Variant", "", `${variants.length} variants set to ${stock}`);
  refreshShop();
  revalidatePath("/admin/inventory");
  return { ok: true, count: variants.length } as Ok<{ count: number }>;
}

/** Single-variant stock edit, used by the inline field on the stock page. */
export async function setOneStock(sku: string, productId: string, stock: number): Promise<Result> {
  await requireAdmin();
  const next = Math.max(0, Math.round(stock));
  await db.variant.update({ where: { sku }, data: { stock: next } });
  await audit("STOCK", "Variant", sku, String(next));
  refreshShop();
  revalidatePath("/admin/inventory");
  return { ok: true } as Ok;
}

export async function createProduct(data: {
  name: string; brand: string; categoryId: string; mrp: number; price: number;
  stock: number; tagline: string; own: boolean;
}): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!data.name.trim()) return fail("A product needs a name");
  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return fail("Pick a category");
  if (data.price > data.mrp) return fail("Selling price is above MRP");

  const base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  let slug = base;
  let n = 2;
  while (await db.product.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const sku = slug.toUpperCase().replace(/-/g, "").slice(0, 16) + Date.now().toString().slice(-4);

  const product = await db.product.create({
    data: {
      slug,
      name: data.name.trim(),
      brand: data.brand.trim() || "Rexsun",
      categoryId: category.id,
      deptId: category.deptId,
      tagline: data.tagline.trim(),
      own: data.own,
      status: "DRAFT",
      price: data.price, priceMax: data.price, mrp: data.mrp, mrpMax: data.mrp,
      variants: { create: { sku, attrs: "{}", mrp: data.mrp, price: data.price, stock: data.stock } },
    },
  });

  await audit("CREATE", "Product", product.id, product.name);
  revalidatePath("/admin/products");
  return { ok: true, id: product.id } as Ok<{ id: string }>;
}

export async function deleteProduct(id: string): Promise<Result<{ archived: boolean }>> {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id }, select: { name: true } });
  const ordered = await db.orderItem.count({ where: { productId: id } });
  // Deleting a product that appears on an order would erase what someone
  // actually bought; archiving keeps the history and takes it off the shop.
  if (ordered > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit("ARCHIVE", "Product", id, `${p?.name} (has orders)`);
    refreshShop();
    revalidatePath("/admin/products");
    return { ok: true, archived: true } as Ok<{ archived: boolean }>;
  }
  await db.product.delete({ where: { id } });
  await audit("DELETE", "Product", id, p?.name ?? "");
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, archived: false } as Ok<{ archived: boolean }>;
}

// ------------------------------------------------------------------ orders

const FLOW: Record<string, string[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function advanceOrder(ref: string, status: string, note = ""): Promise<Result> {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({ where: { ref }, include: { items: true } });
  if (!order) return fail("No such order");
  if (!FLOW[order.status]?.includes(status))
    return fail(`Cannot move an order from ${order.status} to ${status}`);

  await db.order.update({
    where: { ref },
    data: {
      status,
      // Delivered cash-on-delivery means the money has been collected.
      paymentStatus:
        status === "DELIVERED" && order.paymentMethod === "cod" ? "PAID" : order.paymentStatus,
      ...(status === "CANCELLED" ? { cancelReason: note || "Cancelled by the shop" } : {}),
      events: { create: { status, note, actor: admin.name } },
    },
  });

  // Confirming is the point of no return, so that is when the order earns its
  // invoice number — a cancelled order never consumes one.
  if (status === "CONFIRMED") await assignInvoiceNumber(ref);

  // A cancelled order puts its stock back on the shelf.
  if (status === "CANCELLED") {
    for (const item of order.items) {
      await db.variant.updateMany({ where: { sku: item.sku }, data: { stock: { increment: item.qty } } });
    }
  }

  const rules = await getShippingRules();
  const delivery = deliveryEstimate(order.pincode, rules);
  const fresh = await db.order.findUnique({ where: { ref } });
  const template =
    status === "SHIPPED" ? "order_shipped" :
    status === "DELIVERED" ? "order_delivered" :
    status === "CANCELLED" ? "order_cancelled" : null;
  if (template) {
    await notify(template, {
      ref: order.ref, name: order.name, phone: order.phone, email: order.email,
      total: order.total, date: delivery?.date ?? null,
      courier: fresh?.courier ?? null, tracking: fresh?.trackingNumber ?? null,
      reason: note || null,
    });
  }

  await audit("ORDER_STATUS", "Order", ref, status);
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${ref}`);
  return { ok: true } as Ok;
}

export async function updateOrderMeta(
  ref: string,
  data: { courier: string; trackingNumber: string; notes: string; paymentStatus: string }
): Promise<Result> {
  await requireAdmin();
  await db.order.update({
    where: { ref },
    data: {
      courier: data.courier.trim() || null,
      trackingNumber: data.trackingNumber.trim() || null,
      notes: data.notes.trim() || null,
      paymentStatus: data.paymentStatus,
    },
  });
  await audit("ORDER_META", "Order", ref, data.trackingNumber || data.paymentStatus);
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${ref}`);
  return { ok: true } as Ok;
}

// -------------------------------------------------------------- taxonomy

export async function saveDepartment(input: {
  id?: string; slug: string; name: string; blurb: string; image: string; visible: boolean; position: number;
}): Promise<Result> {
  await requireAdmin();
  if (!input.name.trim()) return fail("A department needs a name");
  const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const data = {
    slug, name: input.name.trim(), blurb: input.blurb.trim(),
    image: input.image || null, visible: input.visible, position: input.position,
  };

  if (input.id) await db.department.update({ where: { id: input.id }, data });
  else {
    if (await db.department.findUnique({ where: { slug } })) return fail("That web address is already used");
    await db.department.create({ data });
  }
  await audit(input.id ? "UPDATE" : "CREATE", "Department", input.id ?? slug, data.name);
  refreshShop();
  revalidatePath("/admin/categories");
  return { ok: true } as Ok;
}

export async function saveCategory(input: {
  id?: string; slug: string; name: string; deptId: string; image: string; visible: boolean; position: number;
}): Promise<Result> {
  await requireAdmin();
  if (!input.name.trim()) return fail("A category needs a name");
  if (!input.deptId) return fail("Pick a department");
  const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const data = {
    slug, name: input.name.trim(), deptId: input.deptId,
    image: input.image || null, visible: input.visible, position: input.position,
  };

  if (input.id) await db.category.update({ where: { id: input.id }, data });
  else {
    if (await db.category.findUnique({ where: { slug } })) return fail("That web address is already used");
    await db.category.create({ data });
  }
  await audit(input.id ? "UPDATE" : "CREATE", "Category", input.id ?? slug, data.name);
  refreshShop();
  revalidatePath("/admin/categories");
  return { ok: true } as Ok;
}

export async function deleteCategory(id: string): Promise<Result> {
  await requireAdmin();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) return fail(`${count} products are still in this category — move them first`);
  await db.category.delete({ where: { id } });
  await audit("DELETE", "Category", id);
  refreshShop();
  revalidatePath("/admin/categories");
  return { ok: true } as Ok;
}

// ------------------------------------------------------------- content

export async function saveBanner(input: {
  id?: string; slot: string; title: string; subtitle: string; image: string; link: string;
  position: number; active: boolean;
}): Promise<Result> {
  await requireAdmin();
  const data = {
    slot: input.slot, title: input.title.trim(), subtitle: input.subtitle.trim(),
    image: input.image || null, link: input.link.trim(), position: input.position, active: input.active,
  };
  if (input.id) await db.banner.update({ where: { id: input.id }, data });
  else await db.banner.create({ data });
  await audit(input.id ? "UPDATE" : "CREATE", "Banner", input.id ?? "", input.slot);
  refreshShop();
  revalidatePath("/admin/content");
  return { ok: true } as Ok;
}

export async function deleteBanner(id: string): Promise<Result> {
  await requireAdmin();
  await db.banner.delete({ where: { id } });
  await audit("DELETE", "Banner", id);
  refreshShop();
  revalidatePath("/admin/content");
  return { ok: true } as Ok;
}

export async function saveRooms(rooms: { slug: string; name: string; image: string | null }[]): Promise<Result> {
  await requireAdmin();
  await db.setting.upsert({
    where: { key: "rooms" },
    update: { value: JSON.stringify(rooms) },
    create: { key: "rooms", value: JSON.stringify(rooms) },
  });
  await audit("UPDATE", "Setting", "rooms", `${rooms.length} rooms`);
  refreshShop();
  revalidatePath("/admin/content");
  return { ok: true } as Ok;
}

export async function saveSetting(key: string, value: unknown): Promise<Result> {
  await requireAdmin();
  await db.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
  await audit("UPDATE", "Setting", key);
  refreshShop();
  revalidatePath("/admin/settings");
  return { ok: true } as Ok;
}

// ------------------------------------------------------------- coupons

export async function saveCoupon(input: {
  id?: string; code: string; description: string; type: string; value: number;
  minOrder: number; maxDiscount: number | null; usageLimit: number | null;
  startsAt: string; endsAt: string; active: boolean;
}): Promise<Result> {
  await requireAdmin();
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return fail("Codes are 3–20 letters and numbers");
  if (input.value <= 0) return fail("Enter a discount value");
  if (input.type === "PERCENT" && input.value > 90) return fail("A percentage discount cannot exceed 90%");

  const data = {
    code, description: input.description.trim(), type: input.type, value: Math.round(input.value),
    minOrder: Math.max(0, Math.round(input.minOrder)),
    maxDiscount: input.maxDiscount ? Math.round(input.maxDiscount) : null,
    usageLimit: input.usageLimit ? Math.round(input.usageLimit) : null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    active: input.active,
  };

  if (input.id) await db.coupon.update({ where: { id: input.id }, data });
  else {
    if (await db.coupon.findUnique({ where: { code } })) return fail("That code already exists");
    await db.coupon.create({ data });
  }
  await audit(input.id ? "UPDATE" : "CREATE", "Coupon", input.id ?? code, code);
  revalidatePath("/admin/coupons");
  return { ok: true } as Ok;
}

export async function deleteCoupon(id: string): Promise<Result> {
  await requireAdmin();
  await db.coupon.delete({ where: { id } });
  await audit("DELETE", "Coupon", id);
  revalidatePath("/admin/coupons");
  return { ok: true } as Ok;
}

// ------------------------------------------------------------ enquiries

export async function replyEnquiry(id: string, reply: string, status: string): Promise<Result> {
  await requireAdmin();
  await db.enquiry.update({ where: { id }, data: { reply: reply.trim() || null, status } });
  await audit("REPLY", "Enquiry", id, status);
  revalidatePath("/admin/enquiries");
  return { ok: true } as Ok;
}

// ---------------------------------------------------------------- staff

export async function saveStaff(input: {
  id?: string; email: string; name: string; password: string; role: string; active: boolean;
}): Promise<Result> {
  const me = await requireAdmin();
  if (me.role !== "ADMIN") return fail("Only an owner can manage staff");

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email");

  if (input.id) {
    // The last active owner must not be able to lock everyone out.
    if (!input.active || input.role !== "ADMIN") {
      const owners = await db.adminUser.count({ where: { role: "ADMIN", active: true, id: { not: input.id } } });
      if (owners === 0) return fail("There has to be at least one active owner");
    }
    await db.adminUser.update({
      where: { id: input.id },
      data: {
        email, name: input.name.trim(), role: input.role, active: input.active,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
    });
  } else {
    if (input.password.length < 8) return fail("Use at least 8 characters for a new account");
    if (await db.adminUser.findUnique({ where: { email } })) return fail("That email already has an account");
    await db.adminUser.create({
      data: { email, name: input.name.trim(), role: input.role, active: input.active, passwordHash: await hashPassword(input.password) },
    });
  }
  await audit(input.id ? "UPDATE" : "CREATE", "AdminUser", input.id ?? email, email);
  revalidatePath("/admin/settings");
  return { ok: true } as Ok;
}


// --------------------------------------------------------------- payments

/**
 * Refunds through the gateway when the order was paid online, and records a
 * manual refund otherwise — a cash-on-delivery refund is a bank transfer
 * someone makes by hand, but it still has to show on the order.
 */
export async function refundOrder(ref: string, amount?: number): Promise<Result> {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { ref } });
  if (!order) return fail("No such order");
  if (order.paymentStatus === "REFUNDED") return fail("This order is already refunded");

  let note = "Refund recorded by hand";
  if (order.gatewayPaymentId) {
    const res = await refundPayment(order.gatewayPaymentId, amount);
    if (!res.ok) return fail(res.error);
    note = `Refunded through the gateway · ${res.id}`;
  }

  await db.order.update({
    where: { ref },
    data: {
      paymentStatus: "REFUNDED",
      events: { create: { status: "REFUNDED", note, actor: "admin" } },
    },
  });
  await audit("REFUND", "Order", ref, note);
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${ref}`);
  return { ok: true } as Ok;
}

// ------------------------------------------------------------- aftersales

export async function resolveReturn(
  id: string,
  status: string,
  resolution: string
): Promise<Result> {
  const admin = await requireAdmin();
  const request = await db.returnRequest.findUnique({ where: { id }, include: { order: true } });
  if (!request) return fail("No such request");

  await db.returnRequest.update({
    where: { id },
    data: { status, resolution: resolution.trim() || null },
  });

  await db.orderEvent.create({
    data: {
      orderId: request.orderId,
      status: `RETURN_${status}`,
      note: `${request.type === "REFUND" ? "Refund" : "Replacement"} for ${request.itemName}${resolution ? ` — ${resolution}` : ""}`,
      actor: admin.name,
    },
  });

  if (status === "APPROVED") {
    await notify("return_approved", {
      ref: request.order.ref, name: request.order.name,
      phone: request.order.phone, email: request.order.email,
      reason: resolution.trim() || null,
    });
  }

  await audit("RETURN", "ReturnRequest", id, status);
  revalidatePath("/admin/returns");
  revalidatePath(`/order/${request.order.ref}`);
  return { ok: true } as Ok;
}

// -------------------------------------------------------------- messaging

/** Sends a queued or failed message again, for when a provider was down. */
export async function resendNotification(id: string): Promise<Result> {
  await requireAdmin();
  const row = await db.notification.findUnique({ where: { id } });
  if (!row) return fail("No such message");
  if (!row.orderRef) return fail("That message is not attached to an order");

  const order = await db.order.findUnique({ where: { ref: row.orderRef } });
  if (!order) return fail("That order no longer exists");

  await notify(row.template, {
    ref: order.ref, name: order.name, phone: order.phone, email: order.email,
    total: order.total, courier: order.courier, tracking: order.trackingNumber,
  });
  await audit("RESEND", "Notification", id, row.template);
  revalidatePath("/admin/messages");
  return { ok: true } as Ok;
}
