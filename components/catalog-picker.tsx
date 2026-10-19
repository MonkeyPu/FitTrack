"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Package, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { STORES, displayName, matchesStore, matchesWords, plainWords, scaleProduct, type CatalogProduct, type PickedFood } from "@/lib/catalog";
import { cn, fmt } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

function Thumb({ src, size = 48 }: { src: string | null; size?: number }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card2 text-muted" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && !bad ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-contain" /> : <Package className="h-5 w-5" />}
    </span>
  );
}

/** Type to see matching supermarket products (with photos) as a list; tap one to choose an amount. */
export function CatalogPicker({ onPick, onClose, initialQuery = "" }: { onPick: (p: PickedFood) => void; onClose: () => void; initialQuery?: string }) {
  const [store, setStore] = useState<string>("mercadona");
  const [only, setOnly] = useState(false);
  const [text, setText] = useState(initialQuery);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("");
  const [chosen, setChosen] = useState<CatalogProduct | null>(null);
  const [amount, setAmount] = useState("100");
  const cache = useRef(new Map<string, CatalogProduct[]>());
  const [nonce, setNonce] = useState(0);
  const instant = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Search while typing, after a short pause so every keystroke doesn't hit the catalog.
  useEffect(() => {
    const q = text.trim();
    const digits = /^\d+$/.test(q);
    if (plainWords(q).length < 3 || (digits && q.length < 12 && !instant.current)) {
      setStatus("idle");
      setError("");
      if (plainWords(q).length < 3) setItems([]);
      return;
    }
    const key = digits ? q : plainWords(q);
    const hit = cache.current.get(key);
    if (hit) { setItems(hit); setStatus("done"); setError(""); return; }

    const ctrl = new AbortController();
    setStatus("loading");
    const delay = instant.current ? 0 : 450;
    instant.current = false;
    const t = setTimeout(async () => {
      try {
        if (navigator.onLine === false) throw new Error("You're offline. Connect to search the catalog.");
        const res = await fetch(`/api/catalog/search?${new URLSearchParams({ q })}`, { signal: ctrl.signal });
        const data = await res.json().catch(() => ({}));
        setDebug(data.debug ? JSON.stringify(data.debug) : "");
        if (!res.ok) throw new Error(data.error || "Couldn't search the catalog.");
        cache.current.set(key, data.products);
        setItems(data.products);
        setStatus("done");
        setError("");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Couldn't search the catalog.");
      }
    }, delay);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text, nonce]);

  // Narrow what's already on screen straight away while the next search is on its way.
  const storeLabel = STORES.find((s) => s.id === store)?.label ?? "";
  const visible = useMemo(() => {
    const q = text.trim();
    const base = /^\d+$/.test(q) ? items : items.filter((p) => matchesWords(q, p.name, p.brand));
    const inStore = base.filter((p) => matchesStore(p, store));
    if (only) return inStore;
    return [...inStore, ...base.filter((p) => !matchesStore(p, store))];
  }, [items, text, store, only]);

  const open = (p: CatalogProduct) => { setChosen(p); setAmount(String(p.servingAmount ?? 100)); };
  const amt = Number(amount) > 0 ? Number(amount) : 0;
  const scaled = chosen ? scaleProduct(chosen, amt) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Supermarket catalog" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-card md:rounded-3xl">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          {chosen && <button type="button" aria-label="Back to results" onClick={() => setChosen(null)} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted"><ArrowLeft className="h-5 w-5" /></button>}
          <h2 className="flex-1 text-lg font-semibold">{chosen ? "Choose an amount" : "Supermarket catalog"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!chosen && (<>
            <form onSubmit={(e) => { e.preventDefault(); instant.current = true; setNonce((n) => n + 1); }} className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Start typing, e.g. yogur natural" className="pl-10" aria-label="Search the catalog" autoFocus enterKeyHint="search" />
            </form>
            <div role="radiogroup" aria-label="Store" className="flex flex-wrap gap-2">
              {STORES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={store === s.id} onClick={() => setStore(s.id)}
                  className={cn("h-9 rounded-full border px-3 text-sm font-medium transition", store === s.id ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted")}>{s.label}</button>
              ))}
            </div>
            <label className="flex min-h-9 items-center gap-3 text-sm">
              <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
              <span>Only show {storeLabel} products</span>
            </label>

            {status === "idle" && visible.length === 0 && <p className="px-1 text-sm text-muted">Type at least 3 letters and matching products appear. {storeLabel} products are listed first. You can also paste a barcode.</p>}
            {status === "loading" && visible.length === 0 && <p className="px-1 text-sm text-muted">Searching…</p>}
            {status === "error" && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            {status === "done" && visible.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
                No matching products. Try other words{only ? " or turn off the store filter" : ""}.
                {debug && <details className="mt-2 text-left text-xs"><summary className="cursor-pointer">Details</summary><p className="mt-1 break-all">{debug}</p></details>}
              </div>
            )}

            {visible.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line" aria-busy={status === "loading"}>
                {visible.map((p) => (
                  <li key={p.code} className="border-b border-line last:border-0">
                    <button type="button" disabled={!p.hasNutrition} onClick={() => open(p)} className="flex min-h-16 w-full items-center gap-3 bg-card px-3 py-2 text-left disabled:opacity-50">
                      <Thumb src={p.image} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {[p.brand, p.quantity].filter(Boolean).join(" · ") || p.code}
                          {matchesStore(p, store) && <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">{storeLabel}</span>}
                        </span>
                      </span>
                      <span className="num shrink-0 text-right text-xs text-muted">{p.hasNutrition ? <>{fmt(p.per100.calories)} kcal<br />{fmt(p.per100.protein, 1)} g protein<br />per 100 {p.unit}</> : "No nutrition data"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {status === "loading" && visible.length > 0 && <p className="px-1 text-center text-xs text-muted">Updating…</p>}
          </>)}

          {chosen && scaled && (<>
            <div className="flex items-center gap-3">
              <Thumb src={chosen.image} size={64} />
              <div className="min-w-0"><p className="text-base font-semibold">{chosen.name}</p><p className="text-sm text-muted">{[chosen.brand, chosen.quantity].filter(Boolean).join(" · ")}</p></div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted">Amount ({chosen.unit})</span>
              <Input type="number" inputMode="decimal" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAmount("100")} className="h-9 rounded-full border border-line bg-card2 px-3 text-sm">100 {chosen.unit}</button>
              {chosen.servingAmount && <button type="button" onClick={() => setAmount(String(chosen.servingAmount))} className="h-9 rounded-full border border-line bg-card2 px-3 text-sm">1 serving ({chosen.servingAmount} {chosen.unit})</button>}
            </div>
            <div className="rounded-2xl border border-line bg-card2 px-4 py-3">
              <p className="num text-3xl font-bold">{fmt(scaled.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
              <p className="num text-muted">{fmt(scaled.protein, 1)} g protein</p>
              <p className="num mt-1 text-sm text-muted">Carbs {fmt(scaled.nutrients.carbs, 1)} · Sugar {fmt(scaled.nutrients.sugar, 1)} · Fat {fmt(scaled.nutrients.fat, 1)} g</p>
            </div>
            {chosen.warnings.map((w) => <p key={w} className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{w}</p>)}
            <Button type="button" className="w-full" disabled={amt <= 0} onClick={() => onPick({ code: chosen.code, name: displayName(chosen), serving: `${fmt(amt, 2)} ${chosen.unit}`, ...scaled })}>Use this food</Button>
          </>)}

          <p className="pb-1 text-center text-xs text-muted">Product data and photos from <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="underline">Open Food Facts</a> contributors (ODbL, photos CC BY-SA). Volunteers add it, so check it against the label.</p>
        </div>
      </div>
    </div>
  );
}
