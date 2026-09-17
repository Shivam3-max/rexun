"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";

export type NavDept = { slug: string; name: string; count: number };

const PRIMARY = ["fans", "lighting", "kitchen-appliances", "water-heaters", "home-essentials"];

export function Header({
  departments,
  announcement,
  customerName,
}: {
  departments: NavDept[];
  announcement: { text: string; active: boolean };
  customerName: string | null;
}) {
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const { count } = useCart();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const nav = [
    { href: "/rexsun", label: "Rexsun" },
    ...PRIMARY.map((slug) => {
      const d = departments.find((x) => x.slug === slug);
      return d ? { href: `/d/${d.slug}`, label: d.name } : null;
    }).filter((x): x is { href: string; label: string } => x !== null),
    { href: "/rooms", label: "Shop by Room" },
  ];

  return (
    <header className="sticky top-0 z-40">
      {announcement.active && announcement.text && (
        <div className="hidden bg-ink text-white md:block">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-1.5 text-[12px]">
            <span>{announcement.text}</span>
            <div className="flex gap-5">
              <Link href="/help/warranty" className="hover:text-rex-gold">Warranty &amp; service</Link>
              <Link href="/help/shipping" className="hover:text-rex-gold">Delivery</Link>
              <Link href="/track" className="hover:text-rex-gold">Track order</Link>
            </div>
          </div>
        </div>
      )}

      <div className="bg-rex-red">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Open menu"
            aria-expanded={menu}
            className="grid h-9 w-9 shrink-0 place-items-center rounded text-white md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <Link href="/" className="shrink-0 font-display text-[22px] font-bold leading-none text-white">
            REX<span className="text-rex-gold">SUN</span>
          </Link>

          <form onSubmit={submit} className="ml-auto flex w-full max-w-xl items-center md:ml-6">
            <label htmlFor="site-search" className="sr-only">Search products and brands</label>
            <div className="flex w-full items-center gap-2 rounded-full bg-white px-4 py-2">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-ink-3">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                id="site-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search fans, bulbs, geysers…"
                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
          </form>

          <Link href="/account" className="ml-3 hidden items-center gap-2 px-2 py-1.5 text-white md:flex">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[14px] font-semibold">{customerName ? customerName.split(" ")[0] : "Sign in"}</span>
          </Link>

          <Link href="/cart" className="relative ml-2 hidden items-center gap-2 px-2 py-1.5 text-white md:flex">
            <svg width="21" height="21" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M2 3h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L19 6H5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="18.5" r="1.4" fill="currentColor" />
              <circle cx="16" cy="18.5" r="1.4" fill="currentColor" />
            </svg>
            <span className="text-[14px] font-semibold">Cart</span>
            {count > 0 && (
              <span className="absolute -right-1 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rex-gold px-1 text-[11px] font-bold text-ink tnum">
                {count}
              </span>
            )}
          </Link>
        </div>

        <nav className="hidden border-t border-white/15 md:block">
          <div className="mx-auto flex max-w-[1240px] gap-1 px-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2.5 text-[13.5px] font-semibold text-white/90 hover:bg-white/10 ${
                  path.startsWith(n.href) ? "bg-white/15 text-white" : ""
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link href="/help/size-guide" className="ml-auto px-3 py-2.5 text-[13.5px] font-semibold text-rex-gold hover:bg-white/10">
              Which size do I need?
            </Link>
          </div>
        </nav>
      </div>

      {menu && (
        <div className="max-h-[70vh] overflow-y-auto border-b border-line bg-card md:hidden">
          <ul className="divide-y divide-line">
            <li>
              <Link href="/account" onClick={() => setMenu(false)} className="block px-4 py-3 text-[15px] font-semibold">
                {customerName ? `Hello, ${customerName.split(" ")[0]}` : "Sign in"}
              </Link>
            </li>
            {departments.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/d/${d.slug}`}
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold"
                >
                  {d.name}
                  <span className="text-[12px] font-medium text-ink-3 tnum">{d.count}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/rexsun" onClick={() => setMenu(false)} className="block px-4 py-3 text-[15px] font-semibold text-rex-red">
                Rexsun own brand
              </Link>
            </li>
            <li>
              <Link href="/rooms" onClick={() => setMenu(false)} className="block px-4 py-3 text-[15px] font-semibold">
                Shop by room
              </Link>
            </li>
            <li>
              <Link href="/help/size-guide" onClick={() => setMenu(false)} className="block px-4 py-3 text-[15px] font-semibold">
                Which size do I need?
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
