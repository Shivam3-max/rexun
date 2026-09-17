"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { bulkPrice } from "../../actions";

/**
 * Repricing by the slice a price list actually arrives in: a whole brand, or a
 * whole category. The two modes answer the two real questions — "sell this
 * range at 15% off MRP" and "put everything up 3%".
 */
export function BulkPricePanel({
  categories,
  brands,
}: {
  categories: { id: string; name: string }[];
  brands: { name: string; count: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"category" | "brand">("category");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [brand, setBrand] = useState(brands[0]?.name ?? "");
  const [mode, setMode] = useState<"discount-off-mrp" | "adjust-price">("discount-off-mrp");
  const [percent, setPercent] = useState("15");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const target = scope === "category"
    ? categories.find((c) => c.id === categoryId)?.name ?? ""
    : brand;

  const apply = () => {
    const n = Number(percent);
    const label = mode === "discount-off-mrp"
      ? `Sell all of ${target} at ${n}% off MRP?`
      : `Change every price in ${target} by ${n}%?`;
    if (!confirm(label)) return;

    setError("");
    startTransition(async () => {
      const res = await bulkPrice({
        scope: scope === "category" ? { categoryId } : { brand },
        mode,
        percent: n,
      });
      if (!res.ok) { setError(res.error); return; }
      setMsg(`Repriced ${res.count} products in ${target}`);
      router.refresh();
      setTimeout(() => setMsg(""), 5000);
    });
  };

  return (
    <Card title="Reprice in bulk" sub="Applies to every variant of every matching product">
      <div className="space-y-4">
        <div>
          <span className="text-[13px] font-bold text-ink">What to reprice</span>
          <div className="mt-1.5 flex gap-2">
            {(["category", "brand"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)}
                className={`flex-1 rounded border px-3 py-2 text-[13.5px] font-semibold capitalize ${
                  scope === s ? "border-rex-red bg-rex-red-tint text-rex-red" : "border-line-2 text-ink-2"
                }`}>
                {s === "category" ? "A category" : "A brand"}
              </button>
            ))}
          </div>
        </div>

        {scope === "category" ? (
          <div>
            <label htmlFor="cat" className="text-[13px] font-bold text-ink">Category</label>
            <select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="brand" className="text-[13px] font-bold text-ink">Brand</label>
            <select id="brand" value={brand} onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
              {brands.map((b) => <option key={b.name} value={b.name}>{b.name} ({b.count})</option>)}
            </select>
          </div>
        )}

        <div>
          <span className="text-[13px] font-bold text-ink">How</span>
          <div className="mt-1.5 space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded border border-line-2 p-2.5">
              <input type="radio" checked={mode === "discount-off-mrp"} onChange={() => setMode("discount-off-mrp")}
                className="mt-0.5 h-4 w-4 accent-[#d01c22]" />
              <span>
                <span className="block text-[13.5px] font-bold text-ink">Set a discount off MRP</span>
                <span className="block text-[12.5px] text-ink-2">Selling price becomes MRP minus this percentage.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded border border-line-2 p-2.5">
              <input type="radio" checked={mode === "adjust-price"} onChange={() => setMode("adjust-price")}
                className="mt-0.5 h-4 w-4 accent-[#d01c22]" />
              <span>
                <span className="block text-[13.5px] font-bold text-ink">Adjust the current price</span>
                <span className="block text-[12.5px] text-ink-2">Nudge prices up or down. Use a minus for a cut.</span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="pct" className="text-[13px] font-bold text-ink">Percentage</label>
          <input id="pct" value={percent} inputMode="decimal"
            onChange={(e) => setPercent(e.target.value.replace(/[^\d.-]/g, ""))}
            className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] tnum outline-none focus:border-rex-red" />
        </div>

        {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}
        {msg && (
          <p className="rounded border border-save/40 bg-save-tint px-3 py-2 text-[13px] font-semibold text-save">{msg}</p>
        )}

        <button type="button" onClick={apply} disabled={pending || !target}
          className="w-full rounded bg-rex-red py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
          {pending ? "Repricing…" : "Apply to " + (target || "…")}
        </button>
        <p className="text-[12px] text-ink-3">
          A selling price is never allowed above MRP — anything higher is clamped.
        </p>
      </div>
    </Card>
  );
}
