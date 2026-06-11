import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const creatorAddress = searchParams.get("creatorAddress")
  const tasks = await prisma.task.findMany({
    where: creatorAddress ? { creatorAddress } : undefined,
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  })
  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, agentCategory, rewardSui, creatorAddress } = body

  if (!title || !description || !agentCategory || rewardSui == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const rewardMist = String(BigInt(Math.floor(rewardSui * 1_000_000_000)))

  const task = await prisma.task.create({
    data: {
      title,
      description,
      agentCategory,
      rewardMist,
      creatorAddress: creatorAddress ?? null,
      status: "PENDING_CHAIN",
    },
  })

  return NextResponse.json(task, { status: 201 })
}
