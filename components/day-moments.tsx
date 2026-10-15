"use client";
import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import { buildMoments, type Moment, type MomentInput } from "@/lib/moments";

const seenKey = (id: string) => `fx:${id}`;
const wasSeen = (id: string) => { try { return localStorage.getItem(seenKey(id)) === "1"; } catch { return false; } };
const markSeen = (id: string) => { try { localStorage.setItem(seenKey(id), "1"); } catch { /* private mode: shows once per visit */ } };

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const colors = ["#34d36c", "#f5f5f7", "#f5a623", "#6ee7a0", "#ffd166"];
    const bits = Array.from({ length: 140 }, () => ({
      x: Math.random() * w, y: -Math.random() * h * 0.6, vx: (Math.random() - 0.5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr,
      s: (6 + Math.random() * 6) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy; b.vy += 0.04 * dpr; b.r += b.vr;
        if (b.y < h + 20) alive = true;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
      }
      if (alive && t - start < 6000) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Overlay({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (moment.kind === "over") {
    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="fx-title" onClick={onDone} className="fx-fade fx-gray fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
        <div className="w-full border-y border-danger/50 bg-black py-8 text-center">
          <h2 id="fx-title" className="chud-in text-[24vw] font-black uppercase leading-none tracking-[0.06em] text-danger md:text-9xl">{moment.title}</h2>
          <p className="num mt-3 text-base text-white/70">{moment.sub}</p>
          <button autoFocus type="button" onClick={(e) => { e.stopPropagation(); onDone(); }} className="mt-6 h-12 rounded-xl border border-white/25 px-8 font-semibold text-white">Okay</button>
        </div>
      </div>
    );
  }
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="fx-title" className="fx-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6">
      <Confetti />
      <div className="relative w-full max-w-xs rounded-3xl border border-line bg-card p-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent"><PartyPopper className="h-7 w-7" /></span>
        <h2 id="fx-title" className="text-2xl font-bold tracking-tight">{moment.title}</h2>
        <p className="num mt-1 text-muted">{moment.sub}</p>
        <button autoFocus type="button" onClick={onDone} className="mt-5 h-12 w-full rounded-xl bg-accent font-semibold text-accentfg">Nice</button>
      </div>
    </div>
  );
}

export function DayMoments({ input, enabled }: { input: Omit<MomentInput, "hour">; enabled: boolean }) {
  const [queue, setQueue] = useState<Moment[]>([]);
  const key = JSON.stringify(input);

  useEffect(() => {
    if (!enabled) return;
    const fresh = buildMoments({ ...input, hour: new Date().getHours() }).filter((m) => !wasSeen(m.id));
    setQueue(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const current = queue[0];
  useEffect(() => { if (current) markSeen(current.id); }, [current]);
  if (!enabled || !current) return null;
  return <Overlay key={current.id} moment={current} onDone={() => setQueue((q) => q.slice(1))} />;
}
