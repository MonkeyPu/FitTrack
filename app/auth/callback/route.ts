import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { safeNext } from "@/lib/action-helpers";

export async function GET(request: NextRequest) {
  const site = await getSiteUrl();
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"), "/");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, site));
    // After a sign-up the email is already confirmed by the time this address opens. If it was opened in a
    // different browser than the one that signed up (the home screen app and Safari don't share anything),
    // the code can't be exchanged here, so just tell the person to go back to the app and log in.
    if (next === "/auth/confirmed") return NextResponse.redirect(new URL("/auth/confirmed", site));
  }
  return NextResponse.redirect(new URL("/login?error=link", site));
}
