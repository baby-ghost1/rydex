import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// `next dev` / `next build` run with the frontend workspace as the cwd.
// The monorepo root is one level up, and it is also where the shared .env lives.
const projectRoot = process.cwd();
const monorepoRoot =
  path.basename(projectRoot) === "frontend" ? path.dirname(projectRoot) : projectRoot;

// Next.js only loads .env files from the Next.js project root (frontend/).
// Load the repository-level .env explicitly so API routes, Auth.js and the
// NEXT_PUBLIC_* inlining step all see the same configuration.
// forceReload is required because Next has already called loadEnvConfig for
// frontend/ by the time this config file is evaluated.
loadEnvConfig(
  monorepoRoot,
  process.env.NODE_ENV !== "production",
  console,
  true,
);

const nextConfig: NextConfig = {
  // Turbopack must be allowed to read backend/ and shared/ from the monorepo.
  // Disabled for now due to monorepo resolution issues - using webpack instead
  // turbopack: {
  //   root: monorepoRoot,
  // },
  // Include the workspace packages in the standalone/serverless output trace.
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@rydex/backend", "@rydex/shared"],
  images: {
    // AVIF first - noticeably smaller hero/vehicle images than webp alone.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Do not advertise the framework via the X-Powered-By header.
  poweredByHeader: false,
  serverExternalPackages: ["cloudinary", "nodemailer", "razorpay"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
