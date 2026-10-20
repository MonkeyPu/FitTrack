import Link from "next/link";
import { Dumbbell, Library, PenLine, Store, Utensils } from "lucide-react";

export const metadata = { title: "Add" };

const items = [
  { href: "/add/food", icon: Utensils, title: "Log food", sub: "Enter a food and add your saved ingredients" },
  { href: "/add/cardio", icon: Dumbbell, title: "Log cardio", sub: "Walking, running, cycling and more" },
  { href: "/add/catalog", icon: Store, title: "Supermarket catalog", sub: "Find Mercadona and other products" },
  { href: "/add/food?quick=1", icon: PenLine, title: "Add calories", sub: "Quickly add a number without naming a food" },
];

export default function Add() {
  return (
    <>
      <div className="space-y-4">
        {items.map(({ href, icon: Icon, title, sub }) => (
          <Link key={title} href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition active:scale-[0.98]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon className="h-6 w-6" /></span>
            <span><span className="block text-lg font-semibold">{title}</span><span className="block text-sm text-muted">{sub}</span></span>
          </Link>
        ))}
      </div>
      <Link href="/library/foods" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 text-muted"><Library className="h-5 w-5" />My ingredients</Link>
    </>
  );
}
