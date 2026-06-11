import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { runAgent, runJudge } from "@/lib/ai"
import type { AgentCategory } from "@/lib/constants"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: { agent: true },
  })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }
  return NextResponse.json(task)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { action } = body

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  switch (action) {
    case "run_agent": {
      const agent = await prisma.agent.findFirst({
        where: { category: task.agentCategory },
      })
      if (!agent) {
        return NextResponse.json(
          { error: "No agent available for this category" },
          { status: 400 }
        )
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "RUNNING", agentId: agent.id },
      })

      try {
        const outputText = await runAgent(
          agent.category as AgentCategory,
          agent.systemPrompt,
          task.description
        )

        const proofHash =
          "0x" +
          Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(outputText)
              )
            )
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")

        const completed = await prisma.task.update({
          where: { id },
          data: {
            status: "SUBMITTED",
            outputText,
            proofHash,
          },
          include: { agent: true },
        })

        return NextResponse.json(completed)
      } catch (error) {
        await prisma.task.update({
          where: { id },
          data: { status: "PENDING_CHAIN" },
        })
        return NextResponse.json(
          {
            error: "Agent run failed",
            detail: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        )
      }
    }

    case "run_judge": {
      if (!task.outputText) {
        return NextResponse.json(
          { error: "Task has no agent output to review" },
          { status: 400 }
        )
      }

      const result = await runJudge(task.description, task.outputText)

      const updated = await prisma.task.update({
        where: { id },
        data: {
          status: "JUDGE_REVIEWED",
          judgeVerdict: result.verdict,
          judgeRecommendation: result.recommendation,
          judgeNotes: result.notes,
        },
        include: { agent: true },
      })

      return NextResponse.json(updated)
    }

    case "confirm_chain": {
      const { escrowId, suiTaskId } = body
      const updated = await prisma.task.update({
        where: { id },
        data: {
          status: "FUNDED",
          escrowId,
          suiTaskId,
        },
        include: { agent: true },
      })
      return NextResponse.json(updated)
    }

    case "release": {
      if (task.status !== "JUDGE_REVIEWED" && task.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Task not ready for release" },
          { status: 400 }
        )
      }
      const agentUpdate =
        task.agentId
          ? prisma.agent.update({
              where: { id: task.agentId },
              data: {
                completedTasks: { increment: 1 },
                totalEarnedMist: String(
                  BigInt(
                    Math.floor(task.rewardSui * 1_000_000_000)
                  ),
                ),
              },
            })
          : Promise.resolve(null)

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "RELEASED" },
        include: { agent: true },
      })
      await agentUpdate
      return NextResponse.json(updated)
    }

    case "dispute": {
      if (task.status !== "JUDGE_REVIEWED" && task.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Task not eligible for dispute" },
          { status: 400 }
        )
      }
      const agentUpdate =
        task.agentId
          ? prisma.agent.update({
              where: { id: task.agentId },
              data: { disputedTasks: { increment: 1 } },
            })
          : Promise.resolve(null)

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "DISPUTED" },
        include: { agent: true },
      })
      await agentUpdate
      return NextResponse.json(updated)
    }

    case "cancel": {
      if (task.status === "RELEASED") {
        return NextResponse.json(
          { error: "Cannot cancel a released task" },
          { status: 400 }
        )
      }
      const updated = await prisma.task.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { agent: true },
      })
      return NextResponse.json(updated)
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      )
  }
}
