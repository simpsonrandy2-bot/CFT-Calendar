import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const url = process.env.neon_DATABASE_URL || process.env.DATABASE_URL || "";

  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    // Production: PostgreSQL (Neon)
    const { Pool } = require("pg");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  } else {
    // Local dev: SQLite
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const path = require("path");
    const relativePath = url.replace(/^file:/, "") || "./dev.db";
    const absolutePath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(process.cwd(), relativePath);
    const adapter = new PrismaBetterSqlite3({ url: `file:${absolutePath}` });
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
