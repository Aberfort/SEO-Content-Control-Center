import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: ["@sccc/database", "@sccc/shared"]
};

export default nextConfig;
