"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppProvider, useApp } from "@/components/app-context";
import { AppIconSync } from "@/components/app-icon-sync";
import { BottomNav } from "@/components/bottom-nav";
import { DateBar } from "@/components/date-bar";
import { ToastProvider } from "@/components/toast";
import { TzCookie } from "@/components/tz-cookie";
import { fetchDay } from "@/lib/client/api";
import { useFriendships, useSupabase } from "@/lib/client/hooks";
import { qk } from "@/lib/client/keys";
import { createIdbPersister } from "@/lib/client/persist";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const WEEK = 1000 * 60 * 60 * 24 * 7;
const DATE_TABS = ["/", "/diary", "/add", "/friends"];

/** Loads the days next to the one you're viewing, so stepping through dates is instant. */
function PrefetchDays() {
  const qc = useQueryClient();
  const sb = useSupabase();
  const { userId, date, today, ready } = useApp();
  useEffect(() => {
    if (!ready) return;
    for (const d of new Set([date, addDays(date, -1), addDays(date, 1), today, addDays(today, -1)])) {
      qc.prefetchQuery({ queryKey: qk.day(d), queryFn: () => fetchDay(sb, userId, d), staleTime: 60_000 });
    }
  }, [qc, sb, userId, date, today, ready]);
  return null;
}

function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const showDate = DATE_TABS.includes(path);
  const requests = (useFriendships().data ?? []).filter((r) => r.status === "pending" && r.incoming).length;
  return (
    <>
      <TzCookie />
      <AppIconSync />
      <PrefetchDays />
      {showDate && (
        <header className="sticky top-0 z-30 border-b border-line/50 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto max-w-md px-4 py-2 md:max-w-2xl"><DateBar /></div>
        </header>
      )}
      <main className={cn("mx-auto min-h-[60dvh] max-w-md space-y-5 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:max-w-2xl", showDate ? "pt-4" : "pt-[calc(1rem+env(safe-area-inset-top))]")}>
        {children}
      </main>
      <BottomNav pendingRequests={requests} />
    </>
  );
}

export function AppShell({ userId, profile, children }: { userId: string; profile: Profile; children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 20_000, gcTime: WEEK, retry: 1, networkMode: "offlineFirst", refetchOnWindowFocus: true },
        mutations: { networkMode: "always" },
      },
    }),
  );
  const persister = useMemo(() => createIdbPersister(userId), [userId]);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister, maxAge: WEEK, buster: "v1",
        // Only your own data is saved on the device. Friends' data and one-off lookups are not.
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && !String(q.queryKey[0]).startsWith("friend") && q.queryKey[0] !== "log" },
      }}
    >
      <AppProvider userId={userId} profile={profile}>
        <ToastProvider><Chrome>{children}</Chrome></ToastProvider>
      </AppProvider>
    </PersistQueryClientProvider>
  );
}
