import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets other devices on the home network use `next dev` (e.g. testing on a
  // phone). Dev-only; production builds ignore it.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  reactCompiler: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
