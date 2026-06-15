import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["lung-superior-mardi.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok-free.dev"],
  serverExternalPackages: ["pg", "better-sqlite3", "@prisma/adapter-pg", "@prisma/adapter-better-sqlite3"],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        "pg",
        "pg-native",
        "@prisma/adapter-pg",
        "better-sqlite3",
        "@prisma/adapter-better-sqlite3",
      ];
    }
    return config;
  },
};

export default nextConfig;
