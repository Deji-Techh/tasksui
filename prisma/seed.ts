import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { SEEDED_AGENTS } from "../lib/constants"

const databaseUrl = process.env["DATABASE_URL"]

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const adapter = new PrismaPg(databaseUrl)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Ensuring demo agents exist...")

  for (const agent of SEEDED_AGENTS) {
    await prisma.agent.upsert({
      where: { suiObjectId: agent.suiObjectId },
      update: {
        ownerAddress: agent.ownerAddress,
        name: agent.name,
        category: agent.category,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        avatarUrl: agent.avatarUrl,
      },
      create: {
        id: agent.id,
        suiObjectId: agent.suiObjectId,
        ownerAddress: agent.ownerAddress,
        name: agent.name,
        category: agent.category,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        avatarUrl: agent.avatarUrl,
        reputationScore: agent.reputationScore,
        completedTasks: agent.completedTasks,
        disputedTasks: agent.disputedTasks,
        totalEarnedMist: agent.totalEarnedMist,
      },
    })
  }

  console.log(`Seeded ${SEEDED_AGENTS.length} agents.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
