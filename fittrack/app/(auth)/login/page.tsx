import { AuthForm } from "@/components/auth-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const notice = sp.error ? "That link has expired or was already used. Log in, or request a new one." : sp.deleted ? "Your account and data were deleted." : undefined;
  return <AuthForm mode="login" notice={notice} />;
}
