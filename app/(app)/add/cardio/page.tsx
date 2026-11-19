import { ActivityForm } from "@/components/activity-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Add burnt calories" };
export default function Page() { return (<><PageHeader title="Add burnt calories" back="/add" /><ActivityForm /></>); }
