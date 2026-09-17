import type { Metadata } from "next";
import "./../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Rexsun Admin" },
  robots: { index: false, follow: false },
};

/**
 * A second root layout. The admin panel is its own application — it must not
 * inherit the shop's header, footer or mobile tab bar, and route groups with
 * separate roots are how that separation is expressed.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
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
      <body className="bg-page">{children}</body>
    </html>
  );
}
