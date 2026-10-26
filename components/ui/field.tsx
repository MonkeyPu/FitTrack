import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line bg-card2 px-4 text-fg placeholder:text-muted/70 outline-none transition focus:border-accent";

export const Input = ({ className, type, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => {
  // Decimal number boxes are plain text boxes with the number keypad, so a comma can be typed as the decimal point
  // on every phone and browser. The value is read with parseDecimal (lib/number.ts).
  const decimal = type === "number" && p.inputMode === "decimal";
  return <input className={cn(base, "h-12", className)} type={decimal ? "text" : type} autoComplete={decimal ? "off" : p.autoComplete} {...p} />;
};
export const Textarea = ({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(base, "py-3", className)} {...p} />
);
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(base, "h-12", className)} {...p} />
);

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0 space-y-1.5", className)}>
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}
