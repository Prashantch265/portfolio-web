import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runtime image runs `node server.js` from the standalone
  // output — see apps/web/Dockerfile.
  output: "standalone",
};

export default nextConfig;
