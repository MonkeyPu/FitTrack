"use client";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/components/app-context";
import { createClient } from "@/lib/supabase/client";
import { fetchDay, fetchFoods, fetchGoalTotals, fetchFriendCards, fetchFriendHistory, fetchFriendOrder, fetchFriendPerms, fetchFriendships, fetchHistory, fetchLog, searchProfiles, type DayData } from "@/lib/client/api";
import { qk } from "@/lib/client/keys";

export const useSupabase = () => useMemo(() => createClient(), []);

export function useDay(date: string, enabled = true) {
  const sb = useSupabase();
  const { userId, ready } = useApp();
  return useQuery({ queryKey: qk.day(date), queryFn: () => fetchDay(sb, userId, date), enabled: enabled && ready && !!date });
}

export function useFoods() {
  const sb = useSupabase();
  const { userId } = useApp();
  return useQuery({ queryKey: qk.foods, queryFn: () => fetchFoods(sb, userId), staleTime: 60_000 });
}

export function useHistory(from: string, to: string) {
  const sb = useSupabase();
  const { userId, ready } = useApp();
  return useQuery({ queryKey: qk.history(from, to), queryFn: () => fetchHistory(sb, userId, from, to), enabled: ready && !!to });
}

/** Daily totals from the goal start up to `to`. Off when there is no goal start or the range is empty. */
export function useGoalTotals(from: string | null | undefined, to: string) {
  const sb = useSupabase();
  const { ready } = useApp();
  const on = ready && !!from && !!to && from <= to;
  return useQuery({ queryKey: qk.goalTotals(from ?? "", to), queryFn: () => fetchGoalTotals(sb, from!, to), enabled: on, staleTime: 60_000 });
}

export function useFriendCards(date: string) {
  const sb = useSupabase();
  const { ready } = useApp();
  return useQuery({ queryKey: qk.friendCards(date), queryFn: () => fetchFriendCards(sb, date), enabled: ready && !!date, staleTime: 15_000 });
}

export function useFriendships() {
  const sb = useSupabase();
  return useQuery({ queryKey: qk.friendships, queryFn: () => fetchFriendships(sb), staleTime: 15_000, refetchInterval: 60_000 });
}

export function useFriendPerms() {
  const sb = useSupabase();
  return useQuery({ queryKey: qk.friendPerms, queryFn: () => fetchFriendPerms(sb), staleTime: 15_000 });
}

export function useFriendOrder() {
  const sb = useSupabase();
  return useQuery({ queryKey: qk.friendOrder, queryFn: () => fetchFriendOrder(sb), staleTime: 60_000 });
}

export function useFriendHistory(id: string, from: string, to: string, enabled: boolean) {
  const sb = useSupabase();
  return useQuery({ queryKey: qk.friendHistory(id, from, to), queryFn: () => fetchFriendHistory(sb, id, from, to), enabled: enabled && !!to });
}

export function useFriendSearch(q: string) {
  const sb = useSupabase();
  return useQuery({ queryKey: qk.friendSearch(q), queryFn: () => searchProfiles(sb, q), enabled: q.length >= 2, staleTime: 10_000 });
}

/** One log entry for the edit screens. Starts from the cached day when the entry is already there. */
export function useLog(kind: "food" | "meal" | "activity", id: string) {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.log(kind, id),
    queryFn: () => fetchLog(sb, kind, id),
    initialData: () => {
      const days = qc.getQueriesData<DayData>({ queryKey: ["day"] });
      for (const [, d] of days) {
        const list = kind === "food" ? d?.foods : kind === "meal" ? d?.meals : d?.activities;
        const hit = (list as { id: string }[] | undefined)?.find((x) => x.id === id);
        if (hit) return hit as never;
      }
      return undefined;
    },
    staleTime: 0,
  });
}
