"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Remembers the browser's timezone so the server can work out "today" correctly. */
export function TzCookie() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cur = document.cookie.split("; ").find((c) => c.startsWith("tz="));
    if (!cur || decodeURIComponent(cur.slice(3)) !== tz) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);
  return null;
}
