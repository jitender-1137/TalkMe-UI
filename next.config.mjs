import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validateApiUrl = () => {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-export"
  const apiUrl = process.env.API_URL
  if (!apiUrl) {
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error(
        "FATAL ERROR: The API_URL environment variable is not defined. " +
        "You must set API_URL in your production environment (e.g. API_URL=https://api.yourdomain.com/api/v1)."
      )
    } else {
      console.warn(
        "WARNING: API_URL environment variable is not defined. " +
        "Defaulting to http://localhost:8080/api/v1 for local development."
      )
    }
  } else {
    try {
      new URL(apiUrl)
    } catch (e) {
      if (!isBuildPhase) {
        throw new Error(
          `FATAL ERROR: The API_URL environment variable is invalid: "${apiUrl}". ` +
          "It must be a valid absolute URL (e.g., http://localhost:8080/api/v1)."
        )
      } else {
        console.warn(`WARNING: Invalid API_URL during build phase: "${apiUrl}"`)
      }
    }
  }
}

// Run validation at startup
validateApiUrl()

const getBackendBaseUrl = () => {
  const apiUrl = process.env.API_URL || "http://localhost:8080/api/v1"
  try {
    const url = new URL(apiUrl)
    const pathSegments = url.pathname.split("/").filter(Boolean)
    if (pathSegments.length > 0) {
      pathSegments.pop()
    }
    url.pathname = "/" + pathSegments.join("/")
    return url.toString().replace(/\/$/, "")
  } catch (e) {
    return "http://localhost:8080/api"
  }
}

const getApiPath = () => {
  const apiUrl = process.env.API_URL || "http://localhost:8080/api/v1"
  try {
    const url = new URL(apiUrl)
    return url.pathname.replace(/\/$/, "")
  } catch (e) {
    return "/api/v1"
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["*"],
  env: {
    NEXT_PUBLIC_API_PATH: getApiPath(),
    NEXT_PUBLIC_API_URL: process.env.API_URL || "http://localhost:8080/api/v1",
  },
  async rewrites() {
    if (process.env.STATIC_EXPORT === 'true') {
      return []
    }
    const backendBaseUrl = getBackendBaseUrl()
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig;
