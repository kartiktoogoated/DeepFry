import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(): Promise<void> {
 
  const logs = await prisma.validatorLog.findMany({
    include: {
      validator: {
        select: { id: true, location: true },
      },
    },
    orderBy: { timestamp: "desc" },
  });

  console.log("\nDetailed Validator Logs:");
  console.table(
    logs.map((l) => ({
      id:           l.id,
      validatorId:  l.validatorId,
      region:       l.validator.location,
      site:         l.site,
      status:       l.status,
      timestamp:    l.timestamp.toISOString(),
    }))
  );

  
  const byValidator = logs.reduce<Record<number, { validatorId: number; region: string; up: number; down: number }>>((acc, l) => {
    const key = l.validatorId;
    if (!acc[key]) {
      acc[key] = { validatorId: key, region: l.validator.location, up: 0, down: 0 };
    }
    if (l.status === "UP") acc[key].up++;
    else acc[key].down++;
    return acc;
  }, {});

  console.log("\nSummary by Validator:");
  console.table(Object.values(byValidator));


  const byRegion = logs.reduce<Record<string, { region: string; up: number; down: number }>>((acc, l) => {
    const loc = l.validator.location;
    if (!acc[loc]) {
      acc[loc] = { region: loc, up: 0, down: 0 };
    }
    if (l.status === "UP") acc[loc].up++;
    else acc[loc].down++;
    return acc;
  }, {});

  console.log("\nSummary by Region:");
  console.table(Object.values(byRegion));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});