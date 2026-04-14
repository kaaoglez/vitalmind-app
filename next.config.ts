import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Neon PostgreSQL env vars are available to Prisma at build/runtime
  // even if a system-level DATABASE_URL (e.g., SQLite) exists
  env: {
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '',
    NEON_DIRECT_URL: process.env.NEON_DIRECT_URL || process.env.DIRECT_URL || '',
  },
};

export default nextConfig;
