import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const [taskCount, agentCount, completedCount, recentVerified] = await Promise.all([
      prisma.task.count(),
      prisma.agent.count(),
      prisma.task.count({ where: { status: "RELEASED" } }),
      prisma.task.findMany({
        where: { status: "RELEASED" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          rewardMist: true,
          agent: { select: { name: true, suiObjectId: true } },
        },
      }),
    ])
    return NextResponse.json({ taskCount, agentCount, completedCount, recentVerified })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    )
  }
}
