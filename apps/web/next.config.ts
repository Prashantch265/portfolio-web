import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runtime image runs `node server.js` from the standalone
  // output — see apps/web/Dockerfile.
  output: "standalone",
  // @portfolio/ui, @portfolio/diagram, and @portfolio/command-palette
  // ship TS/TSX source only (no build step — they're only ever consumed
  // by this one Next app), so Next transpiles them directly instead of
  // requiring a separate tsc watch/build.
  transpilePackages: ["@portfolio/ui", "@portfolio/diagram", "@portfolio/command-palette"],
};

export default nextConfig;
