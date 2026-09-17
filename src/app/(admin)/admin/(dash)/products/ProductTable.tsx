"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, Table } from "@/components/admin/ui";
import { inr, priceRange } from "@/lib/pricing";
import { setProductStatus, setFeatured, bulkStock, bulkPrice } from "../../actions";

type Row = {
  id: string; slug: string; name: string; brand: string; category: string;
  status: string; own: boolean; featured: boolean; estimatedPrice: boolean;
  price: number; priceMax: number; mrp: number; image: string | null;
  variantCount: number; stock: number;
};

/**
 * The products list. Selection drives a bulk bar that only appears when
 * something is selected — the page is a catalogue first and a control panel
 * second, so the controls stay out of the way until they are wanted.
 */
export function ProductTable({
  products,
  categories,
  brands,
  filters,
  page,
  pageCount,
}: {
  products: Row[];
  categories: { id: string; name: string }[];
  brands: { name: string; count: number }[];
  filters: { q: string; status: string; cat: string; brand: string };
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState(filters.q);
  const [note, setNote] = useState("");
  const [stockValue, setStockValue] = useState("25");
  const [pricePercent, setPricePercent] = useState("10");

  const go = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (!("page" in next)) sp.delete("page");
    router.push(`/admin/products?${sp.toString()}`);
  };

  const allPicked = products.length > 0 && picked.length === products.length;
  const toggleAll = () => setPicked(allPicked ? [] : products.map((p) => p.id));
  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startTransition(async () => {
      const res = await fn();
      setNote(res.ok ? done : (res.error ?? "Something went wrong"));
      if (res.ok) setPicked([]);
      router.refresh();
      setTimeout(() => setNote(""), 4000);
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); go({ q }); }}
          className="flex min-w-[220px] flex-1 gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, brand or web address"
            className="w-full rounded border border-line-2 bg-card px-3 py-2 text-[13.5px] outline-none focus:border-rex-red"
          />
          <button type="submit" className="rounded border border-ink px-3 py-2 text-[13px] font-bold text-ink hover:bg-ink hover:text-white">
            Search
          </button>
        </form>

        <select value={filters.status} onChange={(e) => go({ status: e.target.value })}
          className="rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-semibold text-ink outline-none">
          <option value="">Any status</option>
          <option value="ACTIVE">Live</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select value={filters.cat} onChange={(e) => go({ cat: e.target.value })}
          className="max-w-[190px] rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-semibold text-ink outline-none">
          <option value="">Any category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={filters.brand} onChange={(e) => go({ brand: e.target.value })}
          className="rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-semibold text-ink outline-none">
          <option value="">Any brand</option>
          {brands.map((b) => <option key={b.name} value={b.name}>{b.name} ({b.count})</option>)}
        </select>

        {(filters.q || filters.status || filters.cat || filters.brand) && (
          <button type="button" onClick={() => router.push("/admin/products")}
            className="text-[13px] font-semibold text-rex-red hover:underline">
            Clear
          </button>
        )}
      </div>

      {picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-ink bg-ink px-3 py-2.5 text-white">
          <span className="text-[13px] font-bold tnum">{picked.length} selected</span>
          <span className="h-4 w-px bg-white/25" />

          <button type="button" disabled={pending} onClick={() => run(() => setProductStatus(picked, "ACTIVE"), "Set live")}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Set live
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setProductStatus(picked, "DRAFT"), "Moved to draft")}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Draft
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setProductStatus(picked, "ARCHIVED"), "Archived")}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Archive
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setFeatured(picked, true), "Featured")}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Feature
          </button>

          <span className="h-4 w-px bg-white/25" />
          <label className="flex items-center gap-1.5 text-[12.5px]">
            Stock
            <input value={stockValue} onChange={(e) => setStockValue(e.target.value.replace(/\D/g, ""))}
              className="w-14 rounded bg-white/15 px-2 py-1 text-[12.5px] tnum outline-none" />
          </label>
          <button type="button" disabled={pending}
            onClick={() => run(() => bulkStock(picked, Number(stockValue) || 0), `Stock set to ${stockValue}`)}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Apply
          </button>

          <span className="h-4 w-px bg-white/25" />
          <label className="flex items-center gap-1.5 text-[12.5px]">
            Discount off MRP
            <input value={pricePercent} onChange={(e) => setPricePercent(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-14 rounded bg-white/15 px-2 py-1 text-[12.5px] tnum outline-none" />%
          </label>
          <button type="button" disabled={pending}
            onClick={() => run(
              () => bulkPrice({ scope: { ids: picked }, mode: "discount-off-mrp", percent: Number(pricePercent) || 0 }),
              `Repriced at ${pricePercent}% off MRP`
            )}
            className="rounded border border-white/30 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white">
            Reprice
          </button>

          <button type="button" onClick={() => setPicked([])} className="ml-auto text-[12.5px] text-white/70 hover:text-white">
            Clear selection
          </button>
        </div>
      )}

      {note && (
        <p className="mb-3 rounded border border-save/40 bg-save-tint px-3 py-2 text-[13px] font-semibold text-save">
          {note}
        </p>
      )}

      <Table head={["", "Product", "Category", "Price", "Stock", "Status", ""]}>
        {products.map((p) => (
          <tr key={p.id} className="hover:bg-page">
            <td className="px-3 py-2">
              <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)}
                aria-label={`Select ${p.name}`} className="h-4 w-4 accent-[#d01c22]" />
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2.5">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded border border-line bg-white object-contain p-0.5" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded border border-line bg-page text-[9px] text-ink-3">
                    no img
                  </span>
                )}
                <span className="min-w-0">
                  <Link href={`/admin/products/${p.id}`} className="block truncate font-semibold text-ink hover:text-rex-red">
                    {p.name}
                  </Link>
                  <span className="block text-[11.5px] text-ink-3">
                    {p.brand}
                    {p.own && <span className="ml-1.5 font-bold text-rex-red">OWN</span>}
                    {p.featured && <span className="ml-1.5 text-rex-gold">★</span>}
                    {p.variantCount > 1 && <span className="ml-1.5 tnum">{p.variantCount} variants</span>}
                  </span>
                </span>
              </div>
            </td>
            <td className="px-3 py-2 text-ink-2">{p.category}</td>
            <td className="px-3 py-2">
              <span className="font-semibold text-ink tnum">{priceRange(p.price, p.priceMax)}</span>
              {p.mrp > p.price && (
                <span className="block text-[11.5px] text-ink-3 line-through tnum">{inr(p.mrp)}</span>
              )}
              {p.estimatedPrice && (
                <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#8A5A05]">
                  estimated
                </span>
              )}
            </td>
            <td className={`px-3 py-2 tnum ${p.stock === 0 ? "font-bold text-rex-red" : p.stock <= 5 ? "font-bold text-[#8A5A05]" : "text-ink-2"}`}>
              {p.stock}
            </td>
            <td className="px-3 py-2"><Pill value={p.status} /></td>
            <td className="px-3 py-2 text-right">
              <Link href={`/admin/products/${p.id}`} className="text-[12.5px] font-bold text-rex-red hover:underline">
                Edit
              </Link>
              <Link href={`/p/${p.slug}`} target="_blank" className="ml-3 text-[12.5px] font-semibold text-ink-3 hover:text-ink">
                View ↗
              </Link>
            </td>
          </tr>
        ))}
      </Table>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}
            className="rounded border border-line-2 bg-card px-3 py-1.5 text-[13px] font-semibold text-ink disabled:opacity-40">
            Previous
          </button>
          <span className="text-[13px] text-ink-2 tnum">Page {page} of {pageCount}</span>
          <button type="button" disabled={page >= pageCount} onClick={() => go({ page: String(page + 1) })}
            className="rounded border border-line-2 bg-card px-3 py-1.5 text-[13px] font-semibold text-ink disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      <div className="h-10" />
    </>
  );
}
