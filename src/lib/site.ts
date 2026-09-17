/**
 * The site's own absolute URL, for metadata, sitemap, robots and JSON-LD.
 *
 * Every one of those needs a real origin, and getting it wrong breaks the
 * build rather than degrading — `new URL("")` throws. So this resolves it
 * defensively, in order:
 *
 *   1. NEXT_PUBLIC_SITE_URL, when it is actually set to something
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL, which Vercel fills in
 *      automatically on every deployment and preview
 *   3. localhost, for development
 *
 * An env var set to an empty string is the case that broke the first Vercel
 * build: `??` passes "" through, so this checks for content, not for null.
 */

const clean = (value: string | undefined) => {
  const v = value?.trim();
  if (!v) return null;
  // Vercel's own vars come without a scheme.
  return /^https?:\/\//.test(v) ? v.replace(/\/+$/, "") : `https://${v.replace(/\/+$/, "")}`;
};

export function siteUrl(): string {
  const candidate =
    clean(process.env.NEXT_PUBLIC_SITE_URL) ??
    clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    clean(process.env.VERCEL_URL) ??
    "http://localhost:3700";

  try {
    // Proves the value parses before anything downstream depends on it.
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3700";
  }
}

export const SITE_URL = siteUrl();

/** Absolute URL for a site-relative path, for metadata and structured data. */
export const absolute = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
