import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";
import { SignOutButton } from "./SignOutButton";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");

  const [orders, addressCount] = await Promise.all([
    db.order.findMany({
      where: { customerId: customer.id },
      orderBy: { placedAt: "desc" },
      take: 3,
      include: { items: { take: 3 } },
    }),
    db.address.count({ where: { customerId: customer.id } }),
  ]);

  const spent = await db.order.aggregate({
    where: { customerId: customer.id, status: { not: "CANCELLED" } },
    _sum: { total: true },
    _count: true,
  });

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-ink">Hello, {customer.name.split(" ")[0]}</h1>
          <p className="mt-1 text-[14.5px] text-ink-2 tnum">{customer.phone}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={String(spent._count)} />
        <Stat label="Total spent" value={inr(spent._sum.total ?? 0)} />
        <Stat label="Saved addresses" value={String(addressCount)} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Tile href="/account/orders" title="Your orders" body="Every order, its status and what was in it." />
        <Tile href="/account/addresses" title="Addresses" body="Save the addresses you order to most." />
        <Tile href="/track" title="Track an order" body="Follow a delivery step by step." />
        <Tile href="/help/warranty" title="Warranty & service" body="How to raise a claim, and what is covered." />
      </div>

      <h2 className="mt-9 text-[19px] font-bold text-ink">Recent orders</h2>
      {orders.length === 0 ? (
        <p className="mt-2 rounded-card border border-line bg-card px-4 py-6 text-[14.5px] text-ink-2">
          Nothing yet.{" "}
          <Link href="/" className="font-semibold text-rex-red hover:underline">Start shopping →</Link>
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.ref}`} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3 hover:border-line-2">
                <span>
                  <span className="block text-[14.5px] font-bold text-ink tnum">{o.ref}</span>
                  <span className="block text-[12.5px] text-ink-3">
                    {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{o.items.map((i) => i.name).join(", ").slice(0, 60)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded bg-page px-2 py-1 text-[11.5px] font-bold uppercase tracking-wider text-ink-2">{o.status}</span>
                  <span className="text-[15px] font-bold text-ink tnum">{inr(o.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-4 py-3">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-[21px] font-bold text-ink tnum">{value}</p>
    </div>
  );
}

function Tile({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-card border border-line bg-card p-4 hover:border-line-2">
      <h3 className="text-[15.5px] font-bold text-ink group-hover:text-rex-red">{title}</h3>
      <p className="mt-1 text-[13.5px] text-ink-2">{body}</p>
    </Link>
  );
}
