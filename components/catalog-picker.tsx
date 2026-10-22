"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Package, ScanBarcode, Search, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { CATALOGS, catalogLabel, displayName, imageAt, plainWords, priceText, scaleProduct, zoomImage, type CatalogProduct, type PickedFood } from "@/lib/catalog";
import { searchSource } from "@/lib/client/api";
import { useSupabase } from "@/lib/client/hooks";
import { cn, fmt } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";
const SOURCES_KEY = "fx-catalog-sources";

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

/** A product photo that opens bigger when tapped. Photos that are missing or broken are not tappable. */
function ZoomThumb({ p, size, onZoom }: { p: CatalogProduct; size: number; onZoom: (p: CatalogProduct) => void }) {
  if (!p.image) return <Thumb src={null} size={size} />;
  return (
    <button type="button" aria-label={`Zoom in on the photo of ${p.name}`} onClick={() => onZoom(p)} className="shrink-0 rounded-lg">
      <Thumb src={p.image} size={size} />
    </button>
  );
}

function Lightbox({ p, onClose }: { p: CatalogProduct; onClose: () => void }) {
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const url = zoomImage(p.image);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Photo of ${p.name}`} onClick={onClose} className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/85 p-4">
      <button type="button" aria-label="Close photo" onClick={onClose} className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white"><X className="h-5 w-5" /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && !bad ? <img src={url} alt={p.name} referrerPolicy="no-referrer" onError={() => setBad(true)} className="max-h-[80dvh] max-w-full rounded-2xl bg-white object-contain" /> : <p className="text-white">This photo couldn&apos;t be loaded.</p>}
      <p className="max-w-sm text-center text-sm text-white/90">{p.name}</p>
    </div>
  );
}

/** Type to see matching products (with photos) from Mercadona and/or Open Food Facts; tap one to choose an amount. */
export function CatalogPicker({ onPick, onClose, initialQuery = "", inline = false }: { onPick: (p: PickedFood) => void; onClose?: () => void; initialQuery?: string; inline?: boolean }) {
  const sb = useSupabase();
  const [sources, setSources] = useState<string[]>(["mercadona"]);
  const [text, setText] = useState(initialQuery);
  const [results, setResults] = useState<Record<string, CatalogProduct[]>>({});
  const [state, setState] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<CatalogProduct | null>(null);
  const [zoomed, setZoomed] = useState<CatalogProduct | null>(null);
  const [amount, setAmount] = useState("100");
  const cache = useRef(new Map<string, CatalogProduct[]>());
  const [nonce, setNonce] = useState(0);
  const [scanning, setScanning] = useState(false);
  const instant = useRef(false);

  // Remember which sources were picked last time.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SOURCES_KEY) ?? "null") as unknown;
      if (Array.isArray(saved)) {
        const ok = CATALOGS.map((c) => c.id as string).filter((id) => saved.includes(id));
        if (ok.length > 0) setSources(ok);
      }
    } catch { /* keep the default */ }
  }, []);
  const toggleSource = (id: string) => {
    const next = sources.includes(id) ? sources.filter((s) => s !== id) : [...sources, id];
    if (next.length === 0) return; // at least one stays on
    const ordered = CATALOGS.map((c) => c.id as string).filter((x) => next.includes(x));
    setSources(ordered);
    try { localStorage.setItem(SOURCES_KEY, JSON.stringify(ordered)); } catch { /* not saved */ }
  };

  useEffect(() => {
    if (inline || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !scanning && !zoomed && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, inline, scanning, zoomed]);

  // Search while typing, after a short pause so every keystroke doesn't hit the database.
  useEffect(() => {
    const q = text.trim();
    const digits = /^\d+$/.test(q);
    if (plainWords(q).length < 3 || (digits && q.length < 8)) {
      setState({}); setErrors({}); setResults({});
      return;
    }
    const term = digits ? q : plainWords(q);
    let stale = false;
    const toRun: string[] = [];
    const nextState: Record<string, Status> = {};
    const nextResults: Record<string, CatalogProduct[]> = {};
    for (const s of sources) {
      const hit = cache.current.get(`${s}|${term}`);
      if (hit) { nextResults[s] = hit; nextState[s] = "done"; } else { toRun.push(s); nextState[s] = "loading"; }
    }
    setResults((old) => ({ ...Object.fromEntries(sources.map((s) => [s, old[s] ?? []])), ...nextResults }));
    setState(nextState);
    setErrors({});
    if (toRun.length === 0) return;

    const delay = instant.current ? 0 : 350;
    instant.current = false;
    const t = setTimeout(() => {
      for (const s of toRun) {
        (async () => {
          try {
            if (navigator.onLine === false) throw new Error("You're offline. Connect to search the catalog.");
            const found = await searchSource(sb, s, term);
            if (stale) return;
            cache.current.set(`${s}|${term}`, found);
            setResults((r) => ({ ...r, [s]: found }));
            setState((o) => ({ ...o, [s]: "done" }));
          } catch (e) {
            if (stale) return;
            setState((o) => ({ ...o, [s]: "error" }));
            setErrors((o) => ({ ...o, [s]: e instanceof Error && e.message ? e.message : "Couldn't search. Check your connection and try again." }));
          }
        })();
      }
    }, delay);
    return () => { stale = true; clearTimeout(t); };
  }, [text, sources, nonce, sb]);

  const visible = sources.flatMap((s) => results[s] ?? []);
  const states = sources.map((s) => state[s]);
  const loading = states.includes("loading");
  const failed = sources.filter((s) => state[s] === "error");
  const searched = states.length > 0 && states.every((x) => x === "done" || x === "error");
  const names = sources.map(catalogLabel).join(" or ");
  const q = text.trim();
  const isBarcode = /^\d+$/.test(q);
  const showTag = sources.length > 1;

  const open = (p: CatalogProduct) => { setChosen(p); setAmount("100"); };
  const amt = Number(amount) > 0 ? Number(amount) : 0;
  const scaled = chosen ? scaleProduct(chosen, amt) : null;
  const sub = (p: CatalogProduct) => [showTag ? catalogLabel(p.store) : null, p.brand, p.quantity, priceText(p.price)].filter(Boolean).join(" · ") || p.code;

  // A scanned barcode goes into the search box. When exactly one product has it, open it right away.
  const onScan = async (code: string) => {
    setScanning(false);
    setChosen(null);
    setText(code);
    instant.current = true;
    const all = await Promise.allSettled(sources.map((s) => searchSource(sb, s, code)));
    const found = all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (found.length === 1 && found[0].hasNutrition) open(found[0]);
  };

  const chips: { label: string; value: number }[] = [{ label: `100 ${chosen?.unit ?? "g"}`, value: 100 }];
  if (chosen?.servingAmount && chosen.servingAmount !== 100) chips.push({ label: `1 serving (${fmt(chosen.servingAmount)} ${chosen.unit})`, value: chosen.servingAmount });
  if (chosen?.packAmount && chosen.packAmount !== 100) chips.push({ label: `Whole pack (${fmt(chosen.packAmount)} ${chosen.unit})`, value: chosen.packAmount });

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
            <div role="group" aria-label="Where to search" className="flex flex-wrap gap-2">
              {CATALOGS.map((c) => {
                const on = sources.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => toggleSource(c.id)}
                    className={cn("h-9 rounded-full border px-3 text-sm font-medium transition", on ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted")}>{c.label}</button>
                );
              })}
            </div>

            {states.length === 0 && <p className="px-1 text-sm text-muted">Type at least 3 letters, in English or Spanish, and matching products from {names} appear. You can also scan a barcode or paste its number. Pick both sources to search them together.</p>}
            {loading && visible.length === 0 && <p className="px-1 text-sm text-muted">Searching…</p>}
            {failed.map((s) => <p key={s} role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{showTag ? `${catalogLabel(s)}: ` : ""}{errors[s]}</p>)}
            {searched && !loading && visible.length === 0 && failed.length < sources.length && (
              <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{isBarcode ? `No product from ${names} has the barcode ${q}. Try typing its name instead.` : `No matching products from ${names}. Try fewer or different words.`}</p>
            )}

            {visible.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line" aria-busy={loading}>
                {visible.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-line bg-card pl-3 last:border-0">
                    <ZoomThumb p={p} size={48} onZoom={setZoomed} />
                    <button type="button" disabled={!p.hasNutrition} onClick={() => open(p)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 pr-3 text-left disabled:opacity-50">
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
            {loading && visible.length > 0 && <p className="px-1 text-center text-xs text-muted">Updating…</p>}
          </>)}

          {chosen && scaled && (<>
            <div className="flex items-center gap-3">
              <ZoomThumb p={chosen} size={64} onZoom={setZoomed} />
              <div className="min-w-0"><p className="text-base font-semibold">{chosen.name}</p><p className="text-sm text-muted">{sub(chosen)}</p></div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted">Amount ({chosen.unit})</span>
              <Input type="number" inputMode="decimal" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => <button key={c.label} type="button" onClick={() => setAmount(String(c.value))} className="h-9 rounded-full border border-line bg-card2 px-3 text-sm">{c.label}</button>)}
            </div>
            <div className="rounded-2xl border border-line bg-card2 px-4 py-3">
              <p className="num text-3xl font-bold">{fmt(scaled.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
              <p className="num text-muted">{fmt(scaled.protein, 1)} g protein</p>
              <p className="num mt-1 text-sm text-muted">Carbs {fmt(scaled.nutrients.carbs, 1)} · Sugar {fmt(scaled.nutrients.sugar, 1)} · Fat {fmt(scaled.nutrients.fat, 1)} g</p>
            </div>
            {chosen.warnings.map((w) => <p key={w} className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{w}</p>)}
            <Button type="button" className="w-full" disabled={amt <= 0} onClick={() => onPick({ code: chosen.code, name: displayName(chosen), serving: `${fmt(amt, 2)} ${chosen.unit}`, ...scaled })}>Use this food</Button>
          </>)}

          <p className="pb-1 text-center text-xs text-muted">
            {sources.includes("mercadona") && "Mercadona products, prices and photos are from Mercadona's online store; nutrition is from the community-run MercaAPI. "}
            {sources.includes("off") && "Open Food Facts data is added by volunteers. "}
            Check values against the label.
          </p>
        </div>
      </div>
    </div>
    {scanning && <BarcodeScanner onDetect={onScan} onClose={() => setScanning(false)} />}
    {zoomed && <Lightbox p={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}
