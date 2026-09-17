import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseView } from "@/components/BrowseView";
import { byRoom, getTaxonomy, getRunningAssumptions } from "@/lib/store";

const INTRO: Record<string, string> = {
  "living-room": "Ceiling fans, lighting and the spike guards that keep the TV safe.",
  bedroom: "Quiet fans, warm lighting, coolers and heaters for the season.",
  kitchen: "Mixers, kettles, induction cooktops, exhaust fans and bright task lighting.",
  bathroom: "Geysers sized to your family, exhaust fans and damp-safe downlights.",
  outdoor: "Torches, doorbells and strip lighting for balconies and gates.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = (await getTaxonomy()).rooms.find((x) => x.slug === slug);
  return r ? { title: `${r.name} — shop by room`, description: INTRO[slug] } : { title: "Not found" };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = (await getTaxonomy()).rooms.find((x) => x.slug === slug);
  if (!r) notFound();
  const [products, running] = await Promise.all([byRoom(slug), getRunningAssumptions()]);
  return (
    <BrowseView
      products={products}
      title={`Everything for the ${r.name.toLowerCase()}`}
      sub={INTRO[slug]}
      running={running}
    />
  );
}
