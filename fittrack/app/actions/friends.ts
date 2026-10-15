"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data";
import type { State } from "@/lib/action-helpers";
import { idOnly } from "@/lib/validation";

const FAILED = "Something went wrong. Try again.";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const refresh = () => revalidatePath("/", "layout");

export async function sendFriendRequest(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: FAILED };
  const other = p.data.id; // validated as a uuid, so safe to use in the filter below
  if (other === user.id) return { error: "You can't add yourself." };

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requester_id, recipient_id, updated_at")
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${other}),and(requester_id.eq.${other},recipient_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return { ok: true, message: "You're already friends." };
    if (existing.status === "pending") {
      if (existing.recipient_id === user.id) {
        // They already asked you, so adding them back accepts it.
        const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", existing.id).eq("recipient_id", user.id);
        if (error) return { error: FAILED };
        refresh();
        return { ok: true, message: "You're now friends." };
      }
      return { ok: true, message: "Request already sent." };
    }
    // A declined request can be replaced, but not right away if they declined you.
    if (existing.requester_id === user.id && Date.now() - Date.parse(existing.updated_at) < COOLDOWN_MS) {
      return { error: "You can't send this person a request right now." };
    }
    await supabase.from("friendships").delete().eq("id", existing.id);
  }

  const { error } = await supabase.from("friendships").insert({ requester_id: user.id, recipient_id: other });
  if (error) {
    if (error.message.includes("Too many")) return { error: "You've sent a lot of requests. Try again later." };
    if (error.code === "23503") return { error: "That person doesn't exist." };
    return { error: FAILED };
  }
  refresh();
  return { ok: true, message: "Request sent." };
}

export async function respondToRequest(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = z.object({ id: z.string().uuid(), decision: z.enum(["accept", "reject"]) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: FAILED };
  // Only the person the request was sent to can answer it (also enforced by RLS).
  const { data, error } = await supabase
    .from("friendships")
    .update({ status: p.data.decision === "accept" ? "accepted" : "rejected" })
    .eq("id", p.data.id)
    .eq("recipient_id", user.id)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: FAILED };
  if (!data?.length) return { error: "That request is no longer available." };
  refresh();
  return { ok: true, message: p.data.decision === "accept" ? "You're now friends." : "Request declined." };
}

/** Remove a friend, or cancel a request you sent. */
export async function removeFriendship(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: FAILED };
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", p.data.id)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  if (error) return { error: FAILED };
  refresh();
  if (fd.get("redirect") === "1") redirect("/friends");
  return { ok: true, message: "Removed." };
}
