import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2 pb-2">
      {back && (
        <Link href={back} aria-label="Back" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      )}
      <h1 className="flex-1 text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
