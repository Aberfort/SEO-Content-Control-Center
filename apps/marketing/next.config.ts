import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: ["@sccc/shared"]
};

export default nextConfig;
