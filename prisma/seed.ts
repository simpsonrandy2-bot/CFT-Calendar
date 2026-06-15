import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const crew = ["Dan", "Randy", "Jon", "Ken", "Cody", "Mike", "Tyler"];
  for (const name of crew) {
    await prisma.crewMember.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seed completed");
}

main().catch(console.error).finally(() => prisma.$disconnect());
