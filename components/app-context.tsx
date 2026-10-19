"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { todayInTz } from "@/lib/dates";
import type { Profile } from "@/lib/types";

type Ctx = {
  userId: string;
  profile: Profile;
  tz: string;
  /** false until the browser's timezone is known (first render on the server) */
  ready: boolean;
  today: string;
  /** the date every tab is showing; stays put while you switch tabs */
  date: string;
  setDate: (d: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}

const KEY = "fx-selected-date";

export function AppProvider({ userId, profile, children }: { userId: string; profile: Profile; children: React.ReactNode }) {
  const [tz, setTz] = useState("UTC");
  const [today, setToday] = useState("");
  // null means "follow today", so leaving the app open past midnight rolls over by itself.
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setTz(zone);
    setToday(todayInTz(zone));
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) setSelected(saved);
    } catch { /* ignore */ }
    const tick = () => setToday(todayInTz(zone));
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);

  const setDate = useCallback((d: string) => {
    const follow = d === todayInTz(tz);
    setSelected(follow ? null : d);
    try { follow ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, d); } catch { /* ignore */ }
  }, [tz]);

  const value = useMemo<Ctx>(
    () => ({ userId, profile, tz, ready: today !== "", today, date: selected ?? today, setDate }),
    [userId, profile, tz, today, selected, setDate],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
