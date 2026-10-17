import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/activity-form";
import { PageHeader } from "@/components/page-header";
import { requireUser, resolveDate } from "@/lib/data";
import { safeNext } from "@/lib/action-helpers";
import { timeInTz } from "@/lib/dates";
import type { ActivityLog } from "@/lib/types";

export const metadata = { title: "Edit cardio entry" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ next?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireUser();
  const { today, tz } = await resolveDate(undefined);
  const { data } = await supabase.from("activity_logs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const l = data as ActivityLog;
  const next = safeNext(sp.next, "/diary");
  return (
    <>
      <PageHeader title="Edit entry" back={next} />
      <ActivityForm date={l.log_date} today={today} next={next} initial={{ id: l.id, name: l.activity_name, type: l.activity_type, duration: l.duration_minutes, cal: l.calories_burned, source: l.calorie_source, notes: l.notes ?? "", time: timeInTz(l.logged_at, tz) }} />
    </>
  );
}
