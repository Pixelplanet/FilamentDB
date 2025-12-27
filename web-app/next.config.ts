import type { NextConfig } from "next";

// BUILD_MODE=server: For Docker deployment with API routes (standalone build)
// BUILD_MODE not set: For Capacitor/Android (static export, no API routes)
const isServer = process.env.BUILD_MODE === 'server';

const nextConfig: NextConfig = {
  output: isServer ? 'standalone' : 'export',
  images: {
    unoptimized: true
  },
  // For static export, exclude API routes directory to prevent build errors
  ...(isServer ? {} : {
    // Static export doesn't support API routes - the Android app uses external server URLs
    distDir: 'out'
  }),
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0'
  }
};

export default nextConfig;
