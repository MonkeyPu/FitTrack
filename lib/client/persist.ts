import { del, get, keys, set } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const PREFIX = "fittrack-cache:";

/** The cache is only a fast copy of your data. The database stays the source of truth. */
export const createIdbPersister = (userId: string): Persister => ({
  persistClient: (client) => set(PREFIX + userId, client),
  restoreClient: () => get<PersistedClient>(PREFIX + userId),
  removeClient: () => del(PREFIX + userId),
});

/** Removes every saved copy on this device (used on log out and on the login screen). */
export async function clearAllPersisted() {
  try {
    const all = await keys();
    await Promise.all(all.filter((k) => String(k).startsWith(PREFIX)).map((k) => del(k)));
  } catch {
    /* storage unavailable */
  }
}
