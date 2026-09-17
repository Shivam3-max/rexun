"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  registerCustomer, signInCustomer, signOutCustomer, getCustomer, normalisePhone,
} from "@/lib/auth";

export async function doRegister(input: {
  name: string; phone: string; password: string; email?: string;
}) {
  const res = await registerCustomer(input);
  if (!res.ok) return res;
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function doSignIn(phone: string, password: string) {
  const res = await signInCustomer(phone, password);
  if (!res.ok) return res;
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function doSignOut() {
  await signOutCustomer();
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveAddress(input: {
  id?: string; label: string; name: string; phone: string;
  line1: string; city: string; state: string; pincode: string; isDefault: boolean;
}) {
  const customer = await getCustomer();
  if (!customer) return { ok: false as const, error: "Please sign in first" };

  const phone = normalisePhone(input.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a 10-digit mobile number" };
  if (!/^\d{6}$/.test(input.pincode)) return { ok: false as const, error: "Enter a 6-digit pincode" };
  if (input.line1.trim().length < 8) return { ok: false as const, error: "Enter the full address" };

  const data = {
    label: input.label.trim() || "Home",
    name: input.name.trim(),
    phone,
    line1: input.line1.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode,
    isDefault: input.isDefault,
  };

  // Only one address can be the default, so clear the flag before setting it.
  if (input.isDefault)
    await db.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });

  if (input.id) {
    const owned = await db.address.findFirst({ where: { id: input.id, customerId: customer.id } });
    if (!owned) return { ok: false as const, error: "That address is not on your account" };
    await db.address.update({ where: { id: input.id }, data });
  } else {
    await db.address.create({ data: { ...data, customerId: customer.id } });
  }

  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function deleteAddress(id: string) {
  const customer = await getCustomer();
  if (!customer) return { ok: false as const, error: "Please sign in first" };
  await db.address.deleteMany({ where: { id, customerId: customer.id } });
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function updateProfile(input: { name: string; email: string }) {
  const customer = await getCustomer();
  if (!customer) return { ok: false as const, error: "Please sign in first" };
  if (input.name.trim().length < 2) return { ok: false as const, error: "Enter your name" };
  await db.customer.update({
    where: { id: customer.id },
    data: { name: input.name.trim(), email: input.email.trim() || null },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
