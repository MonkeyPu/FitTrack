import type { Status } from "@/lib/calc";

const CIRC = 2 * Math.PI * 34;
const arcColor: Record<Status, string> = { none: "var(--fg)", ok: "var(--fg)", near: "var(--warn)", over: "var(--danger)" };

/**
 * The app mark: a ring with a progress arc. Uses the current accent color.
 * Give it `progress` (0 to 1) and `status` and the arc shows today's calories, turning amber near
 * your maximum and red over it. Without them it shows the default 72% arc.
 */
export function Logo({ className, progress, status = "ok" }: { className?: string; progress?: number; status?: Status }) {
  const p = typeof progress === "number" && Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0.72;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="34" fill="none" strokeWidth="9" stroke="rgb(var(--accent))" />
      <circle
        cx="50" cy="50" r="34" fill="none" strokeWidth="9" strokeLinecap="round" stroke={`rgb(${arcColor[status]})`}
        strokeDasharray={`${CIRC * p} ${CIRC}`} transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.7s ease, stroke 0.4s ease" }}
      />
    </svg>
  );
}
