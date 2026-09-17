"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, PageHead } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { inr, discountPct } from "@/lib/pricing";
import { updateProduct, updateVariants, deleteProduct } from "../../../actions";

type VariantRow = {
  sku: string; label: string; mrp: number; price: number; stock: number; active: boolean;
};

type P = {
  id: string; slug: string; name: string; brand: string; tagline: string; description: string;
  categoryId: string; warranty: string; wattage: string; status: string;
  featured: boolean; own: boolean; estimatedPrice: boolean;
  highlights: string[]; specs: Record<string, string>; rooms: string[]; images: string[];
  variants: VariantRow[];
};

const TABS = ["Details", "Pricing & stock", "Images", "Specifications"] as const;

/**
 * Four tabs, each saving independently. Details and variants are separate
 * writes because they fail for different reasons — a bad price should not
 * throw away a rewritten description.
 */
export function ProductEditor({
  product,
  categories,
  allRooms,
}: {
  product: P;
  categories: { id: string; name: string }[];
  allRooms: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Details");
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [d, setD] = useState({
    name: product.name, brand: product.brand, tagline: product.tagline,
    description: product.description, categoryId: product.categoryId,
    warranty: product.warranty, wattage: product.wattage, status: product.status,
    featured: product.featured, own: product.own,
  });
  const [highlights, setHighlights] = useState<string[]>(
    product.highlights.length ? product.highlights : [""]
  );
  const [rooms, setRooms] = useState<string[]>(product.rooms);
  const [images, setImages] = useState<string[]>(product.images);
  const [specs, setSpecs] = useState<[string, string][]>(Object.entries(product.specs));
  const [variants, setVariants] = useState<VariantRow[]>(product.variants);

  const flash = (msg: string) => { setNote(msg); setError(""); setTimeout(() => setNote(""), 3500); };

  const saveDetails = () =>
    startTransition(async () => {
      const res = await updateProduct(product.id, {
        ...d,
        highlights,
        rooms,
        images,
        specs: Object.fromEntries(specs.filter(([k]) => k.trim())),
      });
      if (!res.ok) { setError(res.error); return; }
      flash("Saved");
      router.refresh();
    });

  const saveVariants = () =>
    startTransition(async () => {
      const res = await updateVariants(product.id, variants);
      if (!res.ok) { setError(res.error); return; }
      flash("Prices and stock saved");
      router.refresh();
    });

  const remove = () => {
    if (!confirm(`Delete “${product.name}”? If it appears on an order it is archived instead.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(product.id);
      if (!res.ok) { setError(res.error ?? "Could not delete"); return; }
      router.push("/admin/products");
    });
  };

  const setV = (i: number, key: keyof VariantRow, value: string | boolean) =>
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === i
          ? { ...v, [key]: typeof value === "boolean" ? value : key === "active" ? value : Number(value) || 0 }
          : v
      )
    );

  return (
    <>
      <PageHead
        title={product.name}
        sub={`/p/${product.slug} · ${product.variants.length} variant${product.variants.length === 1 ? "" : "s"}`}
        action={
          <div className="flex gap-2">
            <select value={d.status} onChange={(e) => setD((s) => ({ ...s, status: e.target.value }))}
              className="rounded border border-line-2 bg-card px-2.5 py-2 text-[13px] font-bold text-ink outline-none">
              <option value="ACTIVE">Live on shop</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button type="button" onClick={saveDetails} disabled={pending}
              className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        }
      />

      {product.estimatedPrice && (
        <p className="mb-4 rounded-card border border-rex-gold/40 bg-rex-gold-tint px-4 py-2.5 text-[13.5px] text-ink">
          This product carries an <strong>estimated price</strong>, filled in from its category when the
          catalogue was built. Saving a price on the Pricing tab clears the flag.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-[13.5px] font-bold ${
              tab === t ? "border-rex-red text-rex-red" : "border-transparent text-ink-3 hover:text-ink"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {(note || error) && (
        <p className={`mb-4 rounded border px-3 py-2 text-[13px] font-semibold ${
          error ? "border-rex-red/40 bg-rex-red-tint text-rex-red" : "border-save/40 bg-save-tint text-save"
        }`}>
          {error || note}
        </p>
      )}

      {tab === "Details" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <Card title="Product details">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <L htmlFor="name">Name</L>
                  <I id="name" value={d.name} onChange={(v) => setD((s) => ({ ...s, name: v }))} />
                </div>
                <div>
                  <L htmlFor="brand">Brand</L>
                  <I id="brand" value={d.brand} onChange={(v) => setD((s) => ({ ...s, brand: v }))} />
                </div>
                <div>
                  <L htmlFor="categoryId">Category</L>
                  <select id="categoryId" value={d.categoryId}
                    onChange={(e) => setD((s) => ({ ...s, categoryId: e.target.value }))}
                    className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <L htmlFor="tagline">One-line description</L>
                  <I id="tagline" value={d.tagline} onChange={(v) => setD((s) => ({ ...s, tagline: v }))} />
                  <p className="mt-1 text-[12px] text-ink-3">Shown under the product name on the shop.</p>
                </div>
                <div className="sm:col-span-2">
                  <L htmlFor="description">Full description</L>
                  <textarea id="description" rows={5} value={d.description}
                    onChange={(e) => setD((s) => ({ ...s, description: e.target.value }))}
                    className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
                </div>
                <div>
                  <L htmlFor="warranty">Warranty</L>
                  <I id="warranty" value={d.warranty} onChange={(v) => setD((s) => ({ ...s, warranty: v }))}
                    placeholder="2 Years Product Warranty" />
                </div>
                <div>
                  <L htmlFor="wattage">Wattage</L>
                  <I id="wattage" value={d.wattage} onChange={(v) => setD((s) => ({ ...s, wattage: v.replace(/\D/g, "") }))}
                    inputMode="numeric" />
                  <p className="mt-1 text-[12px] text-ink-3">Drives the running-cost figure on fans and lights.</p>
                </div>
              </div>
            </Card>

            <Card title="What you get" sub="Bullet points on the product page">
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={h}
                      onChange={(e) => setHighlights((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                      className="w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
                    <button type="button" onClick={() => setHighlights((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded border border-line-2 px-2.5 text-[13px] text-ink-3 hover:border-rex-red hover:text-rex-red">
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setHighlights((prev) => [...prev, ""])}
                  className="text-[13px] font-semibold text-rex-red hover:underline">
                  + Add a point
                </button>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Where it appears">
              <p className="text-[12.5px] font-bold uppercase tracking-wider text-ink-3">Rooms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allRooms.map((r) => {
                  const on = rooms.includes(r.slug);
                  return (
                    <button key={r.slug} type="button"
                      onClick={() => setRooms((prev) => (on ? prev.filter((x) => x !== r.slug) : [...prev, r.slug]))}
                      className={`rounded border px-3 py-1.5 text-[13px] font-semibold ${
                        on ? "border-rex-red bg-rex-red-tint text-rex-red" : "border-line-2 text-ink-2"
                      }`}>
                      {r.name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <label className="flex items-center gap-2 text-[13.5px] text-ink-2">
                  <input type="checkbox" checked={d.featured}
                    onChange={(e) => setD((s) => ({ ...s, featured: e.target.checked }))}
                    className="h-4 w-4 accent-[#d01c22]" />
                  Feature on the home page
                </label>
                <label className="flex items-center gap-2 text-[13.5px] text-ink-2">
                  <input type="checkbox" checked={d.own}
                    onChange={(e) => setD((s) => ({ ...s, own: e.target.checked }))}
                    className="h-4 w-4 accent-[#d01c22]" />
                  Rexsun own brand
                </label>
              </div>
            </Card>

            <Card title="Danger zone">
              <p className="text-[13px] text-ink-2">
                Archiving keeps the product out of the shop but leaves order history intact.
                Deleting is only possible for a product nobody has ever ordered.
              </p>
              <button type="button" onClick={remove} disabled={pending}
                className="mt-3 rounded border border-rex-red px-3.5 py-2 text-[13px] font-bold text-rex-red hover:bg-rex-red hover:text-white disabled:opacity-50">
                Delete this product
              </button>
            </Card>
          </div>
        </div>
      )}

      {tab === "Pricing & stock" && (
        <Card
          title="Variants"
          sub="Each row is a real item code. The shop shows the lowest active price."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 font-bold">Variant</th>
                  <th className="py-2 font-bold">Item code</th>
                  <th className="py-2 font-bold">MRP</th>
                  <th className="py-2 font-bold">Selling price</th>
                  <th className="py-2 font-bold">Discount</th>
                  <th className="py-2 font-bold">Stock</th>
                  <th className="py-2 font-bold">Selling?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {variants.map((v, i) => (
                  <tr key={v.sku}>
                    <td className="py-2 pr-3 font-semibold text-ink">{v.label}</td>
                    <td className="py-2 pr-3 text-ink-3 tnum">{v.sku}</td>
                    <td className="py-2 pr-3">
                      <N value={v.mrp} onChange={(x) => setV(i, "mrp", x)} />
                    </td>
                    <td className="py-2 pr-3">
                      <N value={v.price} onChange={(x) => setV(i, "price", x)} />
                    </td>
                    <td className="py-2 pr-3 text-ink-2 tnum">
                      {discountPct(v.mrp, v.price)}%
                    </td>
                    <td className="py-2 pr-3">
                      <N value={v.stock} onChange={(x) => setV(i, "stock", x)} />
                    </td>
                    <td className="py-2">
                      <input type="checkbox" checked={v.active}
                        onChange={(e) => setV(i, "active", e.target.checked)}
                        aria-label={`${v.sku} on sale`} className="h-4 w-4 accent-[#d01c22]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveVariants} disabled={pending}
              className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Saving…" : "Save prices and stock"}
            </button>
            <span className="text-[13px] text-ink-2 tnum">
              Shop shows from {inr(Math.min(...variants.filter((v) => v.active).map((v) => v.price), Infinity) || 0)}
            </span>
          </div>
        </Card>
      )}

      {tab === "Images" && (
        <Card title="Images" sub="The first image is the one used on listings and in the cart.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((src, i) => (
              <div key={`${src}-${i}`} className="rounded border border-line p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square w-full bg-white object-contain" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-ink-3">{src.split("/").pop()}</span>
                  <div className="flex gap-1">
                    {i > 0 && (
                      <button type="button" title="Make main image"
                        onClick={() => setImages((prev) => [prev[i], ...prev.filter((_, x) => x !== i)])}
                        className="rounded border border-line-2 px-1.5 text-[11px] font-bold text-ink-2 hover:border-ink">
                        ★
                      </button>
                    )}
                    <button type="button" onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))}
                      className="rounded border border-line-2 px-1.5 text-[11px] font-bold text-ink-3 hover:border-rex-red hover:text-rex-red">
                      ×
                    </button>
                  </div>
                </div>
                {i === 0 && (
                  <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-save">Main image</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 max-w-[420px]">
            <ImageField label="Add an image" value="" onChange={(url) => url && setImages((prev) => [...prev, url])} />
          </div>

          <button type="button" onClick={saveDetails} disabled={pending}
            className="mt-4 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
            {pending ? "Saving…" : "Save images"}
          </button>
        </Card>
      )}

      {tab === "Specifications" && (
        <Card title="Specifications" sub="Shown as the spec table on the product page.">
          <div className="space-y-2">
            {specs.map(([k, v], i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input value={k} placeholder="Sweep Size (mm)"
                  onChange={(e) => setSpecs((prev) => prev.map((row, idx) => (idx === i ? [e.target.value, row[1]] : row)))}
                  className="w-[40%] min-w-[140px] rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
                <input value={v} placeholder="1200"
                  onChange={(e) => setSpecs((prev) => prev.map((row, idx) => (idx === i ? [row[0], e.target.value] : row)))}
                  className="min-w-[140px] flex-1 rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
                <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded border border-line-2 px-2.5 text-[13px] text-ink-3 hover:border-rex-red hover:text-rex-red">
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setSpecs((prev) => [...prev, ["", ""]])}
              className="text-[13px] font-semibold text-rex-red hover:underline">
              + Add a specification
            </button>
          </div>

          <button type="button" onClick={saveDetails} disabled={pending}
            className="mt-4 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
            {pending ? "Saving…" : "Save specifications"}
          </button>
        </Card>
      )}

      <div className="h-10" />
    </>
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

function N({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <input value={value} inputMode="numeric" onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="w-24 rounded border border-line-2 px-2 py-1.5 text-[13.5px] tnum outline-none focus:border-rex-red" />
  );
}
