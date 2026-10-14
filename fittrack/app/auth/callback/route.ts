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
  }
  return NextResponse.redirect(new URL("/login?error=link", site));
}
