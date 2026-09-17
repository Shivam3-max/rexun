import "server-only";
import { db } from "./db";

/**
 * Invoice numbering and GST arithmetic.
 *
 * A number is assigned when an order is confirmed, never when it is placed, so
 * an abandoned or cancelled order does not burn a number — tax invoices have
 * to run in an unbroken sequence.
 */

export const INVOICE_PREFIX = "RX";

export async function assignInvoiceNumber(ref: string) {
  const order = await db.order.findUnique({ where: { ref } });
  if (!order || order.invoiceNo) return order?.invoiceNo ?? null;

  const year = new Date().getFullYear();
  const shortYear = `${String(year).slice(2)}${String(year + 1).slice(2)}`; // 2627 for FY 26-27
  const prefix = `${INVOICE_PREFIX}/${shortYear}/`;

  const last = await db.order.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
    select: { invoiceNo: true },
  });
  const next = last?.invoiceNo ? Number(last.invoiceNo.split("/").pop()) + 1 : 1;
  const invoiceNo = `${prefix}${String(next).padStart(5, "0")}`;

  await db.order.update({ where: { ref }, data: { invoiceNo, invoiceAt: new Date() } });
  return invoiceNo;
}

/**
 * Prices on this store are GST-inclusive, so the tax is extracted from the
 * total rather than added to it. Electrical goods and appliances sit at 18%.
 */
export const GST_RATE = 0.18;

export function gstBreakdown(inclusiveTotal: number, sameState = true) {
  const taxable = Math.round((inclusiveTotal / (1 + GST_RATE)) * 100) / 100;
  const tax = Math.round((inclusiveTotal - taxable) * 100) / 100;
  return sameState
    ? { taxable, cgst: Math.round((tax / 2) * 100) / 100, sgst: Math.round((tax / 2) * 100) / 100, igst: 0, tax }
    : { taxable, cgst: 0, sgst: 0, igst: tax, tax };
}

/** Punjab, Haryana, Chandigarh and Himachal count as local for CGST/SGST. */
export const isLocalPincode = (pincode: string) => /^(14|16|13|17)/.test(pincode.trim());
