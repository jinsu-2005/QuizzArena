import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "./server/**",
      "./scripts/**",
    ],
  },
};

export default nextConfig;
