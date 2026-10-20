"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { setAppearanceCookies } from "@/lib/appearance";
import type { State } from "@/lib/action-helpers";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters");

export async function signUp(_: State, fd: FormData): Promise<State> {
  const p = z.object({ email, password }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { emailRedirectTo: `${await getSiteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  if (data.session) return { ok: true, redirectTo: "/onboarding" };
  return { ok: true, message: "Check your email to confirm your account, then log in." };
}

export async function signIn(_: State, fd: FormData): Promise<State> {
  const p = z.object({ email, password: z.string().min(1, "Enter your password") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) return { error: "Incorrect email or password." };
  // Bring this device's theme and accent color in line with the saved ones.
  const { data: prof } = await supabase.from("profiles").select("preferences").maybeSingle();
  await setAppearanceCookies(prof?.preferences);
  // The page does a full load of "/" (see AuthForm), the same as pressing refresh.
  return { ok: true, redirectTo: "/" };
}

export async function requestPasswordReset(_: State, fd: FormData): Promise<State> {
  const p = z.object({ email }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(p.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function changePassword(_: State, fd: FormData): Promise<State> {
  const p = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: p.data.password });
  if (error) return { error: error.message };
  return { ok: true, message: "Password updated." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
