"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, dateLong, Money } from "@/components/admin/ui";
import { resolveReturn } from "../../actions";

type R = {
  id: string; sku: string; itemName: string; qty: number; type: string;
  reason: string; detail: string; status: string; resolution: string; createdAt: string;
  order: { ref: string; name: string; phone: string; city: string; total: number; paymentMethod: string };
};

export function ReturnQueue({ requests }: { requests: R[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const act = (r: R, status: string) =>
    startTransition(async () => {
      const res = await resolveReturn(r.id, status, notes[r.id] ?? r.resolution);
      if (!res.ok) { setError(res.error); return; }
      setError("");
      router.refresh();
    });

  return (
    <>
      {error && (
        <p className="mb-3 rounded border border-rex-red/40 bg-rex-red-tint px-3 py-2 text-[13px] font-semibold text-rex-red">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <article key={r.id} className="overflow-hidden rounded-card border border-line bg-card">
            <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <Pill value={r.status === "OPEN" ? "NEW" : r.status} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">
                  {r.type === "REFUND" ? "Refund" : "Replacement"} — {r.itemName}
                </span>
                <span className="block text-[12.5px] text-ink-2">
                  {r.reason} · {r.order.name} · <span className="tnum">{r.order.phone}</span> · {r.order.city}
                </span>
              </span>
              <Link href={`/admin/orders/${r.order.ref}`} className="shrink-0 text-[12.5px] font-bold text-rex-red hover:underline">
                {r.order.ref}
              </Link>
              <span className="shrink-0 text-[12.5px] text-ink-3 tnum"><Money n={r.order.total} /></span>
            </header>

            <div className="px-4 py-3">
              {r.detail && (
                <p className="mb-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">
                  “{r.detail}”
                </p>
              )}
              <p className="text-[12px] text-ink-3 tnum">
                Raised {dateLong(r.createdAt)} · item code {r.sku} · qty {r.qty} · paid by {r.order.paymentMethod.toUpperCase()}
              </p>

              {r.status === "OPEN" || r.status === "APPROVED" ? (
                <>
                  <label htmlFor={`res-${r.id}`} className="mt-3 block text-[12.5px] font-bold text-ink">
                    What you decided (the customer sees this)
                  </label>
                  <input id={`res-${r.id}`} value={notes[r.id] ?? r.resolution}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Pickup booked for Thursday, replacement ships the same day"
                    className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "OPEN" && (
                      <>
                        <button type="button" disabled={pending} onClick={() => act(r, "APPROVED")}
                          className="rounded bg-rex-red px-3.5 py-2 text-[13px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
                          Approve
                        </button>
                        <button type="button" disabled={pending} onClick={() => act(r, "REJECTED")}
                          className="rounded border border-line-2 px-3.5 py-2 text-[13px] font-bold text-ink-2 hover:border-rex-red hover:text-rex-red disabled:opacity-60">
                          Decline
                        </button>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <button type="button" disabled={pending} onClick={() => act(r, "RESOLVED")}
                        className="rounded bg-save px-3.5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60">
                        Mark resolved
                      </button>
                    )}
                    <a href={`https://wa.me/91${r.order.phone}`} target="_blank" rel="noreferrer"
                      className="rounded border border-save px-3.5 py-2 text-[13px] font-bold text-save hover:bg-save hover:text-white">
                      WhatsApp them
                    </a>
                  </div>
                </>
              ) : (
                r.resolution && <p className="mt-2 text-[13px] text-ink-2">Outcome: {r.resolution}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
