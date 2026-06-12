import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const crew = ["Dan", "Randy", "Jon", "Ken", "Cody", "Mike", "Tyler"];
  for (const name of crew) {
    await prisma.crewMember.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.job.upsert({
    where: { id: "sample-job-1" },
    update: {},
    create: {
      id: "sample-job-1",
      jobNumber: "25-674",
      title: 'Precast 55,650 sf 1/2" LR 2500',
      customer: "Stubbe's Precast Commercial Ltd.",
      jobType: "Precast",
      address: "123 Industrial Rd, Hamilton, ON",
      jobLead: "Dan",
      siteContact: "Bob Smith 905-555-1234",
      startDate: new Date("2026-06-15"),
      endDate: new Date("2026-06-17"),
      startTime: "06:00",
      description: "Main floor: 40,000 sf @ 1/2\"\nMezzanine: 15,650 sf @ 1/2\"\n\nSpecial instructions: Use LR 2500 mix only.",
      colorTag: "#3B82F6",
    },
  });

  console.log("Seed completed");
}

main().catch(console.error).finally(() => prisma.$disconnect());
