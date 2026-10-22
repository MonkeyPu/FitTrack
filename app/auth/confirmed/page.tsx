import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

export const metadata = { title: "Email confirmed" };

/**
 * Where the link in the confirmation email lands. A link can't reopen an app installed on the home screen, so this
 * page tells the person to go back to the app and log in. If this browser happens to be signed in already, it also
 * offers to carry on here.
 */
export default async function Page() {
  const user = await getAuthUser(await createClient());
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10 text-center">
      <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-accent" aria-hidden />
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Email confirmed</h1>
      <p className="mb-6 text-muted">Your email is confirmed. Go back to the FitTrack app and log in with your email and password.</p>
      {user ? (
        <Link href="/onboarding" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white">Or continue in this browser</Link>
      ) : (
        <Link href="/login" className="text-sm text-accent">Or log in in this browser</Link>
      )}
    </div>
  );
}
