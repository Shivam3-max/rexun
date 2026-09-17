import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { ProductRail, ProductGrid, SectionHead } from "@/components/ProductRail";
import {
  byCategory,
  byDept,
  getCatalog,
  getOwnBrand,
  getTaxonomy,
  getBanners,
  getRunningAssumptions,
} from "@/lib/store";
import { inr, yearlyCost } from "@/lib/pricing";

const ROOM_COPY: Record<string, string> = {
  "living-room": "Fans, lights and spike guards",
  bedroom: "Fans, coolers and bedside lighting",
  kitchen: "Mixers, exhaust fans and task lighting",
  bathroom: "Geysers, exhaust fans and downlights",
  outdoor: "Torches, doorbells and strip lights",
};

export default async function HomePage() {
  const [catalog, taxonomy, own, hero, promos, running] = await Promise.all([
    getCatalog(),
    getTaxonomy(),
    getOwnBrand(),
    getBanners("HERO"),
    getBanners("PROMO"),
    getRunningAssumptions(),
  ]);

  const lighting = await byDept("lighting");
  const ceiling = await byCategory("ceiling-fans");
  const geysers = await byCategory("geysers-water-heaters");
  const essentials = await byDept("home-essentials");

  const cheapLighting = lighting.filter((p) => p.price <= 500).sort((a, b) => a.price - b.price).slice(0, 12);
  const ceilingTop = [...ceiling].sort((a, b) => b.skuCount - a.skuCount).slice(0, 12);
  const bldc = ceiling
    .filter((p) => p.wattage && p.wattage <= 40)
    .sort((a, b) => (a.wattage ?? 99) - (b.wattage ?? 99))
    .slice(0, 12);

  // The comparison table is arithmetic on the store's own assumptions, so it
  // stays honest when the admin panel changes the unit rate.
  const runCosts = [
    ["Ordinary induction fan", 75],
    ["High-speed fan", 55],
    ["BLDC fan", 35],
  ] as const;

  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <section className="pt-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          {hero[0]?.image ? (
            <Link href={hero[0].link || "#"} className="block overflow-hidden rounded-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero[0].image} alt={hero[0].title} className="w-full object-cover" />
            </Link>
          ) : (
            <Placeholder label="Hero banner — 1280 × 480" ratio="16 / 6" className="rounded-card" />
          )}
          <div className="hidden gap-3 lg:grid">
            {(promos.length ? promos : [null, null]).slice(0, 2).map((b, i) =>
              b?.image ? (
                <Link key={b.id} href={b.link || "#"} className="block overflow-hidden rounded-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image} alt={b.title} className="h-full w-full object-cover" />
                </Link>
              ) : (
                <Placeholder key={i} label="Promo tile — 320 × 228" ratio="10 / 7" className="rounded-card" />
              )
            )}
          </div>
        </div>
      </section>

      <section className="pt-6">
        <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {taxonomy.departments.map((d) => (
            <Link key={d.slug} href={`/d/${d.slug}`} className="flex w-[92px] shrink-0 flex-col items-center gap-2 text-center">
              {d.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image} alt="" className="h-[92px] w-[92px] rounded-full border border-line object-cover" />
              ) : (
                <Placeholder label="Icon" ratio="1 / 1" className="w-full rounded-full" />
              )}
              <span className="text-[12px] font-semibold leading-tight text-ink">{d.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {[
          ["Authorised dealer", "Polycab, Surya, Halonix, Indo"],
          ["Brand warranty", "Registered in your name"],
          ["Free delivery", "On orders over ₹999"],
          ["Pay your way", "UPI, cards or cash on delivery"],
        ].map(([t, s]) => (
          <div key={t} className="bg-card px-4 py-3">
            <p className="text-[13.5px] font-bold text-ink">{t}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-2">{s}</p>
          </div>
        ))}
      </section>

      {own.length > 0 && (
        <section className="mt-10 overflow-hidden rounded-card border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-rex-red-tint px-4 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rex-red">Our own brand</p>
              <h2 className="mt-1 text-[22px] font-bold text-ink">Rexsun appliances</h2>
              <p className="mt-0.5 max-w-[52ch] text-[13.5px] text-ink-2">
                Made for us, priced by us, and backed by our own service team. Same warranty
                promise as every brand we carry.
              </p>
            </div>
            <Link href="/rexsun" className="rounded bg-rex-red px-4 py-2 text-[13.5px] font-bold text-white hover:bg-rex-red-dark">
              See the range
            </Link>
          </div>
          <div className="p-4">
            <ProductRail products={own} running={running} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionHead
          title="Shop by room"
          sub="Most people arrive with a room to sort out, not a product code."
          href="/rooms"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {taxonomy.rooms.map((r) => (
            <Link key={r.slug} href={`/rooms/${r.slug}`} className="group overflow-hidden rounded-card border border-line bg-card hover:border-line-2">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <Placeholder label="Room photo" ratio="4 / 3" className="border-0" />
              )}
              <div className="p-3">
                <h3 className="text-[15px] font-bold text-ink group-hover:text-rex-red">{r.name}</h3>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-2">{ROOM_COPY[r.slug]}</p>
                <p className="mt-1.5 text-[11.5px] font-semibold text-ink-3 tnum">{r.count} products</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {ceilingTop.length > 0 && (
        <section className="mt-10">
          <SectionHead
            title="Ceiling fans"
            sub={`${ceiling.length} fans from ${inr(Math.min(...ceiling.map((p) => p.price)))}`}
            href="/c/ceiling-fans"
          />
          <ProductRail products={ceilingTop} running={running} />
        </section>
      )}

      <section className="mt-10 rounded-card border border-line bg-card p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rex-gold">Worth knowing</p>
            <h2 className="mt-2 text-[24px] font-bold leading-tight text-ink sm:text-[28px]">
              A BLDC fan costs more to buy and about half as much to run.
            </h2>
            <p className="mt-3 max-w-[56ch] text-[15px] text-ink-2">
              We put the yearly running cost on every fan and light in the store, worked out
              at {running.hoursPerDay} hours a day and ₹{running.ratePerUnit} a unit. No spec
              sheet needed — the number is right there next to the price.
            </p>
            <Link href="/c/ceiling-fans" className="mt-4 inline-block rounded bg-ink px-4 py-2.5 text-[14px] font-bold text-white hover:bg-black">
              Compare fans by running cost
            </Link>
          </div>
          <div className="rounded-card border border-line bg-page p-4">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="pb-2 font-semibold">Fan type</th>
                  <th className="pb-2 font-semibold">Power</th>
                  <th className="pb-2 text-right font-semibold">Per year</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {runCosts.map(([label, watts], i) => (
                  <tr key={label} className={i === 2 ? "font-bold text-save" : "text-ink-2"}>
                    <td className="border-t border-line py-2">{label}</td>
                    <td className="border-t border-line py-2">{watts} W</td>
                    <td className="border-t border-line py-2 text-right">{inr(yearlyCost(watts, running))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] text-ink-3">
              {running.hoursPerDay} hours a day, 365 days, ₹{running.ratePerUnit} per unit.
            </p>
          </div>
        </div>
      </section>

      {cheapLighting.length > 0 && (
        <section className="mt-10">
          <SectionHead title="Lighting under ₹500" sub="Bulbs, battens and downlights" href="/d/lighting" />
          <ProductRail products={cheapLighting} running={running} />
        </section>
      )}

      {bldc.length > 0 && (
        <section className="mt-10">
          <SectionHead title="Low-power BLDC fans" sub="35 W and under" href="/c/ceiling-fans" />
          <ProductRail products={bldc} running={running} />
        </section>
      )}

      {geysers.length > 0 && (
        <section className="mt-10">
          <SectionHead title="Geysers & water heaters" sub="Instant and storage, 3 L to 25 L" href="/c/geysers-water-heaters" />
          <ProductRail products={geysers.slice(0, 12)} running={running} />
        </section>
      )}

      <section className="mt-10">
        <SectionHead title="Brands we carry" sub="Authorised dealer — full manufacturer warranty" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {taxonomy.brands.map((b) => (
            <Link key={b.slug} href={`/brands/${b.slug}`} className="flex flex-col items-center gap-2 rounded-card border border-line bg-card p-4 hover:border-line-2">
              <Placeholder label="Logo" ratio="5 / 2" className="w-full border-0" />
              <span className="text-[13.5px] font-bold text-ink">{b.name}</span>
              <span className="text-[11.5px] text-ink-3 tnum">{b.count} products</span>
            </Link>
          ))}
        </div>
      </section>

      {essentials.length > 0 && (
        <section className="mt-10">
          <SectionHead title="Home essentials" sub="Spike guards, holders, doorbells" href="/d/home-essentials" />
          <ProductGrid products={essentials.slice(0, 8)} running={running} />
        </section>
      )}

      <p className="mt-10 text-center text-[13px] text-ink-3 tnum">
        {catalog.length} products · {taxonomy.categories.length} categories · {taxonomy.brands.length} brands
      </p>
    </div>
  );
}
