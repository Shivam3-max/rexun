import "server-only";
import { db } from "./db";
import { getStoreSettings } from "./store";

/**
 * Customer messaging. Every message is written to the Notification table
 * first, then a provider is asked to deliver it. That ordering matters: if a
 * provider is down or not configured yet, the message is still on record and
 * the panel can show exactly what the customer should have been told.
 *
 * Providers are pluggable through env. Nothing is configured out of the box,
 * so messages queue as SKIPPED with the composed text intact.
 */

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

type Ctx = {
  ref: string;
  name: string;
  phone: string;
  email?: string | null;
  total?: number;
  date?: string | null;
  courier?: string | null;
  tracking?: string | null;
  reason?: string | null;
};

type Composed = { subject: string; body: string };

/**
 * Templates read like a person wrote them, because on WhatsApp a customer
 * cannot tell the difference between an automated message and a shop that has
 * forgotten how to write.
 */
const TEMPLATES: Record<string, (c: Ctx, store: { name: string; phone: string }) => Composed> = {
  order_placed: (c, s) => ({
    subject: `Order ${c.ref} confirmed`,
    body:
      `Hi ${c.name.split(" ")[0]}, thanks for your order.\n\n` +
      `Order ${c.ref}${c.total ? ` · ${inr(c.total)}` : ""}\n` +
      (c.date ? `Expected delivery: ${c.date}\n` : "") +
      `\nWe will message you again when it is dispatched. ` +
      `Any questions, reply here or call ${s.phone}.\n\n— ${s.name}`,
  }),
  order_shipped: (c, s) => ({
    subject: `Order ${c.ref} is on its way`,
    body:
      `Hi ${c.name.split(" ")[0]}, your order ${c.ref} has been dispatched.\n\n` +
      (c.courier ? `Courier: ${c.courier}\n` : "") +
      (c.tracking ? `Tracking number: ${c.tracking}\n` : "") +
      (c.date ? `Expected: ${c.date}\n` : "") +
      `\nTrack it any time with your mobile number on our website.\n\n— ${s.name}`,
  }),
  order_delivered: (c, s) => ({
    subject: `Order ${c.ref} delivered`,
    body:
      `Hi ${c.name.split(" ")[0]}, order ${c.ref} has been delivered.\n\n` +
      `Your warranty starts today and is registered against this order. ` +
      `If anything is not right, tell us within 7 days and we will replace it.\n\n` +
      `Call ${s.phone} if you need us.\n\n— ${s.name}`,
  }),
  order_cancelled: (c, s) => ({
    subject: `Order ${c.ref} cancelled`,
    body:
      `Hi ${c.name.split(" ")[0]}, order ${c.ref} has been cancelled` +
      (c.reason ? ` — ${c.reason}` : "") +
      `.\n\nAny amount paid is refunded to the same account within 5 working days. ` +
      `Call ${s.phone} if you have a question.\n\n— ${s.name}`,
  }),
  return_received: (c, s) => ({
    subject: `We have your request for order ${c.ref}`,
    body:
      `Hi ${c.name.split(" ")[0]}, we have your replacement request for order ${c.ref}.\n\n` +
      `Someone will call you on ${c.phone} within one working day to arrange the pickup.\n\n— ${s.name}`,
  }),
  return_approved: (c, s) => ({
    subject: `Replacement approved for order ${c.ref}`,
    body:
      `Hi ${c.name.split(" ")[0]}, your request against order ${c.ref} is approved.\n\n` +
      (c.reason ? `${c.reason}\n\n` : "") +
      `We will arrange the pickup and the replacement together — no need to courier anything yourself.\n\n— ${s.name}`,
  }),
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// ------------------------------------------------------------------ senders

async function sendWhatsApp(to: string, body: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: false as const, skipped: true, error: "WhatsApp is not set up" };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${to.replace(/\D/g, "").slice(-10)}`,
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false as const, skipped: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true as const, skipped: false, error: null };
  } catch {
    return { ok: false as const, skipped: false, error: "Could not reach WhatsApp" };
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false as const, skipped: true, error: "Email is not set up" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false as const, skipped: false, error: json.message ?? `HTTP ${res.status}` };
    }
    return { ok: true as const, skipped: false, error: null };
  } catch {
    return { ok: false as const, skipped: false, error: "Could not reach the email provider" };
  }
}

// -------------------------------------------------------------------- entry

/**
 * Queues and attempts one notification per configured channel. Never throws —
 * a message that cannot be sent must not take an order down with it.
 */
export async function notify(template: string, ctx: Ctx) {
  const build = TEMPLATES[template];
  if (!build) return;

  try {
    const settings = await getStoreSettings();
    const { subject, body } = build(ctx, { name: settings.name, phone: settings.phone });

    const targets: { channel: "whatsapp" | "email"; to: string }[] = [
      { channel: "whatsapp", to: ctx.phone },
    ];
    if (ctx.email) targets.push({ channel: "email", to: ctx.email });

    for (const t of targets) {
      const row = await db.notification.create({
        data: { channel: t.channel, to: t.to, template, subject, body, orderRef: ctx.ref },
      });

      const result =
        t.channel === "whatsapp"
          ? await sendWhatsApp(t.to, body)
          : await sendEmail(t.to, subject, body);

      await db.notification.update({
        where: { id: row.id },
        data: {
          status: result.ok ? "SENT" : result.skipped ? "SKIPPED" : "FAILED",
          error: result.error,
          sentAt: result.ok ? new Date() : null,
        },
      });
    }
  } catch {
    /* messaging is never allowed to break the thing it is reporting on */
  }
}

export function channelStatus() {
  return {
    whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}
