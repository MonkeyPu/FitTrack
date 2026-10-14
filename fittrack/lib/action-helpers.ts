import type { ZodError } from "zod";

export type State = { error?: string; ok?: boolean; message?: string };

export const firstError = (e: ZodError) => e.issues[0]?.message ?? "Check your entries and try again.";

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown, fallback: string): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
