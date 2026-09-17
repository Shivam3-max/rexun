import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { CouponManager } from "./CouponManager";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const [coupons, usage] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.order.groupBy({
      by: ["couponCode"],
      where: { couponCode: { not: null } },
      _count: true,
      _sum: { discount: true },
    }),
  ]);

  return (
    <>
      <PageHead title="Coupons" sub="Codes customers can enter at checkout" />
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id, code: c.code, description: c.description, type: c.type, value: c.value,
          minOrder: c.minOrder, maxDiscount: c.maxDiscount, usageLimit: c.usageLimit,
          usedCount: c.usedCount, active: c.active,
          startsAt: c.startsAt ? c.startsAt.toISOString().slice(0, 10) : "",
          endsAt: c.endsAt ? c.endsAt.toISOString().slice(0, 10) : "",
          given: usage.find((u) => u.couponCode === c.code)?._sum.discount ?? 0,
        }))}
      />
    </>
  );
}
