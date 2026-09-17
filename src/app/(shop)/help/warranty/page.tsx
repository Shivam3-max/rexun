import { HelpPage } from "@/components/HelpPage";

export const metadata = { title: "Warranty & service" };

export default function Page() {
  return (
    <HelpPage
      title="Warranty & service"
      intro="Every product on this site carries the full manufacturer warranty, registered against your order. You call us, not a helpline — we raise the claim and follow it."
      sections={[
        {
          h: "How long you are covered",
          p: [
            "Warranty runs from the date of delivery, not the date of manufacture. The period is printed on every product page: most ceiling fans carry 2 to 3 years, LED lighting 2 years, and appliances 1 to 2 years.",
            "Rexsun kitchen appliances carry 1 year and the Rexsun water heater carries 2 years.",
          ],
        },
        {
          h: "Making a claim",
          p: [
            "Send us the order number and a short description of the fault. We register the claim with the brand's service network the same working day and give you the ticket number.",
            "Keep the invoice — it downloads from your order confirmation — and the box if the product is still within the first month.",
          ],
        },
        {
          h: "Why buying from an authorised dealer matters",
          p: [
            "We are an authorised dealer for Polycab, Surya, Halonix and Indo. That means the serial number of the product you receive is in the brand's own system, so a service centre anywhere in India will honour it. Grey-market stock at a lower price usually is not.",
          ],
        },
        {
          h: "Rexsun products",
          p: [
            "Rexsun is our own brand, so there is no third party in the middle. One call, our own service team, and a replacement rather than a repair if the fault is in the first 30 days.",
          ],
        },
      ]}
    />
  );
}
