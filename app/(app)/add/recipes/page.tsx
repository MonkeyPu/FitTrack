import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { RecipesView } from "@/components/views/recipe-views";

export const metadata = { title: "Recipes" };
export default function Page() {
  return (<><PageHeader title="Recipes" back="/add" action={<Link href="/add/recipes/new" aria-label="New recipe" className={buttonClass({ size: "icon" })}><Plus className="h-5 w-5" /></Link>} /><RecipesView /></>);
}
