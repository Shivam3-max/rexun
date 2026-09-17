import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

/**
 * Admin image upload. Files land in public/uploads and are served straight
 * from there — the same place the catalogue images live, so nothing in the
 * storefront has to know whether a picture was scraped or uploaded.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG, WebP, AVIF or SVG image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be under 5 MB" }, { status: 400 });

  const safe = (file.name || "image")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "image";
  const filename = `${safe}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    // Serverless hosts give you a read-only filesystem, so this is the one
    // place the admin panel needs object storage before it can go live.
    const readOnly = (e as NodeJS.ErrnoException)?.code === "EROFS";
    return NextResponse.json(
      {
        error: readOnly
          ? "This server cannot store uploads. Connect a file store (Vercel Blob or S3) to upload images here — meanwhile you can paste the path of an image already in the site."
          : "Could not save that image. Try again.",
      },
      { status: readOnly ? 501 : 500 }
    );
  }

  const url = `/uploads/${filename}`;
  await db.media.create({ data: { url, filename, mime: file.type, size: file.size } });

  return NextResponse.json({ url });
}
