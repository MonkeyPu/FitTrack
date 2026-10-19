import { ActivityForm } from "@/components/activity-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Log cardio" };
export default function Page() { return (<><PageHeader title="Log cardio" back="/add" /><ActivityForm /></>); }
