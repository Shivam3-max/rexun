import Link from "next/link";
import { inr } from "@/lib/pricing";

/**
 * The admin panel's vocabulary. A handful of pieces used everywhere, so a
 * table on the orders page and a table on the products page are recognisably
 * the same object rather than two designs that drifted apart.
 */

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-bold text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  sub,
  children,
  className = "",
}: {
  title?: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-card ${className}`}>
      {title && (
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] text-ink-2">{sub}</p>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "plain",
  href,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "plain" | "good" | "warn" | "bad";
  href?: string;
}) {
  const toneClass = {
    plain: "text-ink",
    good: "text-save",
    warn: "text-[#8A5A05]",
    bad: "text-rex-red",
  }[tone];

  const body = (
    <>
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-1 text-[24px] font-bold tnum ${toneClass}`}>{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-ink-2">{note}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="rounded-card border border-line bg-card px-4 py-3 hover:border-line-2">
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-card px-4 py-3">{body}</div>
  );
}

const STATUS_TONE: Record<string, string> = {
  PLACED: "bg-rex-gold-tint text-[#8A5A05]",
  CONFIRMED: "bg-[#eef3fb] text-[#2b5fa8]",
  PACKED: "bg-[#eef3fb] text-[#2b5fa8]",
  SHIPPED: "bg-[#eef3fb] text-[#2b5fa8]",
  DELIVERED: "bg-save-tint text-save",
  CANCELLED: "bg-rex-red-tint text-rex-red",
  PAID: "bg-save-tint text-save",
  PENDING: "bg-rex-gold-tint text-[#8A5A05]",
  REFUNDED: "bg-page text-ink-2",
  FAILED: "bg-rex-red-tint text-rex-red",
  ACTIVE: "bg-save-tint text-save",
  DRAFT: "bg-page text-ink-2",
  ARCHIVED: "bg-page text-ink-3",
  NEW: "bg-rex-gold-tint text-[#8A5A05]",
  REPLIED: "bg-save-tint text-save",
  CLOSED: "bg-page text-ink-3",
};

export function Pill({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        STATUS_TONE[value] ?? "bg-page text-ink-2"
      }`}
    >
      {value.toLowerCase()}
    </span>
  );
}

export function Money({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`tnum ${className}`}>{inr(n)}</span>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-dashed border-line-2 bg-card px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-[13.5px] text-ink-2">{body}</p>
    </div>
  );
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[640px] text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-page">
            {head.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const dateShort = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

export const dateLong = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
