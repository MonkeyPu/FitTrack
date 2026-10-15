import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { OnboardingForm } from "@/components/onboarding-form";
import { TzCookie } from "@/components/tz-cookie";

export default async function Page() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
  if (data?.onboarded) redirect("/");
  return (<><TzCookie /><OnboardingForm userId={user.id} /></>);
}
