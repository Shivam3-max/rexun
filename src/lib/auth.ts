import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * Two separate session cookies: staff and shoppers never share a session, so
 * signing out of one has no effect on the other and an admin browsing the shop
 * stays signed in as a customer if they are one.
 */
const ADMIN_COOKIE = "rexsun_admin";
const CUSTOMER_COOKIE = "rexsun_customer";
const DAY = 24 * 60 * 60 * 1000;

const newToken = () => crypto.randomBytes(32).toString("hex");

const cookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: expiresAt,
});

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// -------------------------------------------------------------------- admin

export async function signInAdmin(email: string, password: string) {
  const user = await db.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active) return { ok: false as const, error: "No account with that email" };
  if (!(await verifyPassword(password, user.passwordHash)))
    return { ok: false as const, error: "That password is not right" };

  const token = newToken();
  const expiresAt = new Date(Date.now() + 7 * DAY);
  await db.adminSession.create({ data: { token, userId: user.id, expiresAt } });
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(expiresAt));
  return { ok: true as const, user };
}

export const getAdmin = cache(async () => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user.active ? session.user : null;
});

export async function signOutAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { token } });
  jar.delete(ADMIN_COOKIE);
}

/** Throws past this point unless a staff member is signed in. */
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) throw new Error("UNAUTHORISED");
  return user;
}

export async function audit(
  action: string,
  entity: string,
  entityId = "",
  detail = ""
) {
  const user = await getAdmin();
  await db.auditLog.create({
    data: { userId: user?.id, actor: user?.name ?? "system", action, entity, entityId, detail },
  });
}

// ----------------------------------------------------------------- customer

const normalisePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

export async function registerCustomer(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}) {
  const phone = normalisePhone(input.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a 10-digit mobile number" };
  if (input.password.length < 6) return { ok: false as const, error: "Use at least 6 characters" };

  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing?.passwordHash)
    return { ok: false as const, error: "That number already has an account — sign in instead" };

  const passwordHash = await hashPassword(input.password);
  // A guest who ordered before already exists; this claims that record so
  // their past orders appear the moment they create the account.
  const customer = existing
    ? await db.customer.update({
        where: { id: existing.id },
        data: { passwordHash, name: input.name.trim() || existing.name, email: input.email || existing.email },
      })
    : await db.customer.create({
        data: { phone, name: input.name.trim(), email: input.email || null, passwordHash },
      });

  await startCustomerSession(customer.id);
  return { ok: true as const, customer };
}

export async function signInCustomer(phoneInput: string, password: string) {
  const phone = normalisePhone(phoneInput);
  const customer = await db.customer.findUnique({ where: { phone } });
  if (!customer?.passwordHash)
    return { ok: false as const, error: "No account with that number" };
  if (!(await verifyPassword(password, customer.passwordHash)))
    return { ok: false as const, error: "That password is not right" };
  await startCustomerSession(customer.id);
  return { ok: true as const, customer };
}

async function startCustomerSession(customerId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + 60 * DAY);
  await db.customerSession.create({ data: { token, customerId, expiresAt } });
  (await cookies()).set(CUSTOMER_COOKIE, token, cookieOptions(expiresAt));
}

export const getCustomer = cache(async () => {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await db.customerSession.findUnique({
    where: { token },
    include: { customer: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.customer;
});

export async function signOutCustomer() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token) await db.customerSession.deleteMany({ where: { token } });
  jar.delete(CUSTOMER_COOKIE);
}

export { normalisePhone };
