import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { ContentManager } from "./ContentManager";

export const metadata = { title: "Content" };

export default async function ContentPage() {
  const [banners, roomsSetting, announcement] = await Promise.all([
    db.banner.findMany({ orderBy: [{ slot: "asc" }, { position: "asc" }] }),
    db.setting.findUnique({ where: { key: "rooms" } }),
    db.setting.findUnique({ where: { key: "announcement" } }),
  ]);

  const parse = <T,>(s: string | undefined, f: T): T => {
    try { return s ? (JSON.parse(s) as T) : f; } catch { return f; }
  };

  return (
    <>
      <PageHead title="Content" sub="Banners, room photos and the message across the top of the shop" />
      <ContentManager
        banners={banners.map((b) => ({
          id: b.id, slot: b.slot, title: b.title, subtitle: b.subtitle,
          image: b.image ?? "", link: b.link, position: b.position, active: b.active,
        }))}
        rooms={parse<{ slug: string; name: string; image: string | null }[]>(roomsSetting?.value, [])}
        announcement={parse<{ text: string; active: boolean }>(announcement?.value, { text: "", active: false })}
      />
    </>
  );
}
