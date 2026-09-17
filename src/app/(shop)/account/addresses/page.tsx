import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressBook } from "./AddressBook";

export const metadata = { title: "Your addresses" };

export default async function AddressesPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");

  const addresses = await db.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <Link href="/account" className="text-[13px] font-semibold text-ink-3 hover:text-rex-red">← Account</Link>
      <h1 className="mt-2 text-[26px] font-bold text-ink">Your addresses</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">Saved addresses fill in the checkout for you.</p>
      <AddressBook
        addresses={addresses}
        defaults={{ name: customer.name, phone: customer.phone }}
      />
    </div>
  );
}
