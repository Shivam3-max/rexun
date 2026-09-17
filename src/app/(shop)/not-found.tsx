import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
      <h1 className="text-[28px] font-bold text-ink">We could not find that page</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        The link may be old, or the product may have been replaced by a newer model.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark">
          Go to the home page
        </Link>
        <Link href="/categories" className="rounded border border-ink px-4 py-2.5 text-[14px] font-bold text-ink hover:bg-ink hover:text-white">
          Browse all categories
        </Link>
      </div>
    </div>
  );
}
