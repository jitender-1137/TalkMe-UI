import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    allowedDevOrigins: ["localhost:3000", "10.221.83.139:3000", "0.0.0.0:3000"],
  },
  allowedDevOrigins: ["localhost:3000", "10.221.83.139:3000", "0.0.0.0:3000"],
}

export default nextConfig
