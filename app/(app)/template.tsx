/** Remounts on every navigation, which replays the short fade-in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
