"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; text: string; kind: "error" | "success" };
const ToastCtx = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: Toast["kind"] = "error") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={cn("glass pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-medium", t.kind === "error" ? "text-danger" : "text-accent")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
