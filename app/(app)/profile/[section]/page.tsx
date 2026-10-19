import Link from "next/link";
import { notFound } from "next/navigation";
import { AppearanceForm } from "@/components/appearance-form";
import { PageHeader } from "@/components/page-header";
import { AccountForm, BodyStatsForm, DangerZone, GoalForm, LoginForm, NutrientGoalsForm, PrivacyForm, TargetsForm } from "@/components/settings-forms";
import { Card, Section } from "@/components/ui/card";
import { requireProfile } from "@/lib/data";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

export const metadata = { title: "Settings" };

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = SETTINGS_SECTIONS.find((s) => s.slug === section);
  if (!meta) notFound();
  const { user, profile } = await requireProfile();

  return (
    <>
      <PageHeader title={meta.title} back="/profile" />
      {section === "account" && (<>
        <Card><AccountForm profile={profile} /></Card>
        <Section title="Email and password"><Card><LoginForm email={user.email ?? ""} /></Card></Section>
      </>)}
      {section === "targets" && <Card><TargetsForm profile={profile} /></Card>}
      {section === "nutrient-goals" && <Card><NutrientGoalsForm profile={profile} /></Card>}
      {section === "body" && <Card><BodyStatsForm profile={profile} /></Card>}
      {section === "goal" && <Card><GoalForm profile={profile} /></Card>}
      {section === "privacy" && (
        <Card className="space-y-4">
          <PrivacyForm profile={profile} />
          <Link href="/friends" className="flex h-12 items-center justify-center rounded-xl border border-line bg-card2 font-semibold">Manage friends</Link>
        </Card>
      )}
      {section === "appearance" && <Card><AppearanceForm profile={profile} /></Card>}
      {section === "data" && <Card><DangerZone /></Card>}
    </>
  );
}
