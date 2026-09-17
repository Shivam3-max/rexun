import { CheckoutForm } from "./CheckoutForm";
import { getShippingRules, getPaymentMethods } from "@/lib/store";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { gatewayConfig } from "@/lib/payments";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [shipping, methods, customer] = await Promise.all([
    getShippingRules(),
    getPaymentMethods(),
    getCustomer(),
  ]);

  // A signed-in shopper should never retype an address they already gave us.
  const saved = customer
    ? await db.address.findFirst({
        where: { customerId: customer.id },
        orderBy: [{ isDefault: "desc" }, { id: "desc" }],
      })
    : null;

  return (
    <CheckoutForm
      shipping={shipping}
      methods={methods}
      signedIn={!!customer}
      gatewayLive={gatewayConfig().configured}
      prefill={
        customer
          ? {
              name: saved?.name ?? customer.name,
              phone: customer.phone,
              address: saved?.line1 ?? "",
              city: saved?.city ?? "",
              state: saved?.state ?? "",
              pincode: saved?.pincode ?? "",
            }
          : null
      }
    />
  );
}
