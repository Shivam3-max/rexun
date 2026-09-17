"use client";

import { useRef, useState } from "react";

/**
 * Upload or paste a path. Both matter: new artwork gets uploaded, while the
 * catalogue's existing images are already on disk and only need their path
 * typed in.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-11 w-11 shrink-0 rounded border border-line bg-white object-contain p-0.5" />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/banner.jpg"
          className="w-full rounded border border-line-2 px-3 py-2 text-[13.5px] outline-none focus:border-rex-red"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="shrink-0 rounded border border-ink px-3 py-2 text-[12.5px] font-bold text-ink hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded border border-line-2 px-2.5 py-2 text-[12.5px] font-bold text-ink-3 hover:border-rex-red hover:text-rex-red"
          >
            ×
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      {error ? (
        <p className="mt-1 text-[12px] font-semibold text-rex-red">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
