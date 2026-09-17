import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead, Table, Stat, Empty, dateShort } from "@/components/admin/ui";
import { inr } from "@/lib/pricing";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const where = q
    ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
    : {};

  const [customers, total, withAccounts] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        orders: { select: { total: true, status: true, placedAt: true } },
        _count: { select: { addresses: true } },
      },
    }),
    db.customer.count(),
    db.customer.count({ where: { passwordHash: { not: null } } }),
  ]);

  const rows = customers
    .map((c) => {
      const live = c.orders.filter((o) => o.status !== "CANCELLED");
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        hasAccount: !!c.passwordHash,
        orders: live.length,
        spent: live.reduce((s, o) => s + o.total, 0),
        last: live.length ? live.map((o) => o.placedAt).sort((a, b) => +b - +a)[0] : null,
        joined: c.createdAt,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return (
    <>
      <PageHead title="Customers" sub={`${total} in total · highest spend first`} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Customers" value={String(total)} />
        <Stat label="With an account" value={String(withAccounts)} note="the rest checked out as guests" />
        <Stat label="Repeat buyers" value={String(rows.filter((r) => r.orders > 1).length)} tone="good" />
      </div>

      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Name, phone or email"
          className="w-full max-w-sm rounded border border-line-2 bg-card px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />
        <button type="submit" className="rounded border border-ink px-3 py-2 text-[13px] font-bold text-ink hover:bg-ink hover:text-white">
          Search
        </button>
        {q && <Link href="/admin/customers" className="self-center text-[13px] font-semibold text-rex-red hover:underline">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty title="No customers yet" body="Anyone who places an order — with or without an account — appears here." />
      ) : (
        <Table head={["Customer", "Contact", "Orders", "Spent", "Last order", "Joined", ""]}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-page">
              <td className="px-3 py-2.5">
                <Link href={`/admin/customers/${c.id}`} className="font-semibold text-ink hover:text-rex-red">
                  {c.name}
                </Link>
                {!c.hasAccount && <span className="ml-2 text-[11px] uppercase tracking-wider text-ink-3">guest</span>}
              </td>
              <td className="px-3 py-2.5 text-ink-2 tnum">
                {c.phone}
                {c.email && <span className="block text-[12px] text-ink-3">{c.email}</span>}
              </td>
              <td className="px-3 py-2.5 text-ink-2 tnum">{c.orders}</td>
              <td className="px-3 py-2.5 font-bold text-ink tnum">{inr(c.spent)}</td>
              <td className="px-3 py-2.5 text-ink-3 tnum">{c.last ? dateShort(c.last) : "—"}</td>
              <td className="px-3 py-2.5 text-ink-3 tnum">{dateShort(c.joined)}</td>
              <td className="px-3 py-2.5 text-right">
                <Link href={`/admin/customers/${c.id}`} className="text-[12.5px] font-bold text-rex-red hover:underline">
                  Open
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
