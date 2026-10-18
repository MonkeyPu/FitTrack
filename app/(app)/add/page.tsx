import Link from "next/link";
import { BookmarkPlus, Dumbbell, Library, PenLine, Utensils } from "lucide-react";
import { requireUser, resolveDate } from "@/lib/data";

export const metadata = { title: "Add" };

export default async function Add({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  const { date, today } = await resolveDate(sp.date);
  const q = date === today ? "" : `?date=${date}`;
  const quick = date === today ? "/add/food?quick=1" : `/add/food?quick=1&date=${date}`;
  const items = [
    { href: `/add/food${q}`, icon: Utensils, title: "Log food", sub: "Search saved foods or enter a new one" },
    { href: `/add/meal${q}`, icon: BookmarkPlus, title: "Add a saved meal", sub: "Log a whole meal in one tap" },
    { href: `/add/cardio${q}`, icon: Dumbbell, title: "Log cardio", sub: "Running, walking, cycling and more" },
    { href: quick, icon: PenLine, title: "Add calories", sub: "Quickly add a number without naming a food" },
  ];
  return (
    <>
      <div className="space-y-3">
        {items.map(({ href, icon: Icon, title, sub }) => (
          <Link key={title} href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition active:scale-[0.98]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon className="h-6 w-6" /></span>
            <span><span className="block text-lg font-semibold">{title}</span><span className="block text-sm text-muted">{sub}</span></span>
          </Link>
        ))}
      </div>
      <Link href="/library/foods" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 text-muted"><Library className="h-5 w-5" />Manage saved foods and meals</Link>
    </>
  );
}
