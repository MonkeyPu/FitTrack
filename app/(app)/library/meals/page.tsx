import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { MealsView } from "@/components/views/library-views";

export const metadata = { title: "Saved meals" };
export default function Page() {
  return (<><PageHeader title="Saved meals" back="/add" action={<Link href="/library/meals/new" aria-label="New meal" className={buttonClass({ size: "icon" })}><Plus className="h-5 w-5" /></Link>} /><MealsView /></>);
}
