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
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true,
  },
  serverExternalPackages: ["fs", "path", "stream"],

  // Optional but useful for Docker/custom server setups
  output: "standalone",
}

export default nextConfig
