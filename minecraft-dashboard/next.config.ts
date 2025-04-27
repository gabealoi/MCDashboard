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
  serverExternalPackages: ["fs", "path", "stream"],
}

export default nextConfig
