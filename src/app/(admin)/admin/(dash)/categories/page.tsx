import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { TaxonomyManager } from "./TaxonomyManager";

export const metadata = { title: "Categories" };

export default async function CategoriesAdminPage() {
  const [departments, categories, counts] = await Promise.all([
    db.department.findMany({ orderBy: { position: "asc" } }),
    db.category.findMany({ orderBy: { position: "asc" } }),
    db.product.groupBy({ by: ["categoryId"], _count: true }),
  ]);

  const countFor = (id: string) => counts.find((c) => c.categoryId === id)?._count ?? 0;

  return (
    <>
      <PageHead
        title="Departments & categories"
        sub="The shop's navigation. Hiding a department takes it off the menu without touching its products."
      />
      <TaxonomyManager
        departments={departments.map((d) => ({
          id: d.id, slug: d.slug, name: d.name, blurb: d.blurb,
          image: d.image ?? "", visible: d.visible, position: d.position,
        }))}
        categories={categories.map((c) => ({
          id: c.id, slug: c.slug, name: c.name, deptId: c.deptId,
          image: c.image ?? "", visible: c.visible, position: c.position,
          count: countFor(c.id),
        }))}
      />
    </>
  );
}
