import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Table, Stat, Empty } from "@/components/admin/ui";
import { StockEditor } from "./StockEditor";

export const metadata = { title: "Stock" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = { active: true };
  if (sp.filter === "out") where.stock = 0;
  if (sp.filter === "low") where.stock = { gt: 0, lte: 5 };
  if (sp.q?.trim()) where.product = { name: { contains: sp.q.trim() } };

  const [rows, outCount, lowCount, totalUnits] = await Promise.all([
    db.variant.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true, brand: true, status: true } } },
      orderBy: [{ stock: "asc" }],
      take: 200,
    }),
    db.variant.count({ where: { stock: 0, active: true } }),
    db.variant.count({ where: { stock: { gt: 0, lte: 5 }, active: true } }),
    db.variant.aggregate({ where: { active: true }, _sum: { stock: true } }),
  ]);

  return (
    <>
      <PageHead title="Stock" sub="Every selling variant, lowest first" />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Out of stock" value={String(outCount)} tone={outCount ? "bad" : "good"} href="/admin/inventory?filter=out" />
        <Stat label="Low (5 or fewer)" value={String(lowCount)} tone={lowCount ? "warn" : "plain"} href="/admin/inventory?filter=low" />
        <Stat label="Units on hand" value={String(totalUnits._sum.stock ?? 0)} href="/admin/inventory" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "Everything"], ["out", "Out of stock"], ["low", "Low stock"]].map(([v, label]) => (
          <Link key={label} href={v ? `/admin/inventory?filter=${v}` : "/admin/inventory"}
            className={`rounded border px-3 py-1.5 text-[13px] font-semibold ${
              (sp.filter ?? "") === v ? "border-rex-red bg-rex-red-tint text-rex-red" : "border-line-2 bg-card text-ink-2"
            }`}>
            {label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing here" body="No variants match that filter — which, for out of stock, is good news." />
      ) : (
        <Table head={["Product", "Variant", "Item code", "Stock", ""]}>
          {rows.map((v) => {
            let label = "Standard";
            try {
              const a = Object.values(JSON.parse(v.attrs) as Record<string, string>).filter(Boolean);
              if (a.length) label = a.join(" · ");
            } catch { /* keep the default */ }
            return (
              <tr key={v.id} className="hover:bg-page">
                <td className="px-3 py-2">
                  <Link href={`/admin/products/${v.product.id}`} className="font-semibold text-ink hover:text-rex-red">
                    {v.product.name}
                  </Link>
                  <span className="block text-[11.5px] text-ink-3">
                    {v.product.brand}{v.product.status !== "ACTIVE" && ` · ${v.product.status.toLowerCase()}`}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-2">{label}</td>
                <td className="px-3 py-2 text-ink-3 tnum">{v.sku}</td>
                <td className="px-3 py-2">
                  <StockEditor sku={v.sku} productId={v.product.id} stock={v.stock} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/products/${v.product.id}`} className="text-[12.5px] font-bold text-rex-red hover:underline">
                    Edit product
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <div className="h-10" />
    </>
  );
}
