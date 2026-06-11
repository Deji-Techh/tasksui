import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  })
  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, agentCategory, rewardSui } = body

  if (!title || !description || !agentCategory || rewardSui == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      agentCategory,
      rewardSui,
      status: "PENDING_CHAIN",
    },
  })

  return NextResponse.json(task, { status: 201 })
}
