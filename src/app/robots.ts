import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind a session, and nothing personal, belongs in an index.
      disallow: ["/admin", "/account", "/cart", "/checkout", "/order/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
