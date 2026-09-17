"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["open", "PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrderFilters({
  current,
}: {
  current: { status: string; q: string; payment: string };
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);

  const go = (next: Partial<typeof current>) => {
    const merged = { ...current, ...next };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    router.push(`/admin/orders${sp.toString() ? `?${sp}` : ""}`);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form onSubmit={(e) => { e.preventDefault(); go({ q }); }} className="flex min-w-[220px] flex-1 gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Order number, name or phone"
          className="w-full rounded border border-line-2 bg-card px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
        <button type="submit" className="rounded border border-ink px-3 py-2 text-[13px] font-bold text-ink hover:bg-ink hover:text-white">
          Search
        </button>
      </form>

      <select value={current.status} onChange={(e) => go({ status: e.target.value })}
        className="rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-semibold text-ink outline-none">
        <option value="">Any status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s === "open" ? "Needs action" : s.toLowerCase()}</option>
        ))}
      </select>

      <select value={current.payment} onChange={(e) => go({ payment: e.target.value })}
        className="rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-semibold text-ink outline-none">
        <option value="">Any payment</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="netbanking">Net banking</option>
        <option value="cod">Cash on delivery</option>
      </select>

      {(current.status || current.q || current.payment) && (
        <button type="button" onClick={() => router.push("/admin/orders")}
          className="text-[13px] font-semibold text-rex-red hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}
