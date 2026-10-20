/** Remounts on every navigation, which replays the short fade-in. It also spaces the page's blocks. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in space-y-5">{children}</div>;
}
