"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { STORES, displayName, scaleProduct, type CatalogProduct, type PickedFood } from "@/lib/catalog";
import { cn, fmt } from "@/lib/utils";

type State = { status: "idle" | "loading" | "done" | "error"; items: CatalogProduct[]; page: number; hasMore: boolean; error: string; query: string };
const idle: State = { status: "idle", items: [], page: 1, hasMore: false, error: "", query: "" };

/** Search supermarket products (Open Food Facts) and pick one with an amount. */
export function CatalogPicker({ onPick, onClose }: { onPick: (p: PickedFood) => void; onClose: () => void }) {
  const [store, setStore] = useState<string>("mercadona");
  const [text, setText] = useState("");
  const [state, setState] = useState<State>(idle);
  const [chosen, setChosen] = useState<CatalogProduct | null>(null);
  const [amount, setAmount] = useState("100");
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(query: string, storeId: string, page: number, append: boolean) {
    const id = ++seq.current;
    setState((s) => ({ ...(append ? s : idle), status: "loading", query }));
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("You're offline. Connect to search the catalog.");
      const res = await fetch(`/api/catalog/search?${new URLSearchParams({ q: query, store: storeId, page: String(page) })}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't search the catalog.");
      if (id !== seq.current) return;
      setState((s) => ({ status: "done", items: append ? [...s.items, ...data.products] : data.products, page, hasMore: data.hasMore, error: "", query }));
    } catch (e) {
      if (id !== seq.current) return;
      setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "Couldn't search the catalog." }));
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q.length >= 2) run(q, store, 1, false);
  };
  const changeStore = (id: string) => {
    setStore(id);
    if (state.query) run(state.query, id, 1, false);
  };
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
            <div role="radiogroup" aria-label="Store" className="flex flex-wrap gap-2">
              {STORES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={store === s.id} onClick={() => changeStore(s.id)}
                  className={cn("h-9 rounded-full border px-3 text-sm font-medium transition", store === s.id ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted")}>{s.label}</button>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name or barcode, e.g. yogur" className="pl-10" aria-label="Search the catalog" autoFocus />
              </div>
              <Button type="submit" disabled={text.trim().length < 2 || state.status === "loading"}>Search</Button>
            </form>

            {state.status === "idle" && <p className="px-1 text-sm text-muted">Search Mercadona and other Spanish supermarkets. You can also type a barcode.</p>}
            {state.status === "loading" && state.items.length === 0 && <p className="px-1 text-sm text-muted">Searching…</p>}
            {state.status === "error" && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
            {state.status === "done" && state.items.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">No products found in this store. Try another spelling, another store, or &quot;All of Spain&quot;.</p>}

            {state.items.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line">
                {state.items.map((p) => (
                  <li key={p.code} className="border-b border-line last:border-0">
                    <button type="button" disabled={!p.hasNutrition} onClick={() => open(p)} className="flex min-h-14 w-full items-center justify-between gap-3 bg-card px-4 py-2 text-left disabled:opacity-50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ") || p.code}</span>
                      </span>
                      <span className="num shrink-0 text-right text-xs text-muted">{p.hasNutrition ? <>{fmt(p.per100.calories)} kcal<br />{fmt(p.per100.protein, 1)} g protein<br />per 100 {p.unit}</> : "No nutrition data"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {state.hasMore && <Button type="button" variant="secondary" className="w-full" disabled={state.status === "loading"} onClick={() => run(state.query, store, state.page + 1, true)}>{state.status === "loading" ? "Loading…" : "Load more"}</Button>}
          </>)}

          {chosen && scaled && (<>
            <div>
              <p className="text-base font-semibold">{chosen.name}</p>
              <p className="text-sm text-muted">{[chosen.brand, chosen.quantity].filter(Boolean).join(" · ")}</p>
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

          <p className="pb-1 text-center text-xs text-muted">Product data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="underline">Open Food Facts</a> (ODbL). Volunteers add it, so check it against the label.</p>
        </div>
      </div>
    </div>
  );
}
