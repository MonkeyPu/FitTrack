import { ActivityForm } from "@/components/activity-form";
import { PageHeader } from "@/components/page-header";
import { requireUser, resolveDate } from "@/lib/data";

export const metadata = { title: "Log cardio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  const { date, today } = await resolveDate(sp.date);
  return (
    <>
      <PageHeader title="Log cardio" back="/add" />
      <ActivityForm date={date} today={today} />
    </>
  );
}
