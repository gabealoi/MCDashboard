import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["lh3.googleusercontent.com"], // For Google profile images
    unoptimized: true,
  },
  // Add this to support Server-Sent Events
  experimental: {
    serverComponentsExternalPackages: ["fs", "path", "stream"],
  },
}

export default nextConfig
