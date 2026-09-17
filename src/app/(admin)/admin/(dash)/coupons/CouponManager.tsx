"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Table, Pill } from "@/components/admin/ui";
import { inr } from "@/lib/pricing";
import { saveCoupon, deleteCoupon } from "../../actions";

type Row = {
  id: string; code: string; description: string; type: string; value: number;
  minOrder: number; maxDiscount: number | null; usageLimit: number | null;
  usedCount: number; active: boolean; startsAt: string; endsAt: string; given: number;
};

/** While editing, a cleared number field is null rather than 0. */
type Draft = Partial<Omit<Row, "value" | "minOrder" | "maxDiscount" | "usageLimit">> & {
  value?: number | null;
  minOrder?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
};

const empty: Draft = {
  code: "", description: "", type: "PERCENT", value: 10, minOrder: 0,
  maxDiscount: null, usageLimit: null, active: true, startsAt: "", endsAt: "",
};

export function CouponManager({ coupons }: { coupons: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const res = await saveCoupon({
        id: draft.id, code: draft.code ?? "", description: draft.description ?? "",
        type: draft.type ?? "PERCENT", value: Number(draft.value) || 0,
        minOrder: Number(draft.minOrder) || 0,
        maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null,
        usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
        startsAt: draft.startsAt ?? "", endsAt: draft.endsAt ?? "", active: draft.active ?? true,
      });
      if (!res.ok) { setError(res.error); return; }
      setDraft(null); setError(""); setMsg("Coupon saved"); router.refresh();
      setTimeout(() => setMsg(""), 3000);
    });
  };

  return (
    <>
      {(msg || error) && (
        <p className={`mb-4 rounded border px-3 py-2 text-[13px] font-semibold ${
          error ? "border-rex-red/40 bg-rex-red-tint text-rex-red" : "border-save/40 bg-save-tint text-save"
        }`}>{error || msg}</p>
      )}

      {draft ? (
        <Card title={draft.id ? `Edit ${draft.code}` : "New coupon"} className="mb-5">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
            <div>
              <L>Code</L>
              <input value={draft.code ?? ""} onChange={(e) => setDraft((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                placeholder="DIWALI10"
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] uppercase outline-none focus:border-rex-red" />
            </div>
            <div className="sm:col-span-2">
              <L>Description</L>
              <input value={draft.description ?? ""} onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
                placeholder="10% off during Diwali"
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
            <div>
              <L>Type</L>
              <select value={draft.type ?? "PERCENT"} onChange={(e) => setDraft((s) => ({ ...s, type: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                <option value="PERCENT">Percentage off</option>
                <option value="FLAT">Flat amount off</option>
              </select>
            </div>
            <div>
              <L>{draft.type === "FLAT" ? "Amount (₹)" : "Percentage"}</L>
              <N value={draft.value} onChange={(v) => setDraft((s) => ({ ...s, value: v }))} />
            </div>
            <div>
              <L>Minimum order (₹)</L>
              <N value={draft.minOrder} onChange={(v) => setDraft((s) => ({ ...s, minOrder: v }))} />
            </div>
            <div>
              <L>Maximum discount (₹)</L>
              <N value={draft.maxDiscount ?? undefined} onChange={(v) => setDraft((s) => ({ ...s, maxDiscount: v }))} />
              <p className="mt-1 text-[12px] text-ink-3">Caps a percentage coupon. Blank for no cap.</p>
            </div>
            <div>
              <L>Total uses allowed</L>
              <N value={draft.usageLimit ?? undefined} onChange={(v) => setDraft((s) => ({ ...s, usageLimit: v }))} />
            </div>
            <div>
              <L>Starts</L>
              <input type="date" value={draft.startsAt ?? ""} onChange={(e) => setDraft((s) => ({ ...s, startsAt: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
            <div>
              <L>Ends</L>
              <input type="date" value={draft.endsAt ?? ""} onChange={(e) => setDraft((s) => ({ ...s, endsAt: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-ink-2 sm:col-span-3">
              <input type="checkbox" checked={draft.active ?? true}
                onChange={(e) => setDraft((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 accent-[#d01c22]" />
              Customers can use this code right now
            </label>
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" disabled={pending} className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                Save coupon
              </button>
              <button type="button" onClick={() => setDraft(null)} className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={() => { setDraft(empty); setError(""); }}
          className="mb-4 rounded bg-rex-red px-3.5 py-2 text-[13.5px] font-bold text-white hover:bg-rex-red-dark">
          Create a coupon
        </button>
      )}

      <Table head={["Code", "What it does", "Minimum", "Used", "Given away", "Window", "Status", ""]}>
        {coupons.map((c) => (
          <tr key={c.id} className="hover:bg-page">
            <td className="px-3 py-2.5 font-bold text-ink tnum">{c.code}</td>
            <td className="px-3 py-2.5 text-ink-2">
              {c.type === "PERCENT" ? `${c.value}% off` : `${inr(c.value)} off`}
              {c.maxDiscount && <span className="text-ink-3"> (max {inr(c.maxDiscount)})</span>}
              <span className="block text-[12px] text-ink-3">{c.description}</span>
            </td>
            <td className="px-3 py-2.5 text-ink-2 tnum">{c.minOrder ? inr(c.minOrder) : "—"}</td>
            <td className="px-3 py-2.5 text-ink-2 tnum">
              {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
            </td>
            <td className="px-3 py-2.5 text-ink-2 tnum">{c.given ? inr(c.given) : "—"}</td>
            <td className="px-3 py-2.5 text-[12.5px] text-ink-3">
              {c.startsAt || c.endsAt ? `${c.startsAt || "any"} → ${c.endsAt || "any"}` : "Always"}
            </td>
            <td className="px-3 py-2.5"><Pill value={c.active ? "ACTIVE" : "DRAFT"} /></td>
            <td className="px-3 py-2.5 text-right">
              <button type="button" onClick={() => { setDraft(c); setError(""); }}
                className="text-[12.5px] font-bold text-rex-red hover:underline">
                Edit
              </button>
              <button type="button"
                onClick={() => {
                  if (!confirm(`Delete ${c.code}?`)) return;
                  startTransition(async () => { await deleteCoupon(c.id); router.refresh(); });
                }}
                className="ml-3 text-[12.5px] font-semibold text-ink-3 hover:text-rex-red">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <div className="h-10" />
    </>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-bold text-ink">{children}</span>;
}

function N({ value, onChange }: { value: number | undefined | null; onChange: (v: number | null) => void }) {
  return (
    <input value={value ?? ""} inputMode="numeric"
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        onChange(raw === "" ? null : Number(raw));
      }}
      className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] tnum outline-none focus:border-rex-red" />
  );
}
