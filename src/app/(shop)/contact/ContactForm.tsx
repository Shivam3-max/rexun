"use client";

import { useState, useTransition } from "react";
import { submitEnquiry } from "@/app/actions/shop";

const SUBJECTS = ["General", "About an order", "Warranty or service", "Bulk enquiry", "Something else"];

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ name: "", phone: "", email: "", subject: SUBJECTS[0], message: "" });

  const set = (k: string, v: string) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitEnquiry(f);
      if (!res.ok) { setError(res.error); return; }
      setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="rounded-card border border-save/40 bg-save-tint p-6">
        <h2 className="text-[18px] font-bold text-save">Message sent</h2>
        <p className="mt-2 text-[14.5px] text-ink-2">
          We have it. Someone will call you on {f.phone} in working hours — usually the same day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-line bg-card p-5">
      <h2 className="text-[17px] font-bold text-ink">Send us a message</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <F id="name" label="Your name" value={f.name} onChange={set} />
        <F id="phone" label="Mobile number" value={f.phone} onChange={set} inputMode="numeric" maxLength={10} />
        <F id="email" label="Email (optional)" value={f.email} onChange={set} type="email" />
        <div>
          <label htmlFor="subject" className="text-[13px] font-bold text-ink">What is it about?</label>
          <select id="subject" value={f.subject} onChange={(e) => set("subject", e.target.value)}
            className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14.5px] outline-none focus:border-rex-red">
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="text-[13px] font-bold text-ink">Message</label>
          <textarea id="message" rows={5} value={f.message} onChange={(e) => set("message", e.target.value)}
            placeholder="Include your order number if it is about an order"
            className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14.5px] outline-none focus:border-rex-red" />
        </div>
      </div>

      {error && <p className="mt-3 text-[13px] font-semibold text-rex-red">{error}</p>}

      <button type="submit" disabled={pending}
        className="mt-4 rounded bg-rex-red px-5 py-3 text-[15px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function F({
  id, label, value, onChange, ...rest
}: { id: string; label: string; value: string; onChange: (k: string, v: string) => void } &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold text-ink">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(id, e.target.value)}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14.5px] outline-none focus:border-rex-red" {...rest} />
    </div>
  );
}
