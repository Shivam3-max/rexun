import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <LoginForm />;
}
