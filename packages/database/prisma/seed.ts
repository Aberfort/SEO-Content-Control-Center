import { planLimits } from "@sccc/shared";

import { prisma } from "../src/client";

const plans = [
  { code: "TRIAL", name: "Trial", monthlyPrice: 0 },
  { code: "STARTER", name: "Starter", monthlyPrice: 4900 },
  { code: "PRO", name: "Pro", monthlyPrice: 14900 },
  { code: "AGENCY", name: "Agency", monthlyPrice: 39900 },
  { code: "ENTERPRISE", name: "Enterprise", monthlyPrice: 0 }
] as const;

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        limits: planLimits[plan.code],
        isActive: true
      },
      create: {
        code: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        limits: planLimits[plan.code],
        isActive: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
