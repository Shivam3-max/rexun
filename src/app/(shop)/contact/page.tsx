import { getStoreSettings } from "@/lib/store";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contact us" };

export default async function ContactPage() {
  const store = await getStoreSettings();

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="text-[28px] font-bold text-ink sm:text-[34px]">Contact us</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-ink-2">
        A real person answers, in working hours, in Hindi or English. Have your order number
        ready if it is about an order.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <ContactForm />

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-card p-4">
            <h2 className="text-[15px] font-bold text-ink">Reach us directly</h2>
            <dl className="mt-3 space-y-2.5 text-[14px]">
              {store.phone && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">Phone</dt>
                  <dd><a href={`tel:${store.phone}`} className="font-semibold text-ink hover:text-rex-red">{store.phone}</a></dd>
                </div>
              )}
              {store.whatsapp && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">WhatsApp</dt>
                  <dd>
                    <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="font-semibold text-ink hover:text-rex-red">{store.whatsapp}</a>
                  </dd>
                </div>
              )}
              {store.email && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">Email</dt>
                  <dd><a href={`mailto:${store.email}`} className="font-semibold text-ink hover:text-rex-red">{store.email}</a></dd>
                </div>
              )}
              {store.hours && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">Hours</dt>
                  <dd className="text-ink-2">{store.hours}</dd>
                </div>
              )}
              {store.address && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">Address</dt>
                  <dd className="text-ink-2">{store.address}</dd>
                </div>
              )}
              {store.gstin && (
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-3">GSTIN</dt>
                  <dd className="text-ink-2 tnum">{store.gstin}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-card border border-line bg-card p-4">
            <h2 className="text-[15px] font-bold text-ink">Faster than writing in</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              Delivery dates, return rules and warranty steps are answered in full on their own
              pages — most questions are settled there in under a minute.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
