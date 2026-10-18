/** Accent colors are stored as 6 hex digits without "#". An empty value means the theme default. */
export const isHex6 = (s: unknown): s is string => typeof s === "string" && /^[0-9a-fA-F]{6}$/.test(s);

export const DEFAULT_ACCENT_PREVIEW = "34d36c";

export const ACCENT_PRESETS = [
  { name: "Green", value: "" },
  { name: "Blue", value: "4c8dff" },
  { name: "Purple", value: "a78bfa" },
  { name: "Pink", value: "f472b6" },
  { name: "Orange", value: "fb923c" },
  { name: "Red", value: "f87171" },
  { name: "Yellow", value: "facc15" },
  { name: "Teal", value: "2dd4bf" },
] as const;

/** CSS variable values ("r g b") for an accent, with a readable text color to sit on top of it. */
export function accentVars(hex: string): { accent: string; accentfg: string } {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return { accent: `${r} ${g} ${b}`, accentfg: luminance > 0.4 ? "10 10 11" : "255 255 255" };
}
