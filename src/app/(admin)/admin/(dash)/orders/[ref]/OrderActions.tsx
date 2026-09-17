"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { advanceOrder, updateOrderMeta, refundOrder } from "../../../actions";

// Mirrors the server's allowed transitions, so the panel never offers a move
// the action would refuse.
const NEXT: Record<string, { status: string; label: string; tone?: "danger" }[]> = {
  PLACED: [{ status: "CONFIRMED", label: "Confirm order" }, { status: "CANCELLED", label: "Cancel", tone: "danger" }],
  CONFIRMED: [{ status: "PACKED", label: "Mark packed" }, { status: "CANCELLED", label: "Cancel", tone: "danger" }],
  PACKED: [{ status: "SHIPPED", label: "Mark shipped" }, { status: "CANCELLED", label: "Cancel", tone: "danger" }],
  SHIPPED: [{ status: "DELIVERED", label: "Mark delivered" }],
  DELIVERED: [],
  CANCELLED: [],
};

export function OrderActions({
  order,
}: {
  order: {
    ref: string; status: string; paymentStatus: string;
    courier: string; trackingNumber: string; notes: string;
    invoiceNo: string | null; gatewayPaymentId: string | null; total: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    notes: order.notes,
    paymentStatus: order.paymentStatus,
  });

  const move = (status: string, label: string) => {
    if (status === "CANCELLED" && !confirm("Cancel this order? Stock goes back on the shelf.")) return;
    startTransition(async () => {
      const res = await advanceOrder(order.ref, status, note);
      if (!res.ok) { setError(res.error); return; }
      setMsg(`${label} — done`);
      setNote("");
      setError("");
      router.refresh();
      setTimeout(() => setMsg(""), 3500);
    });
  };

  const saveMeta = () =>
    startTransition(async () => {
      const res = await updateOrderMeta(order.ref, meta);
      if (!res.ok) { setError(res.error); return; }
      setMsg("Saved");
      setError("");
      router.refresh();
      setTimeout(() => setMsg(""), 3500);
    });

  const refund = () => {
    const how = order.gatewayPaymentId
      ? "This refunds the payment through the gateway."
      : "This records a refund you make by hand — no money moves automatically.";
    if (!confirm(`Refund ₹${order.total.toLocaleString("en-IN")}? ${how}`)) return;
    startTransition(async () => {
      const res = await refundOrder(order.ref);
      if (!res.ok) { setError(res.error); return; }
      setMsg("Refund recorded");
      setError("");
      router.refresh();
      setTimeout(() => setMsg(""), 3500);
    });
  };

  const moves = NEXT[order.status] ?? [];

  return (
    <>
      <Card title="What happens next">
        {moves.length === 0 ? (
          <p className="text-[13.5px] text-ink-2">
            This order is {order.status.toLowerCase()} — nothing further to do.
          </p>
        ) : (
          <>
            <label htmlFor="note" className="text-[12.5px] font-bold text-ink">Note (optional)</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth recording"
              className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
            <div className="mt-3 flex flex-wrap gap-2">
              {moves.map((m) => (
                <button key={m.status} type="button" disabled={pending} onClick={() => move(m.status, m.label)}
                  className={`rounded px-3.5 py-2 text-[13.5px] font-bold disabled:opacity-60 ${
                    m.tone === "danger"
                      ? "border border-rex-red text-rex-red hover:bg-rex-red hover:text-white"
                      : "bg-rex-red text-white hover:bg-rex-red-dark"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}

        {(msg || error) && (
          <p className={`mt-3 rounded border px-3 py-2 text-[13px] font-semibold ${
            error ? "border-rex-red/40 bg-rex-red-tint text-rex-red" : "border-save/40 bg-save-tint text-save"
          }`}>
            {error || msg}
          </p>
        )}
      </Card>

      <Card title="Invoice & refund">
        {order.invoiceNo ? (
          <>
            <p className="text-[13.5px] text-ink-2">
              Invoice <span className="font-bold text-ink tnum">{order.invoiceNo}</span>
            </p>
            <a href={`/order/${order.ref}/invoice`} target="_blank" rel="noreferrer"
              className="mt-2 inline-block rounded border border-ink px-3.5 py-2 text-[13px] font-bold text-ink hover:bg-ink hover:text-white">
              Open invoice
            </a>
          </>
        ) : (
          <p className="text-[13.5px] text-ink-2">
            An invoice number is assigned when the order is confirmed, so cancelled orders never
            take a number out of the sequence.
          </p>
        )}

        {order.paymentStatus !== "REFUNDED" && (
          <button type="button" onClick={refund} disabled={pending}
            className="mt-3 block w-full rounded border border-rex-red py-2.5 text-[13px] font-bold text-rex-red hover:bg-rex-red hover:text-white disabled:opacity-50">
            {order.gatewayPaymentId ? "Refund through the gateway" : "Record a manual refund"}
          </button>
        )}
      </Card>

      <Card title="Dispatch & payment">
        <div className="space-y-3">
          <div>
            <label htmlFor="courier" className="text-[12.5px] font-bold text-ink">Courier</label>
            <input id="courier" value={meta.courier} onChange={(e) => setMeta((m) => ({ ...m, courier: e.target.value }))}
              placeholder="Delhivery, Blue Dart, own van…"
              className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
          </div>
          <div>
            <label htmlFor="tracking" className="text-[12.5px] font-bold text-ink">Tracking number</label>
            <input id="tracking" value={meta.trackingNumber}
              onChange={(e) => setMeta((m) => ({ ...m, trackingNumber: e.target.value }))}
              className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] tnum outline-none focus:border-rex-red" />
            <p className="mt-1 text-[12px] text-ink-3">Shown to the customer on the tracking page.</p>
          </div>
          <div>
            <label htmlFor="paymentStatus" className="text-[12.5px] font-bold text-ink">Payment</label>
            <select id="paymentStatus" value={meta.paymentStatus}
              onChange={(e) => setMeta((m) => ({ ...m, paymentStatus: e.target.value }))}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2 text-[13.5px] font-semibold outline-none focus:border-rex-red">
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="text-[12.5px] font-bold text-ink">Internal notes</label>
            <textarea id="notes" rows={3} value={meta.notes}
              onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
              placeholder="Not shown to the customer"
              className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
          </div>
          <button type="button" onClick={saveMeta} disabled={pending}
            className="w-full rounded border border-ink py-2.5 text-[13.5px] font-bold text-ink hover:bg-ink hover:text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save dispatch details"}
          </button>
        </div>
      </Card>
    </>
  );
}
