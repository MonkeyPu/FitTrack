/** Placeholder shown only when there is nothing cached to show yet. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-5">
      <div className="grid grid-cols-2 gap-3"><div className="h-52 rounded-2xl bg-card" /><div className="h-52 rounded-2xl bg-card" /></div>
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
    </div>
  );
}
