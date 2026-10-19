import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Checks sign-in and onboarding on the server, then hands the app to the client shell,
  // which keeps your data on the phone so switching tabs doesn't wait for the network.
  const { user, profile } = await requireProfile();
  return <AppShell userId={user.id} profile={profile}>{children}</AppShell>;
}
