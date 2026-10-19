export const qk = {
  day: (date: string) => ["day", date] as const,
  history: (from: string, to: string) => ["history", from, to] as const,
  goalTotals: (from: string, to: string) => ["goal-totals", from, to] as const,
  foods: ["foods"] as const,
  meals: ["meals"] as const,
  log: (kind: string, id: string) => ["log", kind, id] as const,
  // Everything about friends starts with "friend" so it is never saved to the device.
  friendCards: (date: string) => ["friend-cards", date] as const,
  friendships: ["friendships"] as const,
  friendPerms: ["friend-perms"] as const,
  friendHistory: (id: string, from: string, to: string) => ["friend-history", id, from, to] as const,
  friendSearch: (q: string) => ["friend-search", q] as const,
};
