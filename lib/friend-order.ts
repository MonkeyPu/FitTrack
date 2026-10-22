/** Friends in the order the person chose. Friends without a saved position go last, A to Z by name. */
export function sortByOrder<T>(items: T[], idOf: (x: T) => string, nameOf: (x: T) => string, order: { friend_id: string; position: number }[] | undefined): T[] {
  const pos = new Map((order ?? []).map((o) => [o.friend_id, o.position]));
  return [...items].sort((a, b) => (pos.get(idOf(a)) ?? Infinity) - (pos.get(idOf(b)) ?? Infinity) || nameOf(a).localeCompare(nameOf(b)));
}

/** Moves one id a step up (-1) or down (+1) in a list of ids. Stays put at either end. */
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
