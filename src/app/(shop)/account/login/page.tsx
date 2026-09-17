import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { getCustomer } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCustomer()) redirect("/account");
  return <AuthForm mode="login" />;
}
