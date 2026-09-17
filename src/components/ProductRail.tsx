import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

export function SectionHead({
  title,
  sub,
  href,
  hrefLabel = "View all",
}: {
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[20px] font-bold text-ink sm:text-[23px]">{title}</h2>
        {sub && <p className="mt-0.5 text-[13.5px] text-ink-2">{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-[13.5px] font-semibold text-rex-red hover:underline"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

/** Horizontally scrolling row. Cards keep a fixed width so a half-visible
 *  card at the edge tells you there is more to swipe. */
export function ProductRail({
  products,
  running,
}: {
  products: Product[];
  running?: { hoursPerDay: number; ratePerUnit: number };
}) {
  return (
    <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {products.map((p) => (
        <div key={p.slug} className="w-[164px] shrink-0 sm:w-[204px]">
          <ProductCard p={p} running={running} />
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({
  products,
  running,
}: {
  products: Product[];
  running?: { hoursPerDay: number; ratePerUnit: number };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} p={p} running={running} />
      ))}
    </div>
  );
}
