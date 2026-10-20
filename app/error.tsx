"use client";
import { useEffect, useState } from "react";

const KEY = "fx-last-auto-reload";

/** Shown if a page fails to load. It retries once by itself, like pressing refresh. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    console.error(error);
    try {
      const last = Number(sessionStorage.getItem(KEY) ?? 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        setRetrying(true);
        window.location.reload();
      }
    } catch { /* show the message below */ }
  }, [error]);

  if (retrying) return <div className="flex min-h-dvh items-center justify-center text-muted">Loading…</div>;
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted">The page didn&apos;t load properly. Trying again usually fixes it.</p>
      <button type="button" onClick={() => { reset(); window.location.reload(); }} className="h-12 rounded-xl bg-accent px-6 font-semibold text-accentfg">Try again</button>
    </div>
  );
}
