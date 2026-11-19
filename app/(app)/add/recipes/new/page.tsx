import { PageHeader } from "@/components/page-header";
import { RecipeEditView } from "@/components/views/recipe-views";

export const metadata = { title: "New recipe" };
export default function Page() { return (<><PageHeader title="New recipe" back="/add/recipes" /><RecipeEditView id="new" /></>); }
