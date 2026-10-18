"use client";
import { useEffect } from "react";

/** iOS Safari ignores user-scalable=no, so pinch gestures are cancelled here as well. */
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);
  return null;
}
