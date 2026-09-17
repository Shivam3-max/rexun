"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { doSignOut } from "@/app/actions/account";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await doSignOut();
          router.push("/");
          router.refresh();
        })
      }
      className="rounded border border-line-2 px-3.5 py-2 text-[13.5px] font-bold text-ink-2 hover:border-ink hover:text-ink disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
