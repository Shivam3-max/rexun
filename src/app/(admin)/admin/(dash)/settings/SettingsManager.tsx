"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, dateShort, Pill } from "@/components/admin/ui";
import { inr } from "@/lib/pricing";
import { saveSetting, saveStaff } from "../../actions";

type Store = {
  name: string; tagline: string; phone: string; whatsapp: string;
  email: string; address: string; gstin: string; hours: string;
};
type Shipping = {
  freeOver: number; flatRate: number; codLimit: number;
  tricityDays: number; northDays: number; restDays: number;
};
type Staff = {
  id: string; email: string; name: string; role: string;
  active: boolean; lastLoginAt: string | null;
};

export function SettingsManager({
  store: store0,
  shipping: shipping0,
  payments: payments0,
  running: running0,
  staff,
  isOwner,
}: {
  store: Store;
  shipping: Shipping;
  payments: Record<string, boolean>;
  running: { hoursPerDay: number; ratePerUnit: number };
  staff: Staff[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [store, setStore] = useState(store0);
  const [shipping, setShipping] = useState(shipping0);
  const [payments, setPayments] = useState(payments0);
  const [running, setRunning] = useState(running0);
  const [draft, setDraft] = useState<(Partial<Staff> & { password?: string }) | null>(null);

  const save = (key: string, value: unknown, label: string) =>
    startTransition(async () => {
      const res = await saveSetting(key, value);
      if (!res.ok) { setError(res.error); return; }
      setError(""); setMsg(`${label} saved`); router.refresh();
      setTimeout(() => setMsg(""), 3000);
    });

  const submitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const res = await saveStaff({
        id: draft.id, email: draft.email ?? "", name: draft.name ?? "",
        password: draft.password ?? "", role: draft.role ?? "STAFF", active: draft.active ?? true,
      });
      if (!res.ok) { setError(res.error); return; }
      setDraft(null); setError(""); setMsg("Staff account saved"); router.refresh();
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Store details" sub="Shown in the footer, on the contact page and on invoices">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Store name" value={store.name} onChange={(v) => setStore((s) => ({ ...s, name: v }))} />
            <F label="Tagline" value={store.tagline} onChange={(v) => setStore((s) => ({ ...s, tagline: v }))} />
            <F label="Phone" value={store.phone} onChange={(v) => setStore((s) => ({ ...s, phone: v }))} />
            <F label="WhatsApp" value={store.whatsapp} onChange={(v) => setStore((s) => ({ ...s, whatsapp: v }))} />
            <F label="Email" value={store.email} onChange={(v) => setStore((s) => ({ ...s, email: v }))} />
            <F label="Working hours" value={store.hours} onChange={(v) => setStore((s) => ({ ...s, hours: v }))} />
            <F label="GSTIN" value={store.gstin} onChange={(v) => setStore((s) => ({ ...s, gstin: v }))} />
            <div className="sm:col-span-2">
              <span className="text-[13px] font-bold text-ink">Registered address</span>
              <textarea rows={2} value={store.address} onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
          </div>
          <Save onClick={() => save("store", store, "Store details")} pending={pending} />
        </Card>

        <Card title="Delivery" sub="Applies across the shop and at checkout">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Free delivery over (₹)" value={String(shipping.freeOver)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, freeOver: Number(v.replace(/\D/g, "")) || 0 }))} />
            <F label="Delivery charge below that (₹)" value={String(shipping.flatRate)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, flatRate: Number(v.replace(/\D/g, "")) || 0 }))} />
            <F label="Cash on delivery limit (₹)" value={String(shipping.codLimit)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, codLimit: Number(v.replace(/\D/g, "")) || 0 }))} />
            <div />
            <F label="Tricity, days" value={String(shipping.tricityDays)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, tricityDays: Number(v.replace(/\D/g, "")) || 0 }))} />
            <F label="North India, days" value={String(shipping.northDays)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, northDays: Number(v.replace(/\D/g, "")) || 0 }))} />
            <F label="Rest of India, days" value={String(shipping.restDays)} inputMode="numeric"
              onChange={(v) => setShipping((s) => ({ ...s, restDays: Number(v.replace(/\D/g, "")) || 0 }))} />
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            A cart of {inr(shipping.freeOver)} or more ships free; below that it is {inr(shipping.flatRate)}.
          </p>
          <Save onClick={() => save("shipping", shipping, "Delivery rules")} pending={pending} />
        </Card>

        <Card title="Payment methods" sub="Unticking one removes it from checkout">
          <div className="space-y-2">
            {[["upi", "UPI"], ["card", "Card"], ["netbanking", "Net banking"], ["cod", "Cash on delivery"]].map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 text-[14px] text-ink-2">
                <input type="checkbox" checked={payments[id] !== false}
                  onChange={(e) => setPayments((p) => ({ ...p, [id]: e.target.checked }))}
                  className="h-4 w-4 accent-[#d01c22]" />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            No payment gateway is connected yet, so prepaid orders are recorded as pending and
            collected by hand. Cash on delivery works end to end today.
          </p>
          <Save onClick={() => save("payments", payments, "Payment methods")} pending={pending} />
        </Card>

        <Card title="Running-cost figures" sub="Drives the yearly cost shown on fans and lights">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Hours used per day" value={String(running.hoursPerDay)} inputMode="numeric"
              onChange={(v) => setRunning((r) => ({ ...r, hoursPerDay: Number(v.replace(/\D/g, "")) || 0 }))} />
            <F label="Electricity, ₹ per unit" value={String(running.ratePerUnit)} inputMode="numeric"
              onChange={(v) => setRunning((r) => ({ ...r, ratePerUnit: Number(v.replace(/\D/g, "")) || 0 }))} />
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            A 35 W fan works out at {inr(Math.round((35 / 1000) * running.hoursPerDay * 365 * running.ratePerUnit))} a year
            on these figures.
          </p>
          <Save onClick={() => save("running", running, "Running-cost figures")} pending={pending} />
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">Staff access</h2>
      {!isOwner && (
        <p className="mb-3 text-[13.5px] text-ink-2">Only an owner can add or change staff accounts.</p>
      )}

      {draft && isOwner && (
        <Card title={draft.id ? "Edit staff account" : "New staff account"} className="mb-4">
          <form onSubmit={submitStaff} className="grid gap-3 sm:grid-cols-2">
            <F label="Name" value={draft.name ?? ""} onChange={(v) => setDraft((s) => ({ ...s, name: v }))} />
            <F label="Email" value={draft.email ?? ""} onChange={(v) => setDraft((s) => ({ ...s, email: v }))} />
            <F label={draft.id ? "New password (leave blank to keep)" : "Password"} value={draft.password ?? ""}
              type="password" onChange={(v) => setDraft((s) => ({ ...s, password: v }))} />
            <div>
              <span className="text-[13px] font-bold text-ink">Role</span>
              <select value={draft.role ?? "STAFF"} onChange={(e) => setDraft((s) => ({ ...s, role: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                <option value="ADMIN">Owner — full access including staff</option>
                <option value="STAFF">Staff — everything except staff accounts</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-ink-2 sm:col-span-2">
              <input type="checkbox" checked={draft.active ?? true}
                onChange={(e) => setDraft((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 accent-[#d01c22]" />
              Can sign in
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={() => setDraft(null)} className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {isOwner && !draft && (
        <button type="button" onClick={() => { setDraft({ role: "STAFF", active: true }); setError(""); }}
          className="mb-3 rounded bg-rex-red px-3.5 py-2 text-[13.5px] font-bold text-white hover:bg-rex-red-dark">
          Add a staff account
        </button>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-card">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-page text-left text-[11px] uppercase tracking-wider text-ink-3">
              <th className="px-3 py-2.5 font-bold">Name</th>
              <th className="px-3 py-2.5 font-bold">Email</th>
              <th className="px-3 py-2.5 font-bold">Role</th>
              <th className="px-3 py-2.5 font-bold">Last signed in</th>
              <th className="px-3 py-2.5 font-bold">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-page">
                <td className="px-3 py-2.5 font-semibold text-ink">{s.name}</td>
                <td className="px-3 py-2.5 text-ink-2">{s.email}</td>
                <td className="px-3 py-2.5 text-ink-2">{s.role === "ADMIN" ? "Owner" : "Staff"}</td>
                <td className="px-3 py-2.5 text-ink-3 tnum">{s.lastLoginAt ? dateShort(s.lastLoginAt) : "never"}</td>
                <td className="px-3 py-2.5"><Pill value={s.active ? "ACTIVE" : "CLOSED"} /></td>
                <td className="px-3 py-2.5 text-right">
                  {isOwner && (
                    <button type="button" onClick={() => { setDraft({ ...s, password: "" }); setError(""); }}
                      className="text-[12.5px] font-bold text-rex-red hover:underline">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-10" />
    </>
  );
}

function F({
  label, value, onChange, ...rest
}: { label: string; value: string; onChange: (v: string) => void } &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" {...rest} />
    </div>
  );
}

function Save({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={pending}
      className="mt-4 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
