"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resendNotification } from "../../actions";

export function ResendButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resendNotification(id);
          setNote(res.ok ? "sent" : res.error);
          router.refresh();
          setTimeout(() => setNote(""), 3000);
        })
      }
      className="text-[12.5px] font-bold text-rex-red hover:underline disabled:opacity-50"
    >
      {pending ? "Sending…" : note || "Try again"}
    </button>
  );
}
