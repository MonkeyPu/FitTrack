"use client";
import { useEffect } from "react";

/** Fades out the launch screen once the app has loaded. */
export function SplashHide() {
  useEffect(() => {
    const t = setTimeout(() => document.getElementById("splash")?.setAttribute("data-done", ""), 350);
    return () => clearTimeout(t);
  }, []);
  return null;
}
