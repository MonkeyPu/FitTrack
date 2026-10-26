/**
 * Reads a number the way people type it. A comma works as the decimal point ("12,5" is 12.5). When both a dot and
 * a comma are typed, the last one is the decimal point and the other is a thousands separator
 * ("1.234,5" and "1,234.5" are both 1234.5).
 */
export function normalizeDecimal(raw: string): string {
  const t = raw.trim().replace(/\s+/g, "");
  const mark = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
  if (mark === -1) return t;
  return `${t.slice(0, mark).replace(/[.,]/g, "")}.${t.slice(mark + 1).replace(/[.,]/g, "")}`;
}

/** Like Number(), but a comma works as the decimal point. Blank gives 0 and text gives NaN, the same as Number(). */
export const parseDecimal = (raw: string): number => Number(normalizeDecimal(raw));
