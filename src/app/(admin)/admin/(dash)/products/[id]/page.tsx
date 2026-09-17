import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductEditor } from "./ProductEditor";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, rooms] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: "asc" } }, category: true },
    }),
    db.category.findMany({ include: { dept: { select: { name: true } } }, orderBy: { name: "asc" } }),
    db.setting.findUnique({ where: { key: "rooms" } }),
  ]);
  if (!product) notFound();

  const sold = await db.orderItem.aggregate({
    where: { productId: product.id },
    _sum: { qty: true },
  });

  const parse = <T,>(s: string, f: T): T => { try { return JSON.parse(s) as T; } catch { return f; } };

  return (
    <>
      <div className="mb-4 flex items-center gap-3 text-[13px]">
        <Link href="/admin/products" className="font-semibold text-ink-3 hover:text-rex-red">← Products</Link>
        <Link href={`/p/${product.slug}`} target="_blank" className="font-semibold text-ink-3 hover:text-rex-red">
          View on shop ↗
        </Link>
        {(sold._sum.qty ?? 0) > 0 && (
          <span className="text-ink-3 tnum">{sold._sum.qty} sold all time</span>
        )}
      </div>

      <ProductEditor
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          tagline: product.tagline,
          description: product.description,
          categoryId: product.categoryId,
          warranty: product.warranty ?? "",
          wattage: product.wattage ? String(product.wattage) : "",
          status: product.status,
          featured: product.featured,
          own: product.own,
          estimatedPrice: product.estimatedPrice,
          highlights: parse<string[]>(product.highlights, []),
          specs: parse<Record<string, string>>(product.specs, {}),
          rooms: parse<string[]>(product.rooms, []),
          images: parse<string[]>(product.images, []),
          variants: product.variants.map((v) => ({
            sku: v.sku,
            label: Object.values(parse<Record<string, string>>(v.attrs, {})).filter(Boolean).join(" · ") || "Standard",
            mrp: v.mrp, price: v.price, stock: v.stock, active: v.active,
          })),
        }}
        categories={categories.map((c) => ({ id: c.id, name: `${c.dept.name} › ${c.name}` }))}
        allRooms={parse<{ slug: string; name: string }[]>(rooms?.value ?? "[]", [])}
      />
    </>
  );
}
