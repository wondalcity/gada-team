import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gada/ui", "@gada/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // In production: INTERNAL_API_URL = https://gada-team-web-wondalcity-9533s-projects.vercel.app
        destination: process.env.INTERNAL_API_URL
          ? `${process.env.INTERNAL_API_URL}/api/:path*`
          : "http://localhost:3000/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
