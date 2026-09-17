"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminSignIn } from "../actions";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await adminSignIn(email, password);
      if (!res.ok) { setError(res.error); return; }
      router.push("/admin");
      router.refresh();
    });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-[380px]">
        <p className="text-center font-display text-[26px] font-bold text-white">
          REX<span className="text-rex-gold">SUN</span>
        </p>
        <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
          Store admin
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4 rounded-card bg-card p-6">
          <div>
            <label htmlFor="email" className="text-[13px] font-bold text-ink">Email</label>
            <input id="email" type="email" autoComplete="username" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[15px] outline-none focus:border-rex-red" />
          </div>
          <div>
            <label htmlFor="password" className="text-[13px] font-bold text-ink">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[15px] outline-none focus:border-rex-red" />
          </div>
          {error && <p className="text-[13px] font-semibold text-rex-red">{error}</p>}
          <button type="submit" disabled={pending}
            className="w-full rounded bg-rex-red py-3 text-[15px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-white/40">
          Staff access only. Customers sign in on the shop.
        </p>
      </div>
    </div>
  );
}
