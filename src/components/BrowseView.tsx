"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { inr } from "@/lib/pricing";
import type { Product } from "@/lib/types";

type Sort = "popular" | "low" | "high" | "discount";

const BANDS: [string, number, number][] = [
  ["Under ₹500", 0, 500],
  ["₹500 – ₹1,500", 500, 1500],
  ["₹1,500 – ₹4,000", 1500, 4000],
  ["₹4,000 – ₹8,000", 4000, 8000],
  ["Over ₹8,000", 8000, Infinity],
];

/**
 * One browse surface behind every listing page. Filters are the ones people
 * actually decide on — price, brand, category, and for fans and lights the
 * power draw — not a wall of spec checkboxes copied out of the datasheet.
 */
export function BrowseView({
  products,
  title,
  sub,
  showCategory = true,
  running = { hoursPerDay: 8, ratePerUnit: 8 },
}: {
  products: Product[];
  title: string;
  sub?: string;
  showCategory?: boolean;
  running?: { hoursPerDay: number; ratePerUnit: number };
}) {
  const [brands, setBrands] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [band, setBand] = useState<string | null>(null);
  const [lowPower, setLowPower] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");
  const [openFilters, setOpenFilters] = useState(false);

  const allBrands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products]
  );
  const allCats = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  );
  const powerRelevant = products.some((p) => p.wattage && (p.dept === "fans" || p.dept === "lighting"));

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const shown = useMemo(() => {
    let out = products.filter((p) => {
      if (brands.length && !brands.includes(p.brand)) return false;
      if (cats.length && !cats.includes(p.category)) return false;
      if (band) {
        const b = BANDS.find(([l]) => l === band);
        if (b && (p.price < b[1] || p.price >= b[2])) return false;
      }
      if (lowPower && !(p.wattage && p.wattage <= 40)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "low") return a.price - b.price;
      if (sort === "high") return b.price - a.price;
      if (sort === "discount")
        return (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp;
      return Number(!!b.own) - Number(!!a.own) || b.skuCount - a.skuCount;
    });
    return out;
  }, [products, brands, cats, band, lowPower, sort]);

  const activeCount = brands.length + cats.length + (band ? 1 : 0) + (lowPower ? 1 : 0);
  const clear = () => {
    setBrands([]);
    setCats([]);
    setBand(null);
    setLowPower(false);
  };

  const filters = (
    <div className="space-y-6">
      <Group title="Price">
        {BANDS.map(([label]) => (
          <Check
            key={label}
            label={label}
            checked={band === label}
            onChange={() => setBand(band === label ? null : label)}
          />
        ))}
      </Group>

      {allBrands.length > 1 && (
        <Group title="Brand">
          {allBrands.map((b) => (
            <Check
              key={b}
              label={b}
              count={products.filter((p) => p.brand === b).length}
              checked={brands.includes(b)}
              onChange={() => toggle(brands, setBrands, b)}
            />
          ))}
        </Group>
      )}

      {showCategory && allCats.length > 1 && (
        <Group title="Category">
          {allCats.map((c) => (
            <Check
              key={c}
              label={c}
              count={products.filter((p) => p.category === c).length}
              checked={cats.includes(c)}
              onChange={() => toggle(cats, setCats, c)}
            />
          ))}
        </Group>
      )}

      {powerRelevant && (
        <Group title="Running cost">
          <Check
            label="Low power (40 W and under)"
            checked={lowPower}
            onChange={() => setLowPower((v) => !v)}
          />
        </Group>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-5">
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-ink sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-[14.5px] text-ink-2">{sub}</p>}
      </div>

      <div className="mb-4 flex items-center gap-2 border-y border-line py-2.5">
        <button
          type="button"
          onClick={() => setOpenFilters(true)}
          className="rounded border border-line-2 px-3 py-1.5 text-[13.5px] font-semibold text-ink lg:hidden"
        >
          Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
        <p className="text-[13.5px] text-ink-2 tnum">
          {shown.length} {shown.length === 1 ? "product" : "products"}
        </p>
        <label className="ml-auto flex items-center gap-2 text-[13.5px] text-ink-2">
          <span className="hidden sm:inline">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded border border-line-2 bg-card px-2 py-1.5 text-[13.5px] font-semibold text-ink outline-none focus:border-rex-red"
          >
            <option value="popular">Most popular</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="discount">Biggest discount</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Filters</h2>
            {activeCount > 0 && (
              <button type="button" onClick={clear} className="text-[12.5px] font-semibold text-rex-red hover:underline">
                Clear all
              </button>
            )}
          </div>
          <div className="mt-4">{filters}</div>
        </aside>

        <div>
          {shown.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => (
                <ProductCard key={p.slug} p={p} running={running} />
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-line bg-card px-6 py-14 text-center">
              <p className="text-[16px] font-bold text-ink">Nothing matches those filters</p>
              <p className="mt-1 text-[14px] text-ink-2">
                Try removing one — the price band is usually the culprit.
              </p>
              <button
                type="button"
                onClick={clear}
                className="mt-4 rounded bg-rex-red px-4 py-2 text-[14px] font-bold text-white hover:bg-rex-red-dark"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* mobile filter sheet */}
      {openFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpenFilters(false)}
            className="flex-1 bg-ink/40"
          />
          <div className="w-[86%] max-w-[340px] overflow-y-auto bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">Filters</h2>
              <button type="button" onClick={() => setOpenFilters(false)} className="text-[22px] leading-none text-ink-3">
                ×
              </button>
            </div>
            <div className="mt-5">{filters}</div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={clear} className="flex-1 rounded border border-line-2 py-2.5 text-[14px] font-bold text-ink">
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpenFilters(false)}
                className="flex-1 rounded bg-rex-red py-2.5 text-[14px] font-bold text-white"
              >
                Show {shown.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-3">{title}</h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Check({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#d01c22]"
      />
      <span className={checked ? "font-semibold text-ink" : ""}>{label}</span>
      {count !== undefined && <span className="ml-auto text-[12px] text-ink-3 tnum">{count}</span>}
    </label>
  );
}
