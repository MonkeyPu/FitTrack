import { BottomNav } from "@/components/bottom-nav";
import { TzCookie } from "@/components/tz-cookie";
import { requireProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Sends people who haven't finished onboarding to /onboarding. The layout stays loaded while
  // moving between tabs, so this runs once per visit rather than on every tap.
  const { supabase, user } = await requireProfile();
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("status", "pending");
  return (
    <>
      <TzCookie />
      <main className="mx-auto min-h-dvh max-w-md space-y-5 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] md:max-w-2xl">
        {children}
      </main>
      <BottomNav pendingRequests={count ?? 0} />
    </>
  );
}
