import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3700";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind a session, and nothing personal, belongs in an index.
      disallow: ["/admin", "/account", "/cart", "/checkout", "/order/", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
