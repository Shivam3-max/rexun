import Link from "next/link";
import { db } from "@/lib/db";
import { NewProductForm } from "./NewProductForm";

export const metadata = { title: "Add a product" };

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    include: { dept: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Link href="/admin/products" className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">
        ← Products
      </Link>
      <NewProductForm categories={categories.map((c) => ({ id: c.id, name: `${c.dept.name} › ${c.name}` }))} />
    </>
  );
}
