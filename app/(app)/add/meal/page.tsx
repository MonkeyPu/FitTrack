import { MealPicker } from "@/components/meal-picker";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Add a saved meal" };
export default function Page() { return (<><PageHeader title="Add a saved meal" back="/add" /><MealPicker /></>); }
