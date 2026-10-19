import Link from "next/link";
import { ChevronRight, Library, Users, type LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Avatar } from "@/components/avatar";
import { requireProfile } from "@/lib/data";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

export const metadata = { title: "Profile" };

function Row({ href, icon: Icon, title, sub }: { href: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 transition active:bg-card2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="block truncate text-sm text-muted">{sub}</span></span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}

const Group = ({ children }: { children: React.ReactNode }) => (
  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
);

export default async function Page() {
  const { profile } = await requireProfile();
  return (
    <>
      <Link href="/profile/account" className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition active:bg-card2">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={56} />
        <span className="min-w-0 flex-1"><span className="block truncate text-lg font-semibold">{profile.display_name}</span><span className="block truncate text-muted">@{profile.username}</span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Link>

      <Group>{SETTINGS_SECTIONS.map((s) => <Row key={s.slug} href={`/profile/${s.slug}`} icon={s.icon} title={s.title} sub={s.sub} />)}</Group>

      <Group>
        <Row href="/library/foods" icon={Library} title="Saved foods and meals" sub="Foods and meals you log often" />
        <Row href="/friends" icon={Users} title="Friends" sub="Requests and your friends list" />
      </Group>

      <LogoutButton />
    </>
  );
}
