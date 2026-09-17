import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Table, Pill, Stat, Empty, dateLong, Card } from "@/components/admin/ui";
import { channelStatus } from "@/lib/notify";
import { ResendButton } from "./ResendButton";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const [rows, counts] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
    db.notification.groupBy({ by: ["status"], _count: true }),
  ]);
  const channels = channelStatus();
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHead
        title="Messages"
        sub="Every WhatsApp and email the shop has composed for a customer"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sent" value={String(count("SENT"))} tone="good" />
        <Stat label="Waiting on setup" value={String(count("SKIPPED"))} tone={count("SKIPPED") ? "warn" : "plain"} />
        <Stat label="Failed" value={String(count("FAILED"))} tone={count("FAILED") ? "bad" : "plain"} />
        <Stat label="Queued" value={String(count("QUEUED"))} />
      </div>

      {(!channels.whatsapp || !channels.email) && (
        <Card title="Delivery is not switched on yet" className="mb-5">
          <p className="text-[13.5px] text-ink-2">
            Messages are composed and stored either way, so nothing is lost — they just are not
            delivered until a provider is configured.
          </p>
          <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-2">
            <li>
              <strong className="text-ink">WhatsApp</strong> —{" "}
              {channels.whatsapp ? "connected" : "set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env"}
            </li>
            <li>
              <strong className="text-ink">Email</strong> —{" "}
              {channels.email ? "connected" : "set RESEND_API_KEY and EMAIL_FROM in .env"}
            </li>
          </ul>
        </Card>
      )}

      {rows.length === 0 ? (
        <Empty title="Nothing yet" body="Order confirmations, dispatch notices and delivery messages appear here as they are composed." />
      ) : (
        <Table head={["When", "Channel", "To", "Message", "Order", "Status", ""]}>
          {rows.map((n) => (
            <tr key={n.id} className="hover:bg-page align-top">
              <td className="px-3 py-2.5 text-ink-3 tnum">{dateLong(n.createdAt)}</td>
              <td className="px-3 py-2.5 capitalize text-ink-2">{n.channel}</td>
              <td className="px-3 py-2.5 text-ink-2 tnum">{n.to}</td>
              <td className="max-w-[340px] px-3 py-2.5 text-ink-2">
                <span className="block font-semibold text-ink">{n.subject}</span>
                <span className="block whitespace-pre-wrap text-[12.5px] text-ink-3">
                  {n.body.slice(0, 130)}{n.body.length > 130 ? "…" : ""}
                </span>
                {n.error && <span className="mt-1 block text-[12px] text-rex-red">{n.error}</span>}
              </td>
              <td className="px-3 py-2.5">
                {n.orderRef && (
                  <Link href={`/admin/orders/${n.orderRef}`} className="font-bold text-rex-red tnum hover:underline">
                    {n.orderRef}
                  </Link>
                )}
              </td>
              <td className="px-3 py-2.5"><Pill value={n.status} /></td>
              <td className="px-3 py-2.5 text-right">
                {n.status !== "SENT" && n.orderRef && <ResendButton id={n.id} />}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="h-10" />
    </>
  );
}
