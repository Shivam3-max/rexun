import { db } from "@/lib/db";
import { PageHead, Table, Empty, dateLong } from "@/components/admin/ui";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const logs = await db.auditLog.findMany({ orderBy: { at: "desc" }, take: 200 });

  return (
    <>
      <PageHead title="Activity" sub="Every change made in this panel, newest first" />
      {logs.length === 0 ? (
        <Empty title="Nothing logged yet" body="Edits to products, orders, settings and staff are recorded here." />
      ) : (
        <Table head={["When", "Who", "Action", "What", "Detail"]}>
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-page">
              <td className="px-3 py-2 text-ink-3 tnum">{dateLong(l.at)}</td>
              <td className="px-3 py-2 font-semibold text-ink">{l.actor}</td>
              <td className="px-3 py-2 text-ink-2">{l.action.toLowerCase().replace(/_/g, " ")}</td>
              <td className="px-3 py-2 text-ink-2">{l.entity}</td>
              <td className="px-3 py-2 text-ink-3">{l.detail.slice(0, 70)}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="h-10" />
    </>
  );
}
