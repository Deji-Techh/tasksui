import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get("creatorAddress")
    const tasks = await prisma.task.findMany({
      where: creatorAddress ? { creatorAddress } : undefined,
      orderBy: { createdAt: "desc" },
      include: { agent: true },
    })
    return NextResponse.json(tasks)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch tasks" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, agentCategory, rewardSui, creatorAddress, agentId, inputText } = body

    if (!title || !description || !agentCategory || rewardSui == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }
    if (!creatorAddress) {
      return NextResponse.json(
        { error: "Wallet connection required to create a task" },
        { status: 400 },
      )
    }

    const rewardMist = String(BigInt(Math.floor(rewardSui * 1_000_000_000)))

    const inputHash = inputText
      ? crypto.createHash("sha256").update(inputText).digest("hex")
      : null

    const task = await prisma.task.create({
      data: {
        title,
        description,
        agentCategory,
        rewardMist,
        creatorAddress,
        status: "PENDING_CHAIN",
        agent: agentId ? { connect: { id: agentId } } : undefined,
        inputText: inputText ?? null,
        inputHash,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create task" },
      { status: 500 },
    )
  }
}
