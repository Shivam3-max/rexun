import Link from "next/link";
import { Placeholder } from "./Placeholder";
import { inr, productDiscount, yearlyCost, showsRunningCost } from "@/lib/pricing";
import type { Product } from "@/lib/types";

/**
 * The card carries exactly five things: picture, who makes it, what it is,
 * what it costs, and how long it's covered. Anything more and a category page
 * stops being scannable.
 */
export function ProductCard({
  p,
  running = { hoursPerDay: 8, ratePerUnit: 8 },
}: {
  p: Product;
  running?: { hoursPerDay: number; ratePerUnit: number };
}) {
  const off = productDiscount(p);
  const warrantyYears = p.warranty?.match(/(\d+)\s*Year/i)?.[1];
  const cost = p.wattage && showsRunningCost(p.dept) ? yearlyCost(p.wattage, running) : null;

  return (
    <Link
      href={`/p/${p.slug}`}
      className="group flex h-full flex-col rounded-card border border-line bg-card transition hover:border-line-2 hover:shadow-[0_4px_16px_rgba(22,24,28,0.08)]"
    >
      <div className="relative">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="aspect-square w-full rounded-t-card bg-white object-contain p-4"
          />
        ) : (
          <Placeholder label="Product photo" ratio="1 / 1" className="rounded-t-card border-0" />
        )}
        {p.own && (
          <span className="absolute left-2 top-2 rounded bg-rex-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Rexsun
          </span>
        )}
        {off > 0 && (
          <span className="absolute right-2 top-2 rounded bg-save-tint px-1.5 py-0.5 text-[11px] font-bold text-save tnum">
            {off}% off
          </span>
        )}
        {!p.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{p.brand}</span>
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink group-hover:text-rex-red">
          {p.name}
        </h3>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-ink tnum">{inr(p.price)}</span>
            {p.mrp > p.price && (
              <span className="text-[12px] text-ink-3 line-through tnum">{inr(p.mrp)}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
            {warrantyYears && <span>{warrantyYears} yr warranty</span>}
            {cost && <span className="tnum">≈ {inr(cost)}/yr to run</span>}
            {p.options.length > 0 && <span>{p.variants.length} options</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
