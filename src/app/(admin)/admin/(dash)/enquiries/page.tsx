import { db } from "@/lib/db";
import { PageHead, Empty } from "@/components/admin/ui";
import { EnquiryList } from "./EnquiryList";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const enquiries = await db.enquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });

  return (
    <>
      <PageHead
        title="Enquiries"
        sub={`${enquiries.filter((e) => e.status === "NEW").length} new · messages sent from the contact page`}
      />
      {enquiries.length === 0 ? (
        <Empty
          title="No enquiries yet"
          body="Anything sent through the contact form on the shop arrives here, with the customer's number ready to call back."
        />
      ) : (
        <EnquiryList
          enquiries={enquiries.map((e) => ({
            id: e.id, name: e.name, phone: e.phone, email: e.email,
            subject: e.subject, message: e.message, status: e.status,
            reply: e.reply ?? "", createdAt: e.createdAt.toISOString(),
          }))}
        />
      )}
      <div className="h-10" />
    </>
  );
}
