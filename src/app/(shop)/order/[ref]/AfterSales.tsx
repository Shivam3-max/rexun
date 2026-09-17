"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder, requestReturn } from "@/app/actions/shop";

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found it cheaper elsewhere",
  "Delivery is taking too long",
  "Changed my mind",
];

const RETURN_REASONS = [
  "Arrived damaged",
  "Wrong item delivered",
  "Missing parts from the box",
  "Does not switch on",
  "Not as described",
];

/**
 * The two things a customer can do to their own order without calling anyone:
 * stop it before it ships, and ask for a replacement after it arrives. Both
 * are gated server-side on the order's real status, so the buttons can be
 * honest about what is still possible.
 */
export function AfterSales({
  orderRef,
  phone,
  status,
  items,
  openReturns,
}: {
  orderRef: string;
  phone: string;
  status: string;
  items: { sku: string; name: string }[];
  openReturns: { sku: string; type: string; status: string; resolution: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"none" | "cancel" | "return">("none");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [sku, setSku] = useState(items[0]?.sku ?? "");
  const [type, setType] = useState("REPLACE");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const canCancel = ["PLACED", "CONFIRMED"].includes(status);
  const canReturn = status === "DELIVERED";

  const submitCancel = () =>
    startTransition(async () => {
      const res = await cancelOrder(orderRef, phone, reason);
      if (!res.ok) { setError(res.error); return; }
      setDone("Your order has been cancelled.");
      setMode("none");
      router.refresh();
    });

  const submitReturn = () =>
    startTransition(async () => {
      const res = await requestReturn({ ref: orderRef, phone, sku, type, reason, detail });
      if (!res.ok) { setError(res.error); return; }
      setDone("We have your request — someone will call you within one working day.");
      setMode("none");
      router.refresh();
    });

  if (!canCancel && !canReturn && openReturns.length === 0) return null;

  return (
    <div className="mt-4 rounded-card border border-line bg-card p-4">
      <h2 className="text-[15px] font-bold text-ink">Need to change something?</h2>

      {openReturns.length > 0 && (
        <ul className="mt-3 space-y-2">
          {openReturns.map((r) => (
            <li key={r.sku} className="rounded border border-line bg-page px-3 py-2 text-[13px]">
              <span className="font-bold text-ink">
                {r.type === "REFUND" ? "Refund" : "Replacement"} request — {r.status.toLowerCase()}
              </span>
              {r.resolution && <span className="mt-0.5 block text-ink-2">{r.resolution}</span>}
            </li>
          ))}
        </ul>
      )}

      {done && (
        <p className="mt-3 rounded border border-save/40 bg-save-tint px-3 py-2 text-[13px] font-semibold text-save">
          {done}
        </p>
      )}

      {mode === "none" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canCancel && (
            <button type="button" onClick={() => { setMode("cancel"); setReason(CANCEL_REASONS[0]); setError(""); }}
              className="rounded border border-line-2 px-3.5 py-2 text-[13.5px] font-bold text-ink hover:border-rex-red hover:text-rex-red">
              Cancel this order
            </button>
          )}
          {canReturn && (
            <button type="button" onClick={() => { setMode("return"); setReason(RETURN_REASONS[0]); setError(""); }}
              className="rounded border border-ink px-3.5 py-2 text-[13.5px] font-bold text-ink hover:bg-ink hover:text-white">
              Request a replacement
            </button>
          )}
        </div>
      )}

      {mode === "cancel" && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="cancel-reason" className="text-[13px] font-bold text-ink">Why are you cancelling?</label>
            <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
              {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <p className="text-[12.5px] text-ink-2">
            Anything already paid is refunded to the same account within 5 working days.
          </p>
          {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submitCancel} disabled={pending}
              className="rounded bg-rex-red px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button type="button" onClick={() => setMode("none")}
              className="rounded border border-line-2 px-4 py-2.5 text-[13.5px] font-bold text-ink">
              Keep my order
            </button>
          </div>
        </div>
      )}

      {mode === "return" && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="ret-sku" className="text-[13px] font-bold text-ink">Which item?</label>
            <select id="ret-sku" value={sku} onChange={(e) => setSku(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
              {items.map((i) => <option key={i.sku} value={i.sku}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ret-reason" className="text-[13px] font-bold text-ink">What is wrong?</label>
            <select id="ret-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
              {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <span className="text-[13px] font-bold text-ink">What would you like?</span>
            <div className="mt-1.5 flex gap-2">
              {[["REPLACE", "A replacement"], ["REFUND", "A refund"]].map(([v, label]) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={`flex-1 rounded border px-3 py-2 text-[13.5px] font-semibold ${
                    type === v ? "border-rex-red bg-rex-red-tint text-rex-red" : "border-line-2 text-ink-2"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ret-detail" className="text-[13px] font-bold text-ink">Anything else we should know?</label>
            <textarea id="ret-detail" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
          </div>
          {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submitReturn} disabled={pending}
              className="rounded bg-rex-red px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Sending…" : "Send request"}
            </button>
            <button type="button" onClick={() => setMode("none")}
              className="rounded border border-line-2 px-4 py-2.5 text-[13.5px] font-bold text-ink">
              Cancel
            </button>
          </div>
          <p className="text-[12.5px] text-ink-2">
            We arrange the pickup — you do not courier anything yourself.
          </p>
        </div>
      )}
    </div>
  );
}
