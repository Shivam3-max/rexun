import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Card, Table, Empty } from "@/components/admin/ui";
import { inr, discountPct } from "@/lib/pricing";
import { BulkPricePanel } from "./BulkPricePanel";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const [estimated, categories, brands, thin] = await Promise.all([
    db.product.findMany({
      where: { estimatedPrice: true },
      include: { category: { select: { name: true } }, variants: { select: { price: true, mrp: true } } },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.groupBy({ by: ["brand"], _count: true }),
    // A selling price at or above MRP shows no saving at all on the shop.
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, price: true, mrp: true, brand: true },
    }),
  ]);

  const noDiscount = thin.filter((p) => p.mrp <= p.price);

  return (
    <>
      <PageHead
        title="Pricing"
        sub="Fix estimated prices, and reprice a whole category or brand at once"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <BulkPricePanel
          categories={categories}
          brands={brands.map((b) => ({ name: b.brand, count: b._count }))}
        />

        <Card title="Showing no discount" sub={`${noDiscount.length} live products where the selling price equals MRP`}>
          {noDiscount.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">Every live product shows a saving. Good.</p>
          ) : (
            <ul className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {noDiscount.slice(0, 40).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <Link href={`/admin/products/${p.id}`} className="truncate text-ink-2 hover:text-rex-red">
                    {p.name}
                  </Link>
                  <span className="shrink-0 font-semibold text-ink tnum">{inr(p.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">
        Estimated prices <span className="text-[14px] font-medium text-ink-2 tnum">({estimated.length})</span>
      </h2>
      <p className="mb-3 max-w-[70ch] text-[13.5px] text-ink-2">
        These were filled in from the median price of their category when the catalogue was
        built, because the manufacturer publishes no MRP for them. Set a real price on any
        product here and the estimate flag clears itself.
      </p>

      {estimated.length === 0 ? (
        <Empty title="Nothing estimated" body="Every product on the shop now carries a real price." />
      ) : (
        <Table head={["Product", "Category", "Brand", "Current price", "MRP", "Discount", ""]}>
          {estimated.map((p) => (
            <tr key={p.id} className="hover:bg-page">
              <td className="px-3 py-2">
                <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink hover:text-rex-red">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-2">{p.category.name}</td>
              <td className="px-3 py-2 text-ink-2">{p.brand}</td>
              <td className="px-3 py-2 font-semibold text-ink tnum">{inr(p.price)}</td>
              <td className="px-3 py-2 text-ink-3 tnum">{inr(p.mrp)}</td>
              <td className="px-3 py-2 text-ink-2 tnum">{discountPct(p.mrp, p.price)}%</td>
              <td className="px-3 py-2 text-right">
                <Link href={`/admin/products/${p.id}`} className="text-[12.5px] font-bold text-rex-red hover:underline">
                  Set price
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="h-10" />
    </>
  );
}
