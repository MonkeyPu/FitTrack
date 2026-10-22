import { AuthForm } from "@/components/auth-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string; confirm?: string }> }) {
  const sp = await searchParams;
  const notice = sp.error ? "That link has expired or was already used. Log in, or request a new one." : sp.deleted ? "Your account and data were deleted." : undefined;
  const info = sp.confirm ? "We sent you an email. Open the link in it to confirm your address, then come back to this app and log in here." : undefined;
  return <AuthForm mode="login" notice={notice} info={info} />;
}
