import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FitTrack", template: "%s · FitTrack" },
  description: "Track calories, protein and cardio with your friends.",
  appleWebApp: { capable: true, title: "FitTrack", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ color: "#0a0a0b" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" className={theme === "light" ? "light" : ""}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
