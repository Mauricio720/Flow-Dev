import type { NextConfig } from "next";

const DEFAULT_DIST_DIR = ".next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.FLOW_DEV_NEXT_DIST_DIR || DEFAULT_DIST_DIR,
};

export default nextConfig;
