import { parseDecimal } from "@/lib/number";

export class FormError extends Error {}

/** Parses a number field. Blank is allowed (as 0) unless `required`. */
export function parseNum(raw: string, label: string, o: { min?: number; max?: number; required?: boolean; int?: boolean } = {}): number {
  const { min = 0, max = 100000, required = false, int = false } = o;
  if (raw.trim() === "") {
    if (required) throw new FormError(`Enter ${label}.`);
    return 0;
  }
  const n = parseDecimal(raw); // a comma works as the decimal point
  if (!Number.isFinite(n)) throw new FormError(`Enter a valid number for ${label}.`);
  if (n < min) throw new FormError(`${label} must be at least ${min}.`);
  if (n > max) throw new FormError(`${label} must be at most ${max}.`);
  if (int && !Number.isInteger(n)) throw new FormError(`${label} must be a whole number.`);
  return n;
}

export const parseText = (raw: string, label: string, max: number, required = false): string => {
  const t = raw.trim();
  if (required && !t) throw new FormError(`Enter ${label}.`);
  if (t.length > max) throw new FormError(`Keep ${label} under ${max} characters.`);
  return t;
};

/** Nutrient inputs (grams). */
export function parseNutrientStrings(s: Record<string, string>, keys: readonly string[], labels: Record<string, string>) {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = parseNum(s[k] ?? "", labels[k] ?? k, { max: 1000 });
  return out;
}
