import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Logo } from "@/components/logo";
import { NoZoom } from "@/components/no-zoom";
import { SplashHide } from "@/components/splash-hide";
import { accentVars, isHex6 } from "@/lib/accent";

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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [{ color: "#0a0a0b" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = store.get("theme")?.value === "light" ? "light" : "dark";
  const accent = store.get("accent")?.value;
  const vars = isHex6(accent) ? accentVars(accent) : null;
  return (
    <html lang="en" className={theme === "light" ? "light" : ""} style={vars ? ({ "--accent": vars.accent, "--accentfg": vars.accentfg } as React.CSSProperties) : undefined}>
      <body className="min-h-dvh antialiased">
        <div id="splash" className="splash" aria-hidden><Logo className="h-20 w-20 animate-spin" /></div>
        <SplashHide />
        <NoZoom />
        {children}
      </body>
    </html>
  );
}
