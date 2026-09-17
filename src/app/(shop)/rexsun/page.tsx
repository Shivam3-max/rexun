import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { ProductGrid } from "@/components/ProductRail";
import { getOwnBrand, getRunningAssumptions } from "@/lib/store";

export const metadata = {
  title: "Rexsun — our own brand",
  description:
    "Rexsun mixer grinders, choppers, hand blenders, juicers and water heaters. Our own brand, priced by us and serviced by our own team.",
};

export default async function RexsunPage() {
  const [own, running] = await Promise.all([getOwnBrand(), getRunningAssumptions()]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6">
      <div className="overflow-hidden rounded-card border border-line bg-card">
        <Placeholder label="Rexsun brand banner — 1280 × 420" ratio="16 / 5" className="border-0" />
        <div className="p-5 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rex-red">Our own brand</p>
          <h1 className="mt-2 font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
            REX<span className="text-rex-gold">SUN</span> — Life Banaye Easy
          </h1>
          <p className="mt-3 max-w-[62ch] text-[16px] text-ink-2">
            Everything else on this site we sell as an authorised dealer. Rexsun is ours: we
            choose the specification, we set the price, and when something needs attention it
            comes to our own service team — not to a helpline in another city.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        {[
          ["Priced by us", "No dealer margin stacked on top — the same appliance, less to pay."],
          ["Serviced by us", "One number to call. We handle the claim, you don't chase anyone."],
          ["Built for daily use", "Copper motors, stainless steel blades, food-grade plastics."],
        ].map(([t, s]) => (
          <div key={t} className="bg-card p-5">
            <h2 className="text-[16px] font-bold text-ink">{t}</h2>
            <p className="mt-1.5 text-[14px] text-ink-2">{s}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-[22px] font-bold text-ink">The range</h2>
      <p className="mt-1 text-[14.5px] text-ink-2">{own.length} products, with more coming.</p>
      <div className="mt-4">
        <ProductGrid products={own} running={running} />
      </div>

      <div className="mt-10 rounded-card border border-line bg-card p-5 sm:p-6">
        <h2 className="text-[19px] font-bold text-ink">Warranty on every Rexsun product</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] text-ink-2">
          Register the product with the order number and the warranty runs from the day it
          reaches you, not the day it left the factory. Kitchen appliances carry one year;
          the water heater carries two.
        </p>
        <Link href="/help/warranty" className="mt-3 inline-block text-[14px] font-bold text-rex-red hover:underline">
          How warranty claims work →
        </Link>
      </div>
    </div>
  );
}
