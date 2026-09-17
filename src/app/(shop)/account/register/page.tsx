import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { getCustomer } from "@/lib/auth";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getCustomer()) redirect("/account");
  return <AuthForm mode="register" />;
}
