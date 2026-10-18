import "server-only";
import { cookies } from "next/headers";
import { isHex6 } from "@/lib/accent";

/** Theme and accent live in cookies so the very first paint already has the right colors. */
export async function setAppearanceCookies(prefs: { theme?: string; accent?: string } | null | undefined) {
  const store = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  store.set("theme", prefs?.theme === "light" ? "light" : "dark", opts);
  if (prefs?.accent && isHex6(prefs.accent)) store.set("accent", prefs.accent.toLowerCase(), opts);
  else store.delete("accent");
}
