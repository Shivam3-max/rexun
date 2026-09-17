import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { AdminNav } from "../AdminNav";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminNav user={{ name: admin.name, email: admin.email, role: admin.role }} />
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">{children}</div>
    </>
  );
}
