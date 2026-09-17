"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOneStock } from "../../actions";

/**
 * Inline stock edit. Saves on blur or Enter — a stock count is the one number
 * in this panel that gets changed dozens of times in a row, so it should never
 * cost a page load.
 */
export function StockEditor({
  sku,
  productId,
  stock,
}: {
  sku: string;
  productId: string;
  stock: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === stock) { setValue(String(stock)); return; }
    startTransition(async () => {
      await setOneStock(sku, productId, n);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1800);
    });
  };

  return (
    <span className="flex items-center gap-2">
      <input
        value={value}
        inputMode="numeric"
        aria-label={`Stock for ${sku}`}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className={`w-20 rounded border px-2 py-1.5 text-[13.5px] tnum outline-none focus:border-rex-red ${
          Number(value) === 0 ? "border-rex-red/50 text-rex-red" : "border-line-2"
        }`}
      />
      {pending && <span className="text-[11.5px] text-ink-3">saving…</span>}
      {saved && <span className="text-[11.5px] font-bold text-save">saved</span>}
    </span>
  );
}
