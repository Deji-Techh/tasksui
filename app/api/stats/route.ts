import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const [taskCount, agentCount, completedCount] = await Promise.all([
      prisma.task.count(),
      prisma.agent.count(),
      prisma.task.count({ where: { status: "RELEASED" } }),
    ])
    return NextResponse.json({ taskCount, agentCount, completedCount })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    )
  }
}
