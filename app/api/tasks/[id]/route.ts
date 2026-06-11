import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { runAgent, runJudge } from "@/lib/ai"
import { verifySuiTx } from "@/lib/sui/client"
import type { AgentCategory } from "@/lib/constants"

async function requireTxVerification(
  txDigest: string | undefined,
  expectedSender: string | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (!txDigest) {
    return { ok: false, error: "Missing txDigest" }
  }
  const verified = await verifySuiTx(txDigest, expectedSender)
  if (!verified.ok) {
    return { ok: false, error: `Transaction verification failed: ${verified.error}` }
  }
  return { ok: true }
}

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
  const { action, creatorAddress } = body

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Protected actions require a creator on the task AND a matching caller
  const actionsRequiringOwner = [
    "run_agent", "run_judge", "confirm_chain", "confirm_submission",
    "confirm_judge", "release", "dispute", "cancel",
  ]
  if (actionsRequiringOwner.includes(action)) {
    if (!task.creatorAddress) {
      return NextResponse.json(
        { error: "Task has no owner — cannot perform this action" },
        { status: 403 }
      )
    }
    if (!creatorAddress || task.creatorAddress !== creatorAddress) {
      return NextResponse.json(
        { error: "Not authorized to modify this task" },
        { status: 403 }
      )
    }
  }

  switch (action) {
    // ── run_agent: generate AI output, keep status RUNNING ──
    case "run_agent": {
      if (task.status !== "FUNDED" && task.status !== "RUNNING") {
        return NextResponse.json(
          { error: "Task must be FUNDED to run agent" },
          { status: 400 }
        )
      }

      const agent = await prisma.agent.findFirst({
        where: { category: task.agentCategory },
      })
      if (!agent) {
        return NextResponse.json(
          { error: "No agent available for this category" },
          { status: 400 }
        )
      }

      await prisma.task.update({
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

        const updated = await prisma.task.update({
          where: { id },
          data: { outputText, proofHash },
          include: { agent: true },
        })

        return NextResponse.json(updated)
      } catch (error) {
        await prisma.task.update({
          where: { id },
          data: { status: "FUNDED", agentId: null },
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

    // ── run_judge: generate judge output, keep status SUBMITTED ──
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
          judgeVerdict: result.verdict,
          judgeRecommendation: result.recommendation,
          judgeNotes: result.notes,
        },
        include: { agent: true },
      })

      return NextResponse.json(updated)
    }

    // ── confirm_submission: verify on-chain tx, then set SUBMITTED ──
    case "confirm_submission": {
      const { txDigest } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "SUBMITTED" },
        include: { agent: true },
      })
      return NextResponse.json(updated)
    }

    // ── confirm_judge: verify on-chain tx, then set JUDGE_REVIEWED ──
    case "confirm_judge": {
      const { txDigest } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "JUDGE_REVIEWED" },
        include: { agent: true },
      })
      return NextResponse.json(updated)
    }

    // ── confirm_chain: verify on-chain tx, then set FUNDED ──
    case "confirm_chain": {
      const { txDigest, suiTaskId } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "FUNDED", suiTaskId },
        include: { agent: true },
      })
      return NextResponse.json(updated)
    }

    // ── release: verify on-chain tx, then set RELEASED and pay agent ──
    case "release": {
      if (task.status !== "JUDGE_REVIEWED" && task.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Task not ready for release" },
          { status: 400 }
        )
      }
      const { txDigest } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

      const agentUpdate =
        task.agentId
          ? (async () => {
              const agent = await prisma.agent.findUnique({ where: { id: task.agentId! } })
              const currentEarned = agent ? BigInt(agent.totalEarnedMist) : BigInt(0)
              const rewardMistVal = BigInt(task.rewardMist)
              return prisma.agent.update({
                where: { id: task.agentId! },
                data: {
                  completedTasks: { increment: 1 },
                  totalEarnedMist: String(currentEarned + rewardMistVal),
                },
              })
            })()
          : Promise.resolve(null)

      const updated = await prisma.task.update({
        where: { id },
        data: { status: "RELEASED" },
        include: { agent: true },
      })
      await agentUpdate
      return NextResponse.json(updated)
    }

    // ── dispute: verify on-chain tx, then set DISPUTED ──
    case "dispute": {
      if (task.status !== "JUDGE_REVIEWED" && task.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Task not eligible for dispute" },
          { status: 400 }
        )
      }
      const { txDigest } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

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

    // ── cancel: verify on-chain tx, then set CANCELLED ──
    case "cancel": {
      if (task.status !== "FUNDED") {
        return NextResponse.json(
          { error: "Can only cancel unfunded tasks" },
          { status: 400 }
        )
      }
      const { txDigest } = body
      const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

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
