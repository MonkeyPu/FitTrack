import Link from "next/link";
import { Library, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { AccountForm, DangerZone, GoalForm, LoginForm, PreferencesForm, PrivacyForm, TargetsForm } from "@/components/settings-forms";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { requireProfile } from "@/lib/data";

export const metadata = { title: "Profile" };

export default async function Page() {
  const { user, profile } = await requireProfile();
  return (
    <>
      <PageHeader title="Profile" />
      <p className="-mt-2 px-1 text-muted">{profile.display_name} · @{profile.username}</p>

      <Link href="/library/foods" className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 font-medium"><Library className="h-5 w-5 text-accent" />Saved foods and meals</Link>

      <Section title="Nutrition targets"><Card><TargetsForm profile={profile} /></Card></Section>
      <Section title="Goal"><Card><GoalForm profile={profile} /></Card></Section>
      <Section title="Account"><Card><AccountForm profile={profile} /></Card></Section>
      <Section title="Email and password"><Card><LoginForm email={user.email ?? ""} /></Card></Section>
      <Section title="Privacy and friends"><Card className="space-y-4"><PrivacyForm profile={profile} /><Link href="/friends" className="flex h-12 items-center justify-center rounded-xl border border-line bg-card2 font-semibold">Manage friends</Link></Card></Section>
      <Section title="Preferences"><Card><PreferencesForm profile={profile} /></Card></Section>
      <Section title="Your data"><Card><DangerZone /></Card></Section>
      <form action={signOut}><Button type="submit" variant="secondary" className="w-full"><LogOut className="h-4 w-4" />Log out</Button></form>
    </>
  );
}
