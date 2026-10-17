import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = { id: string; email: string | undefined };

/**
 * Who is signed in, without a network round trip when possible.
 * getClaims() checks the session token's signature locally (and refreshes it when expired);
 * getUser() asks Supabase Auth every time. We only fall back to it if claims aren't available.
 * Data access is still protected by Row Level Security either way.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!error && claims?.sub) return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };

  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}
