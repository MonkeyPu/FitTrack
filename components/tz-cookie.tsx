"use client";
import { useEffect } from "react";

/** Remembers the browser's timezone for the few server actions that need to know today's date. */
export function TzCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cur = document.cookie.split("; ").find((c) => c.startsWith("tz="));
    if (!cur || decodeURIComponent(cur.slice(3)) !== tz) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);
  return null;
}
