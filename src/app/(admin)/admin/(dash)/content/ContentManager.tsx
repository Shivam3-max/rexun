"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { saveBanner, deleteBanner, saveRooms, saveSetting } from "../../actions";

type Banner = {
  id: string; slot: string; title: string; subtitle: string;
  image: string; link: string; position: number; active: boolean;
};
type Room = { slug: string; name: string; image: string | null };

const SLOTS: { id: string; label: string; hint: string }[] = [
  { id: "HERO", label: "Hero banner", hint: "Wide banner at the top of the home page — 1280 × 480" },
  { id: "PROMO", label: "Promo tiles", hint: "Two tiles beside the hero on desktop — 320 × 228" },
  { id: "STRIP", label: "Strip banners", hint: "Optional banner between home page sections" },
];

export function ContentManager({
  banners,
  rooms,
  announcement,
}: {
  banners: Banner[];
  rooms: Room[];
  announcement: { text: string; active: boolean };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Partial<Banner> | null>(null);
  const [roomState, setRoomState] = useState<Room[]>(rooms);
  const [ann, setAnn] = useState(announcement);

  const flash = (m: string) => { setMsg(m); setError(""); setTimeout(() => setMsg(""), 3000); };

  const submitBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const res = await saveBanner({
        id: draft.id, slot: draft.slot ?? "HERO", title: draft.title ?? "",
        subtitle: draft.subtitle ?? "", image: draft.image ?? "", link: draft.link ?? "",
        position: Number(draft.position) || 0, active: draft.active ?? true,
      });
      if (!res.ok) { setError(res.error); return; }
      setDraft(null); flash("Banner saved"); router.refresh();
    });
  };

  return (
    <>
      {(msg || error) && (
        <p className={`mb-4 rounded border px-3 py-2 text-[13px] font-semibold ${
          error ? "border-rex-red/40 bg-rex-red-tint text-rex-red" : "border-save/40 bg-save-tint text-save"
        }`}>
          {error || msg}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Announcement bar" sub="The thin dark line above the red header">
          <label htmlFor="ann" className="text-[13px] font-bold text-ink">Message</label>
          <input id="ann" value={ann.text} onChange={(e) => setAnn((a) => ({ ...a, text: e.target.value }))}
            className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
          <label className="mt-3 flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" checked={ann.active} onChange={(e) => setAnn((a) => ({ ...a, active: e.target.checked }))}
              className="h-4 w-4 accent-[#d01c22]" />
            Show it
          </label>
          <button type="button" disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await saveSetting("announcement", ann);
              if (!res.ok) { setError(res.error); return; }
              flash("Announcement saved"); router.refresh();
            })}
            className="mt-3 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
            Save
          </button>
        </Card>

        <Card title="Room photos" sub="Used on the home page and the shop-by-room pages">
          <div className="space-y-3">
            {roomState.map((r, i) => (
              <ImageField key={r.slug} label={r.name} value={r.image ?? ""}
                onChange={(v) => setRoomState((prev) => prev.map((x, idx) => (idx === i ? { ...x, image: v || null } : x)))} />
            ))}
          </div>
          <button type="button" disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await saveRooms(roomState);
              if (!res.ok) { setError(res.error); return; }
              flash("Room photos saved"); router.refresh();
            })}
            className="mt-4 rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark disabled:opacity-60">
            Save room photos
          </button>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-[17px] font-bold text-ink">Banners</h2>

      {draft && (
        <Card title={draft.id ? "Edit banner" : "New banner"} className="mb-4">
          <form onSubmit={submitBanner} className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[13px] font-bold text-ink">Where it goes</span>
              <select value={draft.slot ?? "HERO"} onChange={(e) => setDraft((s) => ({ ...s, slot: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 bg-card px-3 py-2.5 text-[14px] outline-none focus:border-rex-red">
                {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <p className="mt-1 text-[12px] text-ink-3">{SLOTS.find((s) => s.id === (draft.slot ?? "HERO"))?.hint}</p>
            </div>
            <div>
              <span className="text-[13px] font-bold text-ink">Links to</span>
              <input value={draft.link ?? ""} onChange={(e) => setDraft((s) => ({ ...s, link: e.target.value }))}
                placeholder="/c/ceiling-fans"
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
            <div className="sm:col-span-2">
              <ImageField label="Image" value={draft.image ?? ""} onChange={(v) => setDraft((s) => ({ ...s, image: v }))} />
            </div>
            <div>
              <span className="text-[13px] font-bold text-ink">Title (for your reference)</span>
              <input value={draft.title ?? ""} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] outline-none focus:border-rex-red" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-ink">Order</span>
              <input value={String(draft.position ?? 0)} inputMode="numeric"
                onChange={(e) => setDraft((s) => ({ ...s, position: Number(e.target.value.replace(/\D/g, "")) || 0 }))}
                className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[14px] tnum outline-none focus:border-rex-red" />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-ink-2 sm:col-span-2">
              <input type="checkbox" checked={draft.active ?? true}
                onChange={(e) => setDraft((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 accent-[#d01c22]" />
              Show it on the shop
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                Save banner
              </button>
              <button type="button" onClick={() => setDraft(null)} className="rounded border border-line-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {!draft && (
        <button type="button" onClick={() => setDraft({ slot: "HERO", active: true, position: 0 })}
          className="mb-4 rounded bg-rex-red px-3.5 py-2 text-[13.5px] font-bold text-white hover:bg-rex-red-dark">
          Add a banner
        </button>
      )}

      <div className="space-y-5">
        {SLOTS.map((slot) => {
          const list = banners.filter((b) => b.slot === slot.id);
          return (
            <div key={slot.id}>
              <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-ink-3">{slot.label}</h3>
              {list.length === 0 ? (
                <p className="rounded-card border border-dashed border-line-2 bg-card px-4 py-5 text-[13.5px] text-ink-2">
                  Nothing here — the shop shows a labelled placeholder in this slot. {slot.hint}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((b) => (
                    <div key={b.id} className="overflow-hidden rounded-card border border-line bg-card">
                      {b.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.image} alt="" className="aspect-[16/6] w-full bg-page object-cover" />
                      ) : (
                        <div className="ph grid aspect-[16/6] w-full place-items-center text-[11px] font-bold uppercase tracking-wider">
                          No image yet
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 p-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-bold text-ink">{b.title || "Untitled"}</span>
                          <span className="block truncate text-[11.5px] text-ink-3">
                            {b.link || "no link"}{!b.active && " · hidden"}
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setDraft(b)}
                            className="rounded border border-line-2 px-2 py-1 text-[11.5px] font-bold text-ink hover:border-ink">
                            Edit
                          </button>
                          <button type="button"
                            onClick={() => {
                              if (!confirm("Delete this banner?")) return;
                              startTransition(async () => { await deleteBanner(b.id); flash("Banner deleted"); router.refresh(); });
                            }}
                            className="rounded border border-line-2 px-2 py-1 text-[11.5px] font-bold text-ink-3 hover:border-rex-red hover:text-rex-red">
                            ×
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-10" />
    </>
  );
}
