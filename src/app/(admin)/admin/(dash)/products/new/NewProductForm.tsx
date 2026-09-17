"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHead, Card } from "@/components/admin/ui";
import { createProduct } from "../../../actions";

/**
 * Deliberately short. A new product starts as a draft with one price and one
 * stock number; everything else — variants, specs, images, highlights — is
 * added on the full editor once it exists.
 */
export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({
    name: "", brand: "Rexsun", categoryId: categories[0]?.id ?? "",
    mrp: "", price: "", stock: "25", tagline: "", own: true,
  });

  const set = (k: string, v: string | boolean) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProduct({
        name: f.name, brand: f.brand, categoryId: f.categoryId,
        mrp: Number(f.mrp) || 0, price: Number(f.price) || 0,
        stock: Number(f.stock) || 0, tagline: f.tagline, own: f.own,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/admin/products/${res.id}`);
    });
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <PageHead title="Add a product" sub="It is created as a draft — nothing appears on the shop until you set it live." />

      <div className="max-w-[720px] space-y-4">
        <Card title="The basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <L htmlFor="name">Product name</L>
              <I id="name" value={f.name} onChange={(v) => set("name", v)} placeholder="Rexsun Mixer Grinder 750W" />
            </div>
            <div>
              <L htmlFor="brand">Brand</L>
              <I id="brand" value={f.brand} onChange={(v) => set("brand", v)} />
            </div>
            <div>
              <L htmlFor="categoryId">Category</L>
              <select id="categoryId" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}
                className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <L htmlFor="tagline">One-line description</L>
              <I id="tagline" value={f.tagline} onChange={(v) => set("tagline", v)} placeholder="Perfect grinding every time" />
            </div>
          </div>
        </Card>

        <Card title="Price and stock">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <L htmlFor="mrp">MRP (₹)</L>
              <I id="mrp" value={f.mrp} onChange={(v) => set("mrp", v.replace(/\D/g, ""))} inputMode="numeric" />
            </div>
            <div>
              <L htmlFor="price">Selling price (₹)</L>
              <I id="price" value={f.price} onChange={(v) => set("price", v.replace(/\D/g, ""))} inputMode="numeric" />
            </div>
            <div>
              <L htmlFor="stock">Stock</L>
              <I id="stock" value={f.stock} onChange={(v) => set("stock", v.replace(/\D/g, ""))} inputMode="numeric" />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" checked={f.own} onChange={(e) => set("own", e.target.checked)}
              className="h-4 w-4 accent-[#d01c22]" />
            This is a Rexsun own-brand product
          </label>
        </Card>

        {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}

        <button type="submit" disabled={pending}
          className="rounded bg-rex-red px-5 py-3 text-[14.5px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
          {pending ? "Creating…" : "Create draft"}
        </button>
      </div>
    </form>
  );
}

function L({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="text-[13px] font-bold text-ink">{children}</label>;
}

function I({
  id, value, onChange, ...rest
}: { id: string; value: string; onChange: (v: string) => void } &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <input id={id} value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" {...rest} />
  );
}
