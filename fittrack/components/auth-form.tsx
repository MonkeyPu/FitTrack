"use client";
import { useActionState } from "react";
import Link from "next/link";
import { changePassword, requestPasswordReset, signIn, signUp } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

const modes = {
  login: { action: signIn, title: "Welcome back", cta: "Log in" },
  signup: { action: signUp, title: "Create your account", cta: "Sign up" },
  forgot: { action: requestPasswordReset, title: "Reset your password", cta: "Send reset link" },
  reset: { action: changePassword, title: "Choose a new password", cta: "Update password" },
} as const;

export function AuthForm({ mode, notice }: { mode: keyof typeof modes; notice?: string }) {
  const m = modes[mode];
  const [state, action] = useActionState(m.action, {});
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">{m.title}</h1>
      <p className="mb-6 text-muted">{mode === "signup" ? "Track food, protein and cardio with your friends." : "FitTrack"}</p>
      {notice && <p className="mb-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{notice}</p>}
      <form action={action} className="space-y-4">
        {mode !== "reset" && <Field label="Email"><Input name="email" type="email" autoComplete="email" inputMode="email" required /></Field>}
        {mode !== "forgot" && (
          <Field label={mode === "reset" ? "New password" : "Password"} hint={mode !== "login" ? "At least 8 characters" : undefined}>
            <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          </Field>
        )}
        {mode === "reset" && <Field label="Confirm new password"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>}
        <FormMessage state={state} />
        <SubmitButton className="w-full">{m.cta}</SubmitButton>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm text-muted">
        {mode === "login" && (<>
          <p><Link href="/forgot-password" className="text-accent">Forgot your password?</Link></p>
          <p>New here? <Link href="/signup" className="text-accent">Create an account</Link></p>
        </>)}
        {mode === "signup" && <p>Already have an account? <Link href="/login" className="text-accent">Log in</Link></p>}
        {mode === "forgot" && <p><Link href="/login" className="text-accent">Back to log in</Link></p>}
        {mode === "reset" && state.ok && <p><Link href="/" className="text-accent">Continue to the app</Link></p>}
      </div>
    </div>
  );
}
