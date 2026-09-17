"use client";

import { useState, useTransition } from "react";
import { saveAddress, deleteAddress } from "@/app/actions/account";

type Row = {
  id: string; label: string; name: string; phone: string;
  line1: string; city: string; state: string; pincode: string; isDefault: boolean;
};

const blank = (d: { name: string; phone: string }): Omit<Row, "id"> & { id?: string } => ({
  label: "Home", name: d.name, phone: d.phone, line1: "", city: "", state: "", pincode: "", isDefault: false,
});

export function AddressBook({
  addresses,
  defaults,
}: {
  addresses: Row[];
  defaults: { name: string; phone: string };
}) {
  const [editing, setEditing] = useState<(Omit<Row, "id"> & { id?: string }) | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError("");
    startTransition(async () => {
      const res = await saveAddress(editing);
      if (!res.ok) { setError(res.error); return; }
      setEditing(null);
    });
  };

  const set = (k: keyof Row, v: string | boolean) =>
    setEditing((s) => (s ? { ...s, [k]: v } : s));

  return (
    <>
      <ul className="mt-5 space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
                  {a.label}
                  {a.isDefault && (
                    <span className="rounded bg-save-tint px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-save">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[13.5px] text-ink-2">
                  {a.name} · {a.phone}<br />{a.line1}<br />{a.city} {a.pincode}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(a); setError(""); }}
                  className="rounded border border-line-2 px-3 py-1.5 text-[12.5px] font-bold text-ink hover:border-ink">
                  Edit
                </button>
                <button type="button"
                  onClick={() => startTransition(async () => { await deleteAddress(a.id); })}
                  className="rounded border border-line-2 px-3 py-1.5 text-[12.5px] font-bold text-ink-3 hover:border-rex-red hover:text-rex-red">
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!editing && (
        <button type="button" onClick={() => { setEditing(blank(defaults)); setError(""); }}
          className="mt-4 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark">
          Add an address
        </button>
      )}

      {editing && (
        <form onSubmit={submit} className="mt-4 rounded-card border border-line bg-card p-5">
          <h2 className="text-[16px] font-bold text-ink">{editing.id ? "Edit address" : "New address"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <F id="label" label="Nickname" value={editing.label} onChange={(v) => set("label", v)} />
            <F id="name" label="Full name" value={editing.name} onChange={(v) => set("name", v)} />
            <F id="phone" label="Mobile number" value={editing.phone} onChange={(v) => set("phone", v)} inputMode="numeric" maxLength={10} />
            <F id="pincode" label="Pincode" value={editing.pincode} onChange={(v) => set("pincode", v)} inputMode="numeric" maxLength={6} />
            <F id="city" label="City" value={editing.city} onChange={(v) => set("city", v)} />
            <F id="state" label="State" value={editing.state} onChange={(v) => set("state", v)} />
            <div className="sm:col-span-2">
              <label htmlFor="line1" className="text-[13px] font-bold text-ink">Address</label>
              <textarea id="line1" rows={3} value={editing.line1} onChange={(e) => set("line1", e.target.value)}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14.5px] outline-none focus:border-rex-red" />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" checked={editing.isDefault} onChange={(e) => set("isDefault", e.target.checked)}
              className="h-4 w-4 accent-[#d01c22]" />
            Use this address by default
          </label>
          {error && <p className="mt-2 text-[13px] font-semibold text-rex-red">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={pending}
              className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
              {pending ? "Saving…" : "Save address"}
            </button>
            <button type="button" onClick={() => setEditing(null)}
              className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink hover:border-ink">
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function F({
  id, label, value, onChange, ...rest
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold text-ink">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14.5px] outline-none focus:border-rex-red" {...rest} />
    </div>
  );
}
