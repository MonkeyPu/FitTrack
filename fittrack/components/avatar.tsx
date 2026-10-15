import { cn } from "@/lib/utils";

export function Avatar({ name, url, size = 44, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-card2 font-semibold text-muted", className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.trim().slice(0, 2).toUpperCase() || "?"}
    </span>
  );
}
