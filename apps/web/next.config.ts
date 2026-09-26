import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runtime image runs `node server.js` from the standalone
  // output — see apps/web/Dockerfile.
  output: "standalone",
  // @portfolio/ui ships TS/TSX source only (no build step — it's only
  // ever consumed by this one Next app), so Next transpiles it directly
  // instead of requiring a separate tsc watch/build.
  transpilePackages: ["@portfolio/ui"],
};

export default nextConfig;
