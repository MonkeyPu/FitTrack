export type TargetInput = {
  maintenance?: number | null;
  maxFood?: number | null;
  netTarget?: number | null;
  protein?: number | null;
};

/**
 * Gentle warnings, never blocks. Calorie estimates are approximate and people
 * (especially teenagers) should not follow aggressive deficits without guidance.
 */
export function targetWarnings({ maintenance, maxFood, netTarget }: TargetInput): string[] {
  const out: string[] = [];
  const low = (v?: number | null) => typeof v === "number" && v > 0;
  const deficit = (v?: number | null) =>
    low(v) && low(maintenance) ? (maintenance! - v!) / maintenance! : 0;

  if ((low(maxFood) && maxFood! < 1500) || (low(netTarget) && netTarget! < 1200)) {
    out.push("These targets are quite low. Very low calorie targets can be unsafe, especially while you're growing.");
  }
  if (deficit(maxFood) > 0.25 || deficit(netTarget) > 0.25) {
    out.push("This is a large gap below your maintenance calories. A steady, modest gap is easier to sustain and safer.");
  }
  if (out.length) {
    out.push("Please talk to a doctor, dietitian or other qualified professional before following a target like this.");
  }
  return out;
}

export const ESTIMATE_NOTE =
  "Maintenance calories and targets are rough estimates. Calorie logs alone can't tell you how much fat you've lost or gained.";
