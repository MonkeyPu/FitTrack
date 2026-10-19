import { cn } from "@/lib/utils";
import { netBar, NET_BAR_FLOOR, type Status } from "@/lib/calc";

const stroke: Record<Status, string> = { none: "stroke-line", ok: "stroke-accent", near: "stroke-warn", over: "stroke-danger" };
const fill: Record<Status, string> = { none: "bg-line", ok: "bg-accent", near: "bg-warn", over: "bg-danger" };
const text: Record<Status, string> = { none: "text-fg", ok: "text-fg", near: "text-warn", over: "text-danger" };
export const statusText = text;

export function ProgressRing({ pct, status, size = 140, thickness = 12, children }: { pct: number | null; status: Status; size?: number; thickness?: number; children: React.ReactNode }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const shown = Math.min(Math.max(pct ?? 0, 0), 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-card2" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          className={cn("transition-[stroke-dashoffset] duration-500", stroke[status])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ pct, status, label }: { pct: number | null; status: Status; label: string }) {
  const shown = Math.min(Math.max(pct ?? 0, 0), 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shown)} className="h-2.5 overflow-hidden rounded-full bg-card2">
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill[status])} style={{ width: `${shown}%` }} />
    </div>
  );
}

/**
 * Net calories against the net target. Zero sits a little in from the left edge, so there is room
 * to show days when logged exercise is larger than food (net below zero, down to -500).
 */
export function NetBar({ net, target, status, label }: { net: number; target: number | null; status: Status; label: string }) {
  const b = netBar(net, target);
  const color = b.below ? "bg-accent" : fill[status];
  return (
    <div>
      <div
        role="progressbar" aria-label={label} aria-valuemin={-NET_BAR_FLOOR} aria-valuemax={target ?? 0}
        aria-valuenow={Math.round(Math.max(net, -NET_BAR_FLOOR))}
        className="relative h-3 overflow-hidden rounded-full bg-card2"
      >
        <div className={cn("absolute inset-y-0 transition-[left,width] duration-500", color)} style={{ left: `${b.left}%`, width: `${b.width}%` }} />
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg/70" style={{ left: `${b.zero}%` }} />
      </div>
      <div className="num relative mt-1 h-4 text-[11px] text-muted" aria-hidden>
        <span className="absolute left-0">&minus;{NET_BAR_FLOOR}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${b.zero}%` }}>0</span>
        {target !== null && <span className="absolute right-0">{target.toLocaleString("en-US")}</span>}
      </div>
    </div>
  );
}
