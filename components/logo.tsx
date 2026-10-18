/** The app mark: a ring with a progress arc. Uses the current accent color. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="34" fill="none" strokeWidth="9" stroke="rgb(var(--accent))" />
      <circle cx="50" cy="50" r="34" fill="none" strokeWidth="9" strokeLinecap="round" stroke="rgb(var(--fg))" strokeDasharray="154 214" transform="rotate(-90 50 50)" />
    </svg>
  );
}
