import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { ProductTable } from "./ProductTable";

export const metadata = { title: "Products" };

const PAGE_SIZE = 40;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cat?: string; brand?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.cat) where.categoryId = sp.cat;
  if (sp.brand) where.brand = sp.brand;
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const [rows, total, categories, brands] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        variants: { select: { stock: true, price: true, mrp: true, active: true } },
      },
      orderBy: [{ own: "desc" }, { position: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.groupBy({ by: ["brand"], _count: true, orderBy: { brand: "asc" } }),
  ]);

  const products = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category.name,
    status: p.status,
    own: p.own,
    featured: p.featured,
    estimatedPrice: p.estimatedPrice,
    price: p.price,
    priceMax: p.priceMax,
    mrp: p.mrp,
    image: (JSON.parse(p.images || "[]") as string[])[0] ?? null,
    variantCount: p.variants.length,
    stock: p.variants.filter((v) => v.active).reduce((s, v) => s + v.stock, 0),
  }));

  return (
    <>
      <PageHead
        title="Products"
        sub={`${total} matching · ${PAGE_SIZE} per page`}
        action={
          <Link
            href="/admin/products/new"
            className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark"
          >
            Add a product
          </Link>
        }
      />
      <ProductTable
        products={products}
        categories={categories}
        brands={brands.map((b) => ({ name: b.brand, count: b._count }))}
        filters={{ q: sp.q ?? "", status: sp.status ?? "", cat: sp.cat ?? "", brand: sp.brand ?? "" }}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      />
    </>
  );
}
