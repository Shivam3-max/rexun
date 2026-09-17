import type { Metadata } from "next";
import "../globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Footer } from "@/components/Footer";
import { getTaxonomy, getAnnouncement, getStoreSettings } from "@/lib/store";
import { getCustomer } from "@/lib/auth";
import { OrganizationSchema } from "@/components/StructuredData";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rexsun — Fans, Lights & Home Appliances Online",
    template: "%s | Rexsun",
  },
  description:
    "Buy ceiling fans, LED lights, geysers, mixer grinders and home appliances online. Rexsun own brand plus Polycab, Surya, Halonix and Indo. Free delivery over ₹999.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [taxonomy, announcement, store, customer] = await Promise.all([
    getTaxonomy(),
    getAnnouncement(),
    getStoreSettings(),
    getCustomer(),
  ]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <OrganizationSchema store={store} />
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink"
          >
            Skip to content
          </a>
          <Header
            departments={taxonomy.departments}
            announcement={announcement}
            customerName={customer?.name ?? null}
          />
          <main id="main" className="pb-14 md:pb-0">
            {children}
          </main>
          <Footer departments={taxonomy.departments} brands={taxonomy.brands} store={store} />
          <MobileTabBar />
        </CartProvider>
      </body>
    </html>
  );
}
