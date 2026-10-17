/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Reuse already-loaded pages for a short while so going back to a tab is instant.
  // Saving anything clears this cache, so your own changes always show right away.
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
