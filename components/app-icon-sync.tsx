"use client";
import { useEffect } from "react";
import { useApp } from "@/components/app-context";
import { useDay } from "@/lib/client/hooks";
import { statusOf, summarize, targetsOf } from "@/lib/calc";

/**
 * Keeps the app icon in step with today's food. The browser tab icon becomes a ring that fills as you
 * eat toward your maximum (amber near it, red over it). The last value is also saved in a cookie so
 * the launch screen opens with the same ring.
 * An installed home screen icon can't change on iOS, so this covers the tab icon and launch screen.
 */
export function AppIconSync() {
  const { profile, today } = useApp();
  const day = useDay(today);

  useEffect(() => {
    if (!day.data) return;
    const s = summarize(day.data.foods, day.data.meals, day.data.activities, targetsOf(profile));
    const progress = Math.min(Math.max((s.foodPct ?? 0) / 100, 0), 1);
    const status = statusOf(s.foodPct);

    const css = getComputedStyle(document.documentElement);
    const rgb = (v: string) => `rgb(${css.getPropertyValue(v).trim()})`;
    const accent = rgb("--accent");
    const arc = status === "over" ? rgb("--danger") : status === "near" ? rgb("--warn") : accent;
    const c = 2 * Math.PI * 34;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<circle cx="50" cy="50" r="34" fill="none" stroke-width="12" stroke="${accent}" stroke-opacity="0.3"/>` +
      `<circle cx="50" cy="50" r="34" fill="none" stroke-width="12" stroke-linecap="round" stroke="${arc}" ` +
      `stroke-dasharray="${(c * Math.max(progress, 0.02)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`;
    const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-live]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.dataset.live = "";
      document.head.appendChild(link);
    }
    link.href = href;

    document.cookie = `ft_ring=${progress.toFixed(2)}|${status}; path=/; max-age=31536000; samesite=lax`;
  }, [day.data, profile]);

  return null;
}
