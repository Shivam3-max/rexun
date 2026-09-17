import { HelpPage } from "@/components/HelpPage";

export const metadata = { title: "Returns & replacement" };

export default function Page() {
  return (
    <HelpPage
      title="Returns & replacement"
      intro="If something arrives damaged or is not what you ordered, we replace it. Tell us within 7 days of delivery and we arrange the pickup — you do not courier anything yourself."
      sections={[
        {
          h: "What we replace",
          p: [
            "Transit damage, a wrong item, a missing part from the box, or a product that does not switch on out of the box.",
            "Photograph the box and the product before you use it if anything looks wrong. It makes the claim immediate rather than a conversation.",
          ],
        },
        {
          h: "What we cannot take back",
          p: [
            "Anything installed, wired in or drilled to a wall — a fitted ceiling fan or geyser cannot be returned, though it is fully covered by warranty from that point.",
            "Bulbs, battens and electrical accessories that have been used, unless they are faulty.",
          ],
        },
        {
          h: "Changed your mind",
          p: [
            "Unopened and unused, in the original packaging, within 7 days: we take it back and refund the item value. The delivery charge is not refunded, and reverse pickup outside Tricity costs ₹149.",
          ],
        },
        {
          h: "Refunds",
          p: [
            "Prepaid orders are refunded to the same account within 5 working days of the item reaching us. Cash-on-delivery orders are refunded by bank transfer to an account you nominate.",
          ],
        },
      ]}
      footnote="A faulty product after 7 days is a warranty claim, not a return — and we handle those ourselves."
    />
  );
}
