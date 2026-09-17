/**
 * Every image slot the client will fill in later renders through here, so an
 * unfinished asset reads as a labelled empty frame rather than as a broken
 * page or, worse, as stock photography pretending to be the real thing.
 */
export function Placeholder({
  label,
  ratio = "4 / 3",
  className = "",
}: {
  label: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={`ph flex items-center justify-center border border-line ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
    </div>
  );
}
