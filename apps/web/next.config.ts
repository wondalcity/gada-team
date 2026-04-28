import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gada/shared-types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.INTERNAL_API_URL
            ? `${process.env.INTERNAL_API_URL}/:path*`
            : "http://localhost:8090/api/:path*",
      },
    ];
  },
};

export default nextConfig;
