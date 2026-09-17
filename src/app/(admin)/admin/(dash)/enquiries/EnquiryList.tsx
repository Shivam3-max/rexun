"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, dateLong } from "@/components/admin/ui";
import { replyEnquiry } from "../../actions";

type E = {
  id: string; name: string; phone: string; email: string | null;
  subject: string; message: string; status: string; reply: string; createdAt: string;
};

export function EnquiryList({ enquiries }: { enquiries: E[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(enquiries[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = (e: E, status: string) =>
    startTransition(async () => {
      await replyEnquiry(e.id, drafts[e.id] ?? e.reply, status);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {enquiries.map((e) => {
        const expanded = open === e.id;
        return (
          <article key={e.id} className="overflow-hidden rounded-card border border-line bg-card">
            <button type="button" onClick={() => setOpen(expanded ? null : e.id)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-page">
              <Pill value={e.status} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">
                  {e.name} <span className="font-normal text-ink-3 tnum">· {e.phone}</span>
                </span>
                <span className="block truncate text-[13px] text-ink-2">
                  {e.subject} — {e.message}
                </span>
              </span>
              <span className="shrink-0 text-[12px] text-ink-3 tnum">{dateLong(e.createdAt)}</span>
            </button>

            {expanded && (
              <div className="border-t border-line px-4 py-4">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{e.message}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`tel:${e.phone}`} className="rounded border border-ink px-3 py-1.5 text-[12.5px] font-bold text-ink hover:bg-ink hover:text-white">
                    Call {e.phone}
                  </a>
                  <a href={`https://wa.me/91${e.phone}`} target="_blank" rel="noreferrer"
                    className="rounded border border-save px-3 py-1.5 text-[12.5px] font-bold text-save hover:bg-save hover:text-white">
                    WhatsApp
                  </a>
                  {e.email && (
                    <a href={`mailto:${e.email}`} className="rounded border border-line-2 px-3 py-1.5 text-[12.5px] font-bold text-ink-2 hover:border-ink">
                      {e.email}
                    </a>
                  )}
                </div>

                <label htmlFor={`reply-${e.id}`} className="mt-4 block text-[12.5px] font-bold text-ink">
                  What you told them (for your own record)
                </label>
                <textarea id={`reply-${e.id}`} rows={3}
                  value={drafts[e.id] ?? e.reply}
                  onChange={(ev) => setDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
                  className="mt-1 w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red" />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={pending} onClick={() => save(e, "REPLIED")}
                    className="rounded bg-rex-red px-3.5 py-2 text-[13px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
                    Mark replied
                  </button>
                  <button type="button" disabled={pending} onClick={() => save(e, "CLOSED")}
                    className="rounded border border-line-2 px-3.5 py-2 text-[13px] font-bold text-ink hover:border-ink disabled:opacity-60">
                    Close
                  </button>
                  {e.status !== "NEW" && (
                    <button type="button" disabled={pending} onClick={() => save(e, "NEW")}
                      className="rounded border border-line-2 px-3.5 py-2 text-[13px] font-bold text-ink-3 hover:border-ink disabled:opacity-60">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
