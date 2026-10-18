"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/diary", label: "Diary", icon: BookOpen },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav({ pendingRequests = 0 }: { pendingRequests?: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-center rounded-[32px] p-1.5 md:max-w-lg">
        {tabs.map(({ href, label, icon: Icon }) =>
          href === "/add" ? (
            <Link key={href} href={href} prefetch aria-label="Add entry" aria-current={active(href) ? "page" : undefined} className="relative flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accentfg shadow-lg shadow-accent/30 transition active:scale-95">
                <Icon className="h-7 w-7" strokeWidth={2.5} />
              </span>
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active(href) ? "page" : undefined}
              className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[26px] text-[11px] font-medium transition", active(href) ? "bg-fg/10 text-accent" : "text-muted")}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {href === "/friends" && pendingRequests > 0 && (
                  <span aria-label={`${pendingRequests} friend requests`} className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accentfg">{pendingRequests}</span>
                )}
              </span>
              {label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
