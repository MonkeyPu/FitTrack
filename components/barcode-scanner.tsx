"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { validBarcode } from "@/lib/barcode";

/** Full-screen camera view that reads one product barcode (EAN-13, EAN-8 or UPC-A) and hands it to onDetect. */
export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const latest = useRef({ onDetect, onClose });
  latest.current = { onDetect, onClose };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latest.current.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    let found = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("No camera API", "NotSupportedError");
        // loaded only when the scanner opens, so the rest of the app stays small
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map<unknown, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]], [DecodeHintType.TRY_HARDER, true]]);
        const reader = new BrowserMultiFormatReader(hints as Map<import("@zxing/library").DecodeHintType, unknown>, { delayBetweenScanAttempts: 120 });
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          video.current!,
          (result) => {
            const text = result?.getText();
            if (!text || found || !validBarcode(text)) return; // ignore misreads
            found = true;
            navigator.vibrate?.(60);
            latest.current.onDetect(text);
          },
        );
        if (cancelled) c.stop(); else { controls = c; setStarting(false); }
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : "";
        setStarting(false);
        setError(
          name === "NotAllowedError" || name === "SecurityError" ? "Camera access is blocked. Allow the camera for this site in your browser settings, then try again."
          : name === "NotFoundError" || name === "OverconstrainedError" ? "No camera was found on this device."
          : name === "NotSupportedError" ? "This browser can't open the camera here. Type the barcode instead."
          : "Couldn't start the camera. Close other apps that use it and try again.",
        );
      }
    })();
    return () => { cancelled = true; controls?.stop(); };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan a barcode" className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="text-lg font-semibold">Scan a barcode</h2>
        <button type="button" aria-label="Close scanner" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-[78%] max-w-sm rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        {error && <p role="alert" className="absolute inset-x-4 top-6 rounded-xl bg-black/80 px-4 py-3 text-sm">{error}</p>}
      </div>
      <p className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-white/80">
        {error ? "You can also type the barcode number in the search box." : starting ? "Starting the camera…" : "Fit the barcode inside the frame and hold steady."}
      </p>
    </div>
  );
}
