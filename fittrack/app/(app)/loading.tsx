/** Shown instantly while a tab loads, so taps never feel frozen. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-5">
      <div className="h-11 rounded-xl bg-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-52 rounded-2xl bg-card" />
        <div className="h-52 rounded-2xl bg-card" />
      </div>
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-56 rounded-2xl bg-card" />
    </div>
  );
}
