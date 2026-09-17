const STEPS = [
  { key: "PLACED", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

/**
 * Five fixed steps, because a shopper wants to know where in the journey they
 * are — not a raw event log. A cancelled order drops out of the trail entirely
 * rather than showing four hopeful grey dots.
 */
export function OrderStatusTrail({
  status,
  events,
}: {
  status: string;
  events: { status: string; note: string; at: string }[];
}) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded border border-rex-red/40 bg-rex-red-tint px-4 py-3">
        <p className="text-[14px] font-bold text-rex-red">Order cancelled</p>
        {events.at(-1)?.note && <p className="mt-1 text-[13px] text-ink-2">{events.at(-1)?.note}</p>}
      </div>
    );
  }

  const at = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const stamp = (key: string) => {
    const e = events.find((x) => x.status === key);
    return e ? new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
  };

  return (
    <ol className="flex">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : done ? "bg-save" : "bg-line"}`} />
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  done ? "bg-save text-white" : "border border-line-2 bg-card text-ink-3"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "bg-transparent" : i < at ? "bg-save" : "bg-line"}`} />
            </div>
            <span className={`mt-1.5 text-[11.5px] font-semibold ${done ? "text-ink" : "text-ink-3"}`}>{s.label}</span>
            <span className="text-[10.5px] text-ink-3 tnum">{stamp(s.key) ?? ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
