"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateAppearance } from "@/app/actions/profile";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Toggle } from "@/components/ui/field";
import { ACCENT_PRESETS, DEFAULT_ACCENT_PREVIEW, accentVars } from "@/lib/accent";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

function applyAccent(hex: string) {
  const root = document.documentElement;
  if (hex) {
    const v = accentVars(hex);
    root.style.setProperty("--accent", v.accent);
    root.style.setProperty("--accentfg", v.accentfg);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accentfg");
  }
}

export function AppearanceForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateAppearance, {});
  const initial = profile.preferences?.accent ?? "";
  const [theme, setTheme] = useState<"dark" | "light">(profile.preferences?.theme === "light" ? "light" : "dark");
  const [accent, setAccent] = useState(initial);
  const saved = useRef(initial);
  const isPreset = ACCENT_PRESETS.some((p) => p.value === accent);

  useEffect(() => { applyAccent(accent); }, [accent]);
  useEffect(() => { if (state.ok) saved.current = accent; }, [state, accent]);
  // Leaving without saving puts the saved color back.
  useEffect(() => () => applyAccent(saved.current), []);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="accent" value={accent} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Theme</p>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2 rounded-xl bg-card2 p-1">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}
              className={cn("h-11 rounded-lg text-sm font-semibold capitalize transition", theme === t ? "bg-card text-fg shadow" : "text-muted")}>{t}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Accent color</p>
        <div role="radiogroup" aria-label="Accent color" className="grid grid-cols-5 gap-3">
          {ACCENT_PRESETS.map((p) => (
            <button key={p.name} type="button" role="radio" aria-checked={accent === p.value} aria-label={p.name} onClick={() => setAccent(p.value)}
              className={cn("mx-auto h-11 w-11 rounded-full border-2 transition active:scale-95", accent === p.value ? "border-fg" : "border-transparent")}
              style={{ background: `#${p.value || DEFAULT_ACCENT_PREVIEW}` }} />
          ))}
          <label aria-label="Custom color" className={cn("relative mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-bold", !isPreset ? "border-fg" : "border-line text-muted")}
            style={!isPreset ? { background: `#${accent}` } : { background: "conic-gradient(#f87171,#facc15,#34d36c,#4c8dff,#a78bfa,#f87171)" }}>
            <input type="color" value={`#${accent || DEFAULT_ACCENT_PREVIEW}`} onChange={(e) => setAccent(e.target.value.slice(1).toLowerCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
        </div>
        <div className="flex h-12 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accentfg">Preview</div>
      </div>

      <Toggle name="effects" label="Game-style effects" hint={'Celebrations when you hit goals, and a "chud" screen when you go over your food limit'} defaultChecked={profile.preferences?.effects !== false} />

      <FormMessage state={state} />
      <SubmitButton className="w-full">Save appearance</SubmitButton>
    </form>
  );
}
