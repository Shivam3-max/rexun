import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/store";
import { gstBreakdown, isLocalPincode, GST_RATE } from "@/lib/invoice";
import { inr } from "@/lib/pricing";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Invoice", robots: { index: false } };

/**
 * A tax invoice that prints. No PDF library: a browser prints this to PDF
 * perfectly well, and a printable page is also readable on a phone, which a
 * generated PDF usually is not.
 *
 * Prices on this store are GST-inclusive, so tax is extracted from the total
 * rather than added to it — the customer must see the same number they paid.
 */
export default async function InvoicePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const order = await db.order.findUnique({ where: { ref }, include: { items: true } });
  if (!order) notFound();

  const store = await getStoreSettings();
  const local = isLocalPincode(order.pincode);
  const totals = gstBreakdown(order.total, local);

  const lines = order.items.map((i) => {
    const gross = i.price * i.qty;
    const g = gstBreakdown(gross, local);
    return { ...i, gross, ...g };
  });

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <p className="text-[14px] text-ink-2">
          Invoice for order <span className="font-bold text-ink tnum">{order.ref}</span>
        </p>
        <PrintButton />
      </div>

      <article className="rounded-card border border-line bg-card p-6 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="font-display text-[24px] font-bold leading-none text-ink">
              REX<span className="text-rex-gold">SUN</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {store.tagline}
            </p>
            <p className="mt-3 max-w-[38ch] text-[12.5px] leading-relaxed text-ink-2">
              {store.address}
              {store.phone && <><br />{store.phone}</>}
              {store.email && <><br />{store.email}</>}
              {store.gstin && <><br />GSTIN: <span className="tnum">{store.gstin}</span></>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-bold uppercase tracking-wider text-ink">Tax Invoice</p>
            <dl className="mt-2 space-y-0.5 text-[12.5px] text-ink-2">
              <div><dt className="inline text-ink-3">Invoice no: </dt><dd className="inline font-bold text-ink tnum">{order.invoiceNo ?? "— pending confirmation —"}</dd></div>
              <div><dt className="inline text-ink-3">Date: </dt><dd className="inline tnum">{(order.invoiceAt ?? order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
              <div><dt className="inline text-ink-3">Order: </dt><dd className="inline tnum">{order.ref}</dd></div>
              <div><dt className="inline text-ink-3">Payment: </dt><dd className="inline uppercase">{order.paymentMethod} · {order.paymentStatus.toLowerCase()}</dd></div>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-4 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Billed to</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              <span className="font-bold text-ink">{order.name}</span><br />
              {order.address}<br />
              {order.city}{order.state && `, ${order.state}`} — <span className="tnum">{order.pincode}</span><br />
              <span className="tnum">{order.phone}</span>
            </p>
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Place of supply</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              {order.city} — <span className="tnum">{order.pincode}</span><br />
              {local ? "Intra-state supply (CGST + SGST)" : "Inter-state supply (IGST)"}
            </p>
          </div>
        </section>

        <table className="mt-4 w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <th className="py-2 font-bold">Item</th>
              <th className="py-2 text-right font-bold">Qty</th>
              <th className="py-2 text-right font-bold">Taxable</th>
              <th className="py-2 text-right font-bold">GST {Math.round(GST_RATE * 100)}%</th>
              <th className="py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="py-2.5 pr-3 text-ink-2">
                  <span className="block font-semibold text-ink">{l.name}</span>
                  <span className="block text-[11px] text-ink-3 tnum">{l.sku}</span>
                </td>
                <td className="py-2.5 text-right text-ink-2 tnum">{l.qty}</td>
                <td className="py-2.5 text-right text-ink-2 tnum">{inr(l.taxable)}</td>
                <td className="py-2.5 text-right text-ink-2 tnum">{inr(l.tax)}</td>
                <td className="py-2.5 text-right font-semibold text-ink tnum">{inr(l.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-[280px] space-y-1.5 text-[13px]">
            <Row label="Taxable value" value={inr(totals.taxable)} />
            {local ? (
              <>
                <Row label={`CGST @ ${(GST_RATE * 50).toFixed(0)}%`} value={inr(totals.cgst)} />
                <Row label={`SGST @ ${(GST_RATE * 50).toFixed(0)}%`} value={inr(totals.sgst)} />
              </>
            ) : (
              <Row label={`IGST @ ${(GST_RATE * 100).toFixed(0)}%`} value={inr(totals.igst)} />
            )}
            {order.discount > 0 && <Row label={`Discount (${order.couponCode})`} value={`− ${inr(order.discount)}`} />}
            <Row label="Delivery" value={order.shipping ? inr(order.shipping) : "Free"} />
            <div className="flex justify-between border-t-2 border-ink pt-2 text-[16px] font-bold text-ink">
              <dt>Total paid</dt>
              <dd className="tnum">{inr(order.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-6 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-3">
          <p>
            All prices are inclusive of GST. This is a computer-generated invoice and does not
            require a signature. Goods once installed cannot be returned, but remain covered by
            the manufacturer&apos;s warranty for the period stated on the product page.
          </p>
          <p className="mt-2">
            Warranty and service claims: contact {store.phone || "the store"} quoting order {order.ref}.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold text-ink tnum">{value}</dd>
    </div>
  );
}
