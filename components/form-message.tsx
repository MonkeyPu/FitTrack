import type { State } from "@/lib/action-helpers";

export function FormMessage({ state }: { state: State }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{state.message}</p>;
  return null;
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div role="note" className="space-y-1 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
      {items.map((w) => <p key={w}>{w}</p>)}
    </div>
  );
}
