"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { saveDepartment, saveCategory, deleteCategory } from "../../actions";

type Dept = { id: string; slug: string; name: string; blurb: string; image: string; visible: boolean; position: number };
type Cat = Omit<Dept, "blurb"> & { deptId: string; count: number };

export function TaxonomyManager({
  departments,
  categories,
}: {
  departments: Dept[];
  categories: Cat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editDept, setEditDept] = useState<Partial<Dept> | null>(null);
  const [editCat, setEditCat] = useState<Partial<Cat> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); setError(""); setTimeout(() => setMsg(""), 3000); };

  const submitDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    startTransition(async () => {
      const res = await saveDepartment({
        id: editDept.id, slug: editDept.slug ?? "", name: editDept.name ?? "",
        blurb: editDept.blurb ?? "", image: editDept.image ?? "",
        visible: editDept.visible ?? true, position: Number(editDept.position) || 0,
      });
      if (!res.ok) { setError(res.error); return; }
      setEditDept(null); flash("Department saved"); router.refresh();
    });
  };

  const submitCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCat) return;
    startTransition(async () => {
      const res = await saveCategory({
        id: editCat.id, slug: editCat.slug ?? "", name: editCat.name ?? "",
        deptId: editCat.deptId ?? departments[0]?.id ?? "", image: editCat.image ?? "",
        visible: editCat.visible ?? true, position: Number(editCat.position) || 0,
      });
      if (!res.ok) { setError(res.error); return; }
      setEditCat(null); flash("Category saved"); router.refresh();
    });
  };

  const removeCat = (c: Cat) => {
    if (!confirm(`Delete “${c.name}”?`)) return;
    startTransition(async () => {
      const res = await deleteCategory(c.id);
      if (!res.ok) { setError(res.error); return; }
      flash("Category deleted"); router.refresh();
    });
  };

  return (
    <>
      {(msg || error) && (
        <p className={`mb-4 rounded border px-3 py-2 text-[13px] font-semibold ${
          error ? "border-rex-red/40 bg-rex-red-tint text-rex-red" : "border-save/40 bg-save-tint text-save"
        }`}>
          {error || msg}
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => { setEditDept({ visible: true, position: departments.length }); setError(""); }}
          className="rounded bg-rex-red px-3.5 py-2 text-[13.5px] font-bold text-white hover:bg-rex-red-dark">
          Add a department
        </button>
        <button type="button" onClick={() => { setEditCat({ visible: true, position: categories.length, deptId: departments[0]?.id }); setError(""); }}
          className="rounded border border-ink px-3.5 py-2 text-[13.5px] font-bold text-ink hover:bg-ink hover:text-white">
          Add a category
        </button>
      </div>

      {editDept && (
        <Card title={editDept.id ? "Edit department" : "New department"} className="mb-4">
          <form onSubmit={submitDept} className="grid gap-4 sm:grid-cols-2">
            <F label="Name" value={editDept.name ?? ""} onChange={(v) => setEditDept((s) => ({ ...s, name: v }))} />
            <F label="Web address" value={editDept.slug ?? ""} onChange={(v) => setEditDept((s) => ({ ...s, slug: v }))}
              hint="Leave blank to generate from the name" />
            <div className="sm:col-span-2">
              <F label="Short description" value={editDept.blurb ?? ""} onChange={(v) => setEditDept((s) => ({ ...s, blurb: v }))} />
            </div>
            <div className="sm:col-span-2">
              <ImageField label="Menu icon" value={editDept.image ?? ""} onChange={(v) => setEditDept((s) => ({ ...s, image: v }))}
                hint="Square image, shown in the round icon strip on the home page" />
            </div>
            <F label="Order" value={String(editDept.position ?? 0)} onChange={(v) => setEditDept((s) => ({ ...s, position: Number(v) || 0 }))} inputMode="numeric" />
            <label className="flex items-end gap-2 pb-2 text-[13.5px] text-ink-2">
              <input type="checkbox" checked={editDept.visible ?? true}
                onChange={(e) => setEditDept((s) => ({ ...s, visible: e.target.checked }))}
                className="h-4 w-4 accent-[#d01c22]" />
              Show on the shop
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={() => setEditDept(null)} className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {editCat && (
        <Card title={editCat.id ? "Edit category" : "New category"} className="mb-4">
          <form onSubmit={submitCat} className="grid gap-4 sm:grid-cols-2">
            <F label="Name" value={editCat.name ?? ""} onChange={(v) => setEditCat((s) => ({ ...s, name: v }))} />
            <div>
              <span className="text-[13px] font-bold text-ink">Department</span>
              <select value={editCat.deptId ?? ""} onChange={(e) => setEditCat((s) => ({ ...s, deptId: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <F label="Web address" value={editCat.slug ?? ""} onChange={(v) => setEditCat((s) => ({ ...s, slug: v }))}
              hint="Leave blank to generate from the name" />
            <F label="Order" value={String(editCat.position ?? 0)} onChange={(v) => setEditCat((s) => ({ ...s, position: Number(v) || 0 }))} inputMode="numeric" />
            <label className="flex items-end gap-2 pb-2 text-[13.5px] text-ink-2">
              <input type="checkbox" checked={editCat.visible ?? true}
                onChange={(e) => setEditCat((s) => ({ ...s, visible: e.target.checked }))}
                className="h-4 w-4 accent-[#d01c22]" />
              Show on the shop
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={() => setEditCat(null)} className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {departments.map((d) => {
          const kids = categories.filter((c) => c.deptId === d.id);
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  {d.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt="" className="h-9 w-9 rounded-full border border-line object-cover" />
                  )}
                  <div>
                    <h3 className="text-[16px] font-bold text-ink">
                      {d.name}
                      {!d.visible && <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">hidden</span>}
                    </h3>
                    <p className="text-[12.5px] text-ink-3">/d/{d.slug} · {kids.length} categories</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/d/${d.slug}`} target="_blank" className="rounded border border-line-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink">
                    View ↗
                  </Link>
                  <button type="button" onClick={() => { setEditDept(d); setEditCat(null); setError(""); }}
                    className="rounded border border-line-2 px-2.5 py-1.5 text-[12.5px] font-bold text-ink hover:border-ink">
                    Edit
                  </button>
                </div>
              </div>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {kids.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-line px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {c.name}
                        {!c.visible && <span className="ml-1.5 text-[10.5px] uppercase text-ink-3">hidden</span>}
                      </span>
                      <span className="block text-[11.5px] text-ink-3 tnum">{c.count} products</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => { setEditCat(c); setEditDept(null); setError(""); }}
                        className="rounded border border-line-2 px-2 py-1 text-[11.5px] font-bold text-ink hover:border-ink">
                        Edit
                      </button>
                      {c.count === 0 && (
                        <button type="button" onClick={() => removeCat(c)}
                          className="rounded border border-line-2 px-2 py-1 text-[11.5px] font-bold text-ink-3 hover:border-rex-red hover:text-rex-red">
                          ×
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      <div className="h-10" />
    </>
  );
}

function F({
  label, value, onChange, hint, ...rest
}: { label: string; value: string; onChange: (v: string) => void; hint?: string } &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" {...rest} />
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}
