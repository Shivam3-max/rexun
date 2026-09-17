import { HelpPage } from "@/components/HelpPage";

export const metadata = { title: "Delivery & shipping" };

export default function Page() {
  return (
    <HelpPage
      title="Delivery & shipping"
      intro="Delivery is free on orders over ₹999. Below that it is a flat ₹79, shown in the cart before you pay — never added at the last step."
      sections={[
        {
          h: "How long it takes",
          p: [
            "Tricity — Chandigarh, Mohali, Panchkula and Zirakpur — is 2 working days. The rest of North India is about 4 days, and the rest of India about 6.",
            "Enter your pincode on any product page and we will show the actual date before you add anything to the cart.",
          ],
        },
        {
          h: "Large items",
          p: [
            "Geysers, air coolers and pedestal fans travel by surface courier and can take a day or two longer than the estimate in peak season. We will tell you if that happens rather than letting the date slip quietly.",
          ],
        },
        {
          h: "Installation",
          p: [
            "Ceiling fans, geysers and exhaust fans need an electrician. We do not include installation in the price. If you want us to arrange it in Tricity, say so when you order and we will quote before anyone visits.",
          ],
        },
        {
          h: "Cash on delivery",
          p: [
            "Available across North India on orders up to ₹15,000. Outside that, orders are prepaid — UPI, card or net banking.",
          ],
        },
      ]}
      footnote="Delivery timelines are working days and exclude Sundays and public holidays."
    />
  );
}
