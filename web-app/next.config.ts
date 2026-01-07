import type { NextConfig } from "next";

// BUILD_MODE=server: For Docker deployment with API routes (standalone build)
// BUILD_MODE not set: For Capacitor/Android (static export, no API routes)
const isServer = process.env.BUILD_MODE === 'server';
console.log('Next Config - BUILD_MODE:', process.env.BUILD_MODE, 'isServer:', isServer);

const nextConfig: NextConfig = {
  output: isServer ? 'standalone' : 'export',
  images: {
    unoptimized: true
  },
  // For static export, exclude API routes directory to prevent build errors
  ...(isServer ? {} : {
    // Static export doesn't support API routes - the Android app uses external server URLs
    distDir: 'out',
    // Exclude 'ts' files to ignore route.ts (API routes) during static export
    // Frontend pages are 'tsx', so they will still be built
    pageExtensions: ['tsx', 'mdx']
  }),
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
    NEXT_PUBLIC_BUILD_MODE: process.env.BUILD_MODE || 'unknown'
  }
};

export default nextConfig;
