"use client";
import { useRef } from "react";
import { Field, Input } from "@/components/ui/field";
import { NUTRIENT_KEYS, NUTRIENTS, type NutrientKey, type NutrientStrings } from "@/lib/nutrition";

/** Optional extras per serving: carbs, sugar, added sugar, fat, saturated fat, fiber (grams). */
export function NutrientFields({ values, onChange }: { values: NutrientStrings; onChange: (k: NutrientKey, v: string) => void }) {
  const startOpen = useRef(NUTRIENT_KEYS.some((k) => values[k] !== ""));
  return (
    <details open={startOpen.current} className="rounded-xl border border-line bg-card">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-medium">
        More nutrients <span className="font-normal text-muted">carbs, sugar, fat…</span>
      </summary>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {NUTRIENTS.map((n) => (
          <Field key={n.key} label={`${n.label} (g)`}>
            <Input type="number" inputMode="decimal" step="any" min="0" value={values[n.key]} onChange={(e) => onChange(n.key, e.target.value)} />
          </Field>
        ))}
      </div>
    </details>
  );
}
