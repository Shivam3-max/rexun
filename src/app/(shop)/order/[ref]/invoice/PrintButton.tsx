"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-ink px-4 py-2 text-[13.5px] font-bold text-white hover:bg-black"
    >
      Print or save as PDF
    </button>
  );
}
