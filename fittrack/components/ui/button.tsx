import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-accent text-accentfg",
        secondary: "bg-card2 text-fg border border-line",
        ghost: "text-muted hover:text-fg",
        danger: "bg-danger/15 text-danger border border-danger/30",
      },
      size: { default: "h-12 px-5 text-base", sm: "h-10 px-4 text-sm", icon: "h-11 w-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;
export const Button = ({ className, variant, size, ...p }: ButtonProps) => (
  <button className={cn(button({ variant, size }), className)} {...p} />
);
export const buttonClass = (o?: VariantProps<typeof button>) => button(o);
