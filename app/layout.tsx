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
  appleWebApp: {
    capable: true,
    title: "FitTrack",
    statusBarStyle: "black-translucent",
    // Shown by iOS the instant the app is opened from the Home Screen, before anything loads.
    startupImage: [
      { url: "/splash/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1260x2736.png", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2208.png", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
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
