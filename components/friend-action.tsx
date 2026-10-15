"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ButtonProps } from "@/components/ui/button";
import type { State } from "@/lib/action-helpers";

/** A one-button form for a friends action, with inline error / success text. */
export function FriendAction({ action, fields, label, variant, size = "sm", confirmText, className }: {
  action: (s: State, fd: FormData) => Promise<State>;
  fields: Record<string, string>;
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirmText?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }} className={className}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size}>{label}</SubmitButton>
      {state.error && <p role="alert" className="mt-1 text-xs text-danger">{state.error}</p>}
      {state.message && !state.error && <p role="status" className="mt-1 text-xs text-accent">{state.message}</p>}
    </form>
  );
}
