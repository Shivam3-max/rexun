"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminSignOut } from "./actions";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Stock" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminNav({ user }: { user: { name: string; email: string; role: string } }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = (l: (typeof LINKS)[number]) =>
    l.exact ? path === l.href : path.startsWith(l.href);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink text-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 md:px-6">
        <Link href="/admin" className="font-display text-[18px] font-bold leading-none">
          REX<span className="text-rex-gold">SUN</span>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Admin</span>
        </Link>

        <button type="button" onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded border border-white/25 px-2.5 py-1 text-[12.5px] font-semibold lg:hidden">
          Menu
        </button>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link href="/" target="_blank" className="text-[12.5px] text-white/70 hover:text-rex-gold">
            View shop ↗
          </Link>
          <span className="text-[12.5px] text-white/50">{user.name}</span>
          <button type="button" disabled={pending}
            onClick={() => startTransition(async () => { await adminSignOut(); router.push("/admin/login"); router.refresh(); })}
            className="rounded border border-white/25 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white/60 disabled:opacity-50">
            Sign out
          </button>
        </div>
      </div>

      <nav className={`${open ? "block" : "hidden"} border-t border-white/10 lg:block`}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-0.5 px-4 pb-1 md:px-6">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`rounded-t px-3 py-2 text-[13px] font-semibold ${
                active(l) ? "bg-page text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}>
              {l.label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="px-3 py-2 text-[13px] font-semibold text-white/60 lg:hidden">
            View shop ↗
          </Link>
        </div>
      </nav>
    </header>
  );
}
