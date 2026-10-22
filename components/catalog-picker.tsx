"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Package, ScanBarcode, Search, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { STORES, displayName, imageAt, plainWords, priceText, scaleProduct, type CatalogProduct, type PickedFood } from "@/lib/catalog";
import { searchCatalog } from "@/lib/client/api";
import { useSupabase } from "@/lib/client/hooks";
import { cn, fmt } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

function Thumb({ src, size = 48 }: { src: string | null; size?: number }) {
  const [bad, setBad] = useState(false);
  const url = imageAt(src, size * 2);
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card2 text-muted" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && !bad ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-contain" /> : <Package className="h-5 w-5" />}
    </span>
  );
}

/** Type to see matching supermarket products (with photos) as a list; tap one to choose an amount. */
export function CatalogPicker({ onPick, onClose, initialQuery = "", inline = false }: { onPick: (p: PickedFood) => void; onClose?: () => void; initialQuery?: string; inline?: boolean }) {
  const sb = useSupabase();
  const [store, setStore] = useState<string>(STORES[0].id);
  const [text, setText] = useState(initialQuery);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<CatalogProduct | null>(null);
  const [amount, setAmount] = useState("100");
  const cache = useRef(new Map<string, CatalogProduct[]>());
  const [nonce, setNonce] = useState(0);
  const [scanning, setScanning] = useState(false);
  const instant = useRef(false);

  useEffect(() => {
    if (inline || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !scanning && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, inline, scanning]);

  // Search while typing, after a short pause so every keystroke doesn't hit the database.
  useEffect(() => {
    const q = text.trim();
    const digits = /^\d+$/.test(q);
    if (plainWords(q).length < 3 || (digits && q.length < 8)) {
      setStatus("idle");
      setError("");
      setItems([]);
      return;
    }
    const key = `${store}|${digits ? q : plainWords(q)}`;
    const hit = cache.current.get(key);
    if (hit) { setItems(hit); setStatus("done"); setError(""); return; }

    let stale = false;
    setStatus("loading");
    const delay = instant.current ? 0 : 250;
    instant.current = false;
    const t = setTimeout(async () => {
      try {
        if (navigator.onLine === false) throw new Error("You're offline. Connect to search the catalog.");
        const found = await searchCatalog(sb, store, digits ? q : plainWords(q));
        if (stale) return;
        cache.current.set(key, found);
        setItems(found);
        setStatus("done");
        setError("");
      } catch (e) {
        if (stale) return;
        setStatus("error");
        setError(e instanceof Error && e.message.startsWith("You're offline") ? e.message : "Couldn't search the catalog. Check your connection and try again.");
      }
    }, delay);
    return () => { stale = true; clearTimeout(t); };
  }, [text, store, nonce, sb]);

  const visible = items;

  // A scanned barcode goes into the search box. When exactly one product has it, open it right away.
  const onScan = async (code: string) => {
    setScanning(false);
    setChosen(null);
    setText(code);
    instant.current = true;
    try {
      const found = await searchCatalog(sb, store, code);
      if (found.length === 1 && found[0].hasNutrition) open(found[0]);
    } catch { /* the normal search below shows the error */ }
  };

  const storeLabel = STORES.find((s) => s.id === store)?.label ?? "";
  const open = (p: CatalogProduct) => { setChosen(p); setAmount("100"); };
  const amt = Number(amount) > 0 ? Number(amount) : 0;
  const scaled = chosen ? scaleProduct(chosen, amt) : null;
  const sub = (p: CatalogProduct) => [p.brand, p.quantity, priceText(p.price)].filter(Boolean).join(" · ") || p.code;

  return (
    <>
    <div className={inline ? "" : "fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center"} onClick={inline ? undefined : onClose}>
      <div role={inline ? undefined : "dialog"} aria-modal={inline ? undefined : true} aria-label="Supermarket catalog" onClick={(e) => e.stopPropagation()}
        className={inline ? "" : "flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-card md:rounded-3xl"}>
        {inline ? (chosen && <button type="button" onClick={() => setChosen(null)} className="mb-2 flex min-h-11 items-center gap-2 text-sm font-medium text-accent"><ArrowLeft className="h-4 w-4" />Back to results</button>) : (
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          {chosen && <button type="button" aria-label="Back to results" onClick={() => setChosen(null)} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted"><ArrowLeft className="h-5 w-5" /></button>}
          <h2 className="flex-1 text-lg font-semibold">{chosen ? "Choose an amount" : "Supermarket catalog"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"><X className="h-5 w-5" /></button>
        </div>)}

        <div className={inline ? "space-y-3" : "flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"}>
          {!chosen && (<>
            <form onSubmit={(e) => { e.preventDefault(); instant.current = true; setNonce((n) => n + 1); }} className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search, e.g. chicken breast or yogur" className="pl-10 pr-14" aria-label="Search the catalog" autoFocus enterKeyHint="search" />
              <button type="button" aria-label="Scan a barcode" onClick={() => setScanning(true)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-accent"><ScanBarcode className="h-5 w-5" /></button>
            </form>
            {STORES.length > 1 && (
              <div role="radiogroup" aria-label="Store" className="flex flex-wrap gap-2">
                {STORES.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={store === s.id} onClick={() => setStore(s.id)}
                    className={cn("h-9 rounded-full border px-3 text-sm font-medium transition", store === s.id ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted")}>{s.label}</button>
                ))}
              </div>
            )}

            {status === "idle" && visible.length === 0 && <p className="px-1 text-sm text-muted">Type at least 3 letters, in English or Spanish, and matching {storeLabel} products appear. You can also scan a barcode or paste its number.</p>}
            {status === "loading" && visible.length === 0 && <p className="px-1 text-sm text-muted">Searching…</p>}
            {status === "error" && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            {status === "done" && visible.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{/^\d+$/.test(text.trim()) ? `No ${storeLabel} product has the barcode ${text.trim()}. Try typing its name instead.` : `No matching ${storeLabel} products. Try fewer or different words.`}</p>}

            {visible.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line" aria-busy={status === "loading"}>
                {visible.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <button type="button" disabled={!p.hasNutrition} onClick={() => open(p)} className="flex min-h-16 w-full items-center gap-3 bg-card px-3 py-2 text-left disabled:opacity-50">
                      <Thumb src={p.image} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{sub(p)}</span>
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
              <div className="min-w-0"><p className="text-base font-semibold">{chosen.name}</p><p className="text-sm text-muted">{sub(chosen)}</p></div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted">Amount ({chosen.unit})</span>
              <Input type="number" inputMode="decimal" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAmount("100")} className="h-9 rounded-full border border-line bg-card2 px-3 text-sm">100 {chosen.unit}</button>
              {chosen.packAmount && chosen.packAmount !== 100 && <button type="button" onClick={() => setAmount(String(chosen.packAmount))} className="h-9 rounded-full border border-line bg-card2 px-3 text-sm">Whole pack ({fmt(chosen.packAmount)} {chosen.unit})</button>}
            </div>
            <div className="rounded-2xl border border-line bg-card2 px-4 py-3">
              <p className="num text-3xl font-bold">{fmt(scaled.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
              <p className="num text-muted">{fmt(scaled.protein, 1)} g protein</p>
              <p className="num mt-1 text-sm text-muted">Carbs {fmt(scaled.nutrients.carbs, 1)} · Sugar {fmt(scaled.nutrients.sugar, 1)} · Fat {fmt(scaled.nutrients.fat, 1)} g</p>
            </div>
            {chosen.warnings.map((w) => <p key={w} className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{w}</p>)}
            <Button type="button" className="w-full" disabled={amt <= 0} onClick={() => onPick({ code: chosen.code, name: displayName(chosen), serving: `${fmt(amt, 2)} ${chosen.unit}`, ...scaled })}>Use this food</Button>
          </>)}

          <p className="pb-1 text-center text-xs text-muted">Products, prices and photos from Mercadona&apos;s online store. Nutrition from the community-run MercaAPI, not Mercadona, so check it against the label.</p>
        </div>
      </div>
    </div>
    {scanning && <BarcodeScanner onDetect={onScan} onClose={() => setScanning(false)} />}
    </>
  );
}
