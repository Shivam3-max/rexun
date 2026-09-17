import Link from "next/link";
import type { StoreSettings } from "@/lib/store";

const HELP = [
  { href: "/help/shipping", label: "Delivery & shipping" },
  { href: "/help/returns", label: "Returns & replacement" },
  { href: "/help/warranty", label: "Warranty & service" },
  { href: "/help/size-guide", label: "Which size do I need?" },
  { href: "/track", label: "Track your order" },
  { href: "/contact", label: "Contact us" },
];

export function Footer({
  departments,
  brands,
  store,
}: {
  departments: { slug: string; name: string }[];
  brands: { slug: string; name: string; count: number }[];
  store: StoreSettings;
}) {
  return (
    <footer className="mt-16 border-t border-line bg-card pb-20 md:pb-0">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-display text-[22px] font-bold text-ink">
            REX<span className="text-rex-gold">SUN</span>
          </span>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {store.tagline}
          </p>
          <p className="mt-4 max-w-[34ch] text-[14px] text-ink-2">
            Fans, lights and home appliances, delivered across India. Rexsun is our own
            brand; we are an authorised dealer for everything else we sell.
          </p>
          {store.phone && (
            <p className="mt-4 text-[14px] text-ink-2">
              <span className="font-semibold text-ink">{store.phone}</span>
              {store.hours && <span className="block text-[13px] text-ink-3">{store.hours}</span>}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-[13px] font-bold uppercase tracking-wider text-ink">Shop</h4>
          <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
            {departments.map((d) => (
              <li key={d.slug}>
                <Link href={`/d/${d.slug}`} className="hover:text-rex-red">{d.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[13px] font-bold uppercase tracking-wider text-ink">Help</h4>
          <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
            {HELP.map((h) => (
              <li key={h.href}>
                <Link href={h.href} className="hover:text-rex-red">{h.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[13px] font-bold uppercase tracking-wider text-ink">Brands we carry</h4>
          <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={`/brands/${b.slug}`} className="hover:text-rex-red">
                  {b.name} <span className="text-ink-3 tnum">({b.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[12.5px] text-ink-3">
          <span>© {new Date().getFullYear()} {store.name}. All prices include GST.</span>
          <span>UPI · Cards · Net banking · Cash on delivery</span>
        </div>
      </div>
    </footer>
  );
}
