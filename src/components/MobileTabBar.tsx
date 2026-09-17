"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const TABS = [
  { href: "/", label: "Home", icon: "M3 9.5 10 4l7 5.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z" },
  { href: "/categories", label: "Categories", icon: "M3 4h6v6H3V4Zm8 0h6v6h-6V4ZM3 12h6v6H3v-6Zm8 0h6v6h-6v-6Z" },
  { href: "/rooms", label: "Rooms", icon: "M4 17V8l6-4 6 4v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm4-1h4v-4H8v4Z" },
  { href: "/cart", label: "Cart", icon: "M2 3h2l2 10h9l2-7H5" },
  { href: "/track", label: "Orders", icon: "M4 4h12v12H4V4Zm2.5 4h7m-7 3h7m-7 3h4" },
];

export function MobileTabBar() {
  const path = usePathname();
  const { count } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-card md:hidden">
      <ul className="flex">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`relative flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold ${
                  active ? "text-rex-red" : "text-ink-3"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d={t.icon}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t.label}
                {t.href === "/cart" && count > 0 && (
                  <span className="absolute right-[22%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rex-red px-1 text-[10px] font-bold text-white tnum">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
