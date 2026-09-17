"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doRegister, doSignIn } from "@/app/actions/account";

/**
 * Sign in and register share one component because they share one shape. The
 * phone number is the identity — it is what the order, the courier and the
 * WhatsApp update all key off, so asking for an email as well would be asking
 * for something we do not need.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", phone: "", password: "", email: "" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res =
        mode === "login"
          ? await doSignIn(form.phone, form.password)
          : await doRegister({ name: form.name, phone: form.phone, password: form.password, email: form.email || undefined });
      if (!res.ok) { setError(res.error); return; }
      router.push("/account");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-[440px] px-4 py-12">
      <h1 className="text-[26px] font-bold text-ink">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-2 text-[14.5px] text-ink-2">
        {mode === "login"
          ? "Your orders, addresses and warranty records in one place."
          : "Ordered before as a guest? Use the same number and your past orders come with you."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-card border border-line bg-card p-5">
        {mode === "register" && (
          <Field id="name" label="Full name" value={form.name} onChange={set} />
        )}
        <Field id="phone" label="Mobile number" value={form.phone} onChange={set}
          inputMode="numeric" maxLength={10} autoComplete="tel" />
        <Field id="password" label="Password" value={form.password} onChange={set}
          type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
          hint={mode === "register" ? "At least 6 characters" : undefined} />
        {mode === "register" && (
          <Field id="email" label="Email (optional)" value={form.email} onChange={set}
            type="email" autoComplete="email" hint="Only used to send invoices" />
        )}

        {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}

        <button type="submit" disabled={pending}
          className="w-full rounded bg-rex-red py-3 text-[15px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-[14px] text-ink-2">
        {mode === "login" ? (
          <>New here? <Link href="/account/register" className="font-semibold text-rex-red hover:underline">Create an account</Link></>
        ) : (
          <>Already have one? <Link href="/account/login" className="font-semibold text-rex-red hover:underline">Sign in</Link></>
        )}
      </p>
      <p className="mt-2 text-center text-[13.5px] text-ink-3">
        Just want to check an order?{" "}
        <Link href="/track" className="font-semibold text-ink-2 hover:text-rex-red">Track without signing in</Link>
      </p>
    </div>
  );
}

function Field({
  id, label, value, onChange, hint, ...rest
}: {
  id: string; label: string; value: string;
  onChange: (k: string, v: string) => void; hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold text-ink">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(id, e.target.value)}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[15px] outline-none focus:border-rex-red"
        {...rest} />
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}
