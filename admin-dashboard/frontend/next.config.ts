import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base path for when admin UI is served via proxy
  basePath: "/admin-ui",
  // Asset prefix to ensure static files are loaded correctly
  assetPrefix: "/admin-ui",
  // Allow trailing slashes for consistent routing
  trailingSlash: false,
};

export default nextConfig;
