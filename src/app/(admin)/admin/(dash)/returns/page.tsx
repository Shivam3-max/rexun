import { db } from "@/lib/db";
import { PageHead, Empty, Stat } from "@/components/admin/ui";
import { ReturnQueue } from "./ReturnQueue";

export const metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const [requests, open] = await Promise.all([
    db.returnRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { order: { select: { ref: true, name: true, phone: true, city: true, total: true, paymentMethod: true } } },
      take: 100,
    }),
    db.returnRequest.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <>
      <PageHead title="Returns & replacements" sub="Claims raised by customers after delivery" />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Open" value={String(open)} tone={open ? "warn" : "good"} />
        <Stat label="Approved" value={String(requests.filter((r) => r.status === "APPROVED").length)} />
        <Stat label="Resolved" value={String(requests.filter((r) => r.status === "RESOLVED").length)} tone="good" />
      </div>

      {requests.length === 0 ? (
        <Empty
          title="No requests"
          body="A customer can raise a replacement or refund within 7 days of delivery. Anything they send arrives here."
        />
      ) : (
        <ReturnQueue
          requests={requests.map((r) => ({
            id: r.id, sku: r.sku, itemName: r.itemName, qty: r.qty, type: r.type,
            reason: r.reason, detail: r.detail, status: r.status,
            resolution: r.resolution ?? "", createdAt: r.createdAt.toISOString(),
            order: r.order,
          }))}
        />
      )}
      <div className="h-10" />
    </>
  );
}
