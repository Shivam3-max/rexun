import Link from "next/link";

/**
 * Shared shell for the policy pages. Trust in this category is won on these
 * four pages more than on the product pages, so they get real typography and
 * plain answers rather than a wall of legal text.
 */
export function HelpPage({
  title,
  intro,
  sections,
  footnote,
}: {
  title: string;
  intro: string;
  sections: { h: string; p: string[] }[];
  footnote?: string;
}) {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-10">
      <h1 className="text-[28px] font-bold text-ink sm:text-[34px]">{title}</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-ink-2">{intro}</p>

      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-[19px] font-bold text-ink">{s.h}</h2>
            {s.p.map((line) => (
              <p key={line} className="mt-2 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">
                {line}
              </p>
            ))}
          </section>
        ))}
      </div>

      {footnote && (
        <p className="mt-9 rounded-card border border-line bg-card p-4 text-[14px] text-ink-2">
          {footnote}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/contact" className="rounded bg-ink px-4 py-2.5 text-[14px] font-bold text-white hover:bg-black">
          Still have a question?
        </Link>
        <Link href="/" className="rounded border border-ink px-4 py-2.5 text-[14px] font-bold text-ink hover:bg-ink hover:text-white">
          Back to shopping
        </Link>
      </div>
    </div>
  );
}
