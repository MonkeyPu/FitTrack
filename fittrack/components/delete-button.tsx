"use client";
import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

/** Trash icon inside a <form action={deleteX}> with a hidden id field. Asks before deleting. */
export function DeleteButton({ label = "Delete", confirmText = "Delete this entry?" }: { label?: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      onClick={(e) => { if (!confirm(confirmText)) e.preventDefault(); }}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition hover:text-danger disabled:opacity-40"
    >
      <Trash2 className="h-[18px] w-[18px]" />
    </button>
  );
}
