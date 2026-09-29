import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "./server/**",
      "./scripts/**",
      "./**/*.mjs",
    ],
  },
};

export default nextConfig;
