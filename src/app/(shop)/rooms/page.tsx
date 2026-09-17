import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { getTaxonomy } from "@/lib/store";

export const metadata = { title: "Shop by room" };

const COPY: Record<string, string> = {
  "living-room": "Ceiling fans, lighting and spike guards for the TV corner.",
  bedroom: "Quiet fans, warm lighting, and coolers or heaters for the season.",
  kitchen: "Mixers, kettles, induction cooktops, exhaust fans and bright task lighting.",
  bathroom: "Geysers sized to your family, exhaust fans and damp-safe downlights.",
  outdoor: "Torches, doorbells and strip lighting for balconies, gates and terraces.",
};

export default async function RoomsPage() {
  const taxonomy = await getTaxonomy();
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-[28px] font-bold text-ink sm:text-[34px]">Shop by room</h1>
      <p className="mt-2 max-w-[62ch] text-[15.5px] text-ink-2">
        Most people arrive with a room that needs sorting out rather than a product code.
        Pick the room and we will show you everything that belongs in it.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taxonomy.rooms.map((r) => (
          <Link key={r.slug} href={`/rooms/${r.slug}`} className="group overflow-hidden rounded-card border border-line bg-card hover:border-line-2">
            {r.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <Placeholder label="Room photo" ratio="16 / 9" className="border-0" />
            )}
            <div className="p-4">
              <h2 className="text-[18px] font-bold text-ink group-hover:text-rex-red">{r.name}</h2>
              <p className="mt-1 text-[14px] text-ink-2">{COPY[r.slug]}</p>
              <p className="mt-2 text-[12.5px] font-semibold text-ink-3 tnum">{r.count} products</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
