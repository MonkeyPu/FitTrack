import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { FoodsView } from "@/components/views/library-views";

export const metadata = { title: "Saved foods" };
export default function Page() {
  return (<><PageHeader title="Saved foods" back="/add" action={<Link href="/library/foods/new" aria-label="New food" className={buttonClass({ size: "icon" })}><Plus className="h-5 w-5" /></Link>} /><FoodsView /></>);
}
