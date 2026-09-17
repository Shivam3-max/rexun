import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  experimental: { optimizePackageImports: [] },
};

export default nextConfig;
