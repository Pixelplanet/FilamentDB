import type { NextConfig } from "next";

const isServer = process.env.BUILD_MODE === 'server';

const nextConfig: NextConfig = {
  output: isServer ? 'standalone' : 'export',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
