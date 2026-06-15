import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["lung-superior-mardi.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok-free.dev"],
  serverExternalPackages: ["pg", "better-sqlite3", "@prisma/adapter-pg", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
