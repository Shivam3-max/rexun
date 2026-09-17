import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { SettingsManager } from "./SettingsManager";
import { getAdmin } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [rows, staff, me] = await Promise.all([
    db.setting.findMany(),
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    getAdmin(),
  ]);

  const get = <T,>(key: string, fallback: T): T => {
    const row = rows.find((r) => r.key === key);
    if (!row) return fallback;
    try { return JSON.parse(row.value) as T; } catch { return fallback; }
  };

  return (
    <>
      <PageHead title="Settings" sub="Store details, delivery rules, payment methods and staff access" />
      <SettingsManager
        store={get("store", {
          name: "Rexsun", tagline: "", phone: "", whatsapp: "",
          email: "", address: "", gstin: "", hours: "",
        })}
        shipping={get("shipping", {
          freeOver: 999, flatRate: 79, codLimit: 15000,
          tricityDays: 2, northDays: 4, restDays: 6,
        })}
        payments={get("payments", { upi: true, card: true, netbanking: true, cod: true })}
        running={get("running", { hoursPerDay: 8, ratePerUnit: 8 })}
        staff={staff.map((s) => ({
          id: s.id, email: s.email, name: s.name, role: s.role, active: s.active,
          lastLoginAt: s.lastLoginAt ? s.lastLoginAt.toISOString() : null,
        }))}
        isOwner={me?.role === "ADMIN"}
      />
    </>
  );
}
