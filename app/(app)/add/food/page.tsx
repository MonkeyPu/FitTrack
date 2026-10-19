import { FoodForm } from "@/components/food-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Log food" };

export default async function Page({ searchParams }: { searchParams: Promise<{ quick?: string }> }) {
  const quick = (await searchParams).quick === "1";
  return (<><PageHeader title={quick ? "Add calories" : "Log food"} back="/add" /><FoodForm quick={quick} /></>);
}
