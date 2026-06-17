import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { runAgent, runJudge } from "@/lib/ai"
import { decryptDeliverable, encryptDeliverable } from "@/lib/deliverables"
import { verifySuiTx } from "@/lib/sui/client"
import type { AgentCategory } from "@/lib/constants"

async function requireTxVerification(
  txDigest: string | undefined,
  expectedSender: string | undefined,
  expected?: Parameters<typeof verifySuiTx>[2],
): Promise<{ ok: boolean; error?: string }> {
  if (!txDigest) {
    return { ok: false, error: "Missing txDigest" }
  }
  const verified = await verifySuiTx(txDigest, expectedSender, expected)
  if (!verified.ok) {
    return { ok: false, error: `Transaction verification failed: ${verified.error}` }
  }
  return { ok: true }
}

function logTx(taskId: string, txDigest: string, action: string, objectId?: string) {
  return prisma.transactionLog.create({
    data: { taskId, txDigest, action, objectId, status: "SUCCESS" },
  })
}

function mapVerdictToScore(verdict: string): number {
  if (verdict === "PASS") return 100
  if (verdict === "NEEDS_REVISION") return 50
  return 0
}

function requireSuiTaskId(task: { suiTaskId: string | null }) {
  if (!task.suiTaskId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Missing Sui task object ID on task" },
        { status: 400 },
      ),
    }
  }
  return { ok: true as const, suiTaskId: task.suiTaskId }
}

function redactDeliverable<T extends {
  status: string
  outputText?: string | null
  result?: {
    fullOutput?: string | null
    encryptedPayload?: string | null
    encryptionIv?: string | null
    encryptionTag?: string | null
  } | null
} | null>(task: T): T {
  if (!task) return task
  if (task.status === "RELEASED") {
    return {
      ...task,
      outputText: task.outputText && task.result?.fullOutput ? task.outputText : null,
      result: task.result
        ? {
            ...task.result,
            encryptedPayload: null,
            encryptionIv: null,
            encryptionTag: null,
          }
        : task.result,
    }
  }
  return {
    ...task,
    outputText: null,
    result: task.result
      ? {
          ...task.result,
          fullOutput:
            "Full deliverable is locked until escrow is released. Review the summary, proof hash, and AI judge recommendation before approving.",
          encryptedPayload: null,
          encryptionIv: null,
          encryptionTag: null,
        }
      : task.result,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id },
      include: { agent: true, result: true, judgeReport: true },
    })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    return NextResponse.json(redactDeliverable(task))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch task" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      "confirm_judge", "release", "dispute", "cancel", "discard",
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
      // ── run_agent: generate AI output, store in TaskResult ──
      case "run_agent": {
        if (task.status !== "FUNDED" && task.status !== "RUNNING") {
          return NextResponse.json(
            { error: "Task must be FUNDED to run agent" },
            { status: 400 }
          )
        }

        const existingResult = await prisma.taskResult.findUnique({
          where: { taskId: id },
        })
        if (task.status === "RUNNING" && existingResult?.resultHash) {
          const updated = await prisma.task.findUnique({
            where: { id },
            include: { agent: true, result: true },
          })
          return NextResponse.json(redactDeliverable(updated))
        }

        const agent = task.agentId
          ? await prisma.agent.findUnique({ where: { id: task.agentId } })
          : await prisma.agent.findFirst({ where: { category: task.agentCategory } })
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
          const fullOutput = await runAgent(
            agent.category as AgentCategory,
            agent.systemPrompt,
            task.description
          )

          const deliverable = await encryptDeliverable(task, fullOutput)

          await prisma.taskResult.upsert({
            where: { taskId: id },
            update: {
              agentId: agent.id,
              fullOutput: null,
              summary: deliverable.summary,
              resultHash: deliverable.resultHash,
              encryptedPayload: deliverable.encryptedPayload,
              encryptionIv: deliverable.encryptionIv,
              encryptionTag: deliverable.encryptionTag,
              encryptionAlg: deliverable.encryptionAlg,
              storageProvider: deliverable.storageProvider,
              walrusBlobId: deliverable.walrusBlobId,
              walrusObjectId: deliverable.walrusObjectId,
              walrusEndEpoch: deliverable.walrusEndEpoch,
              sealPolicyId: deliverable.sealPolicyId,
              encryptedSize: deliverable.encryptedSize,
            },
            create: {
              taskId: id,
              agentId: agent.id,
              fullOutput: null,
              summary: deliverable.summary,
              resultHash: deliverable.resultHash,
              encryptedPayload: deliverable.encryptedPayload,
              encryptionIv: deliverable.encryptionIv,
              encryptionTag: deliverable.encryptionTag,
              encryptionAlg: deliverable.encryptionAlg,
              storageProvider: deliverable.storageProvider,
              walrusBlobId: deliverable.walrusBlobId,
              walrusObjectId: deliverable.walrusObjectId,
              walrusEndEpoch: deliverable.walrusEndEpoch,
              sealPolicyId: deliverable.sealPolicyId,
              encryptedSize: deliverable.encryptedSize,
            },
          })

          await prisma.task.update({
            where: { id },
            data: { outputText: null, proofHash: deliverable.resultHash },
          })

          const updated = await prisma.task.findUnique({
            where: { id },
            include: { agent: true, result: true },
          })

          return NextResponse.json(redactDeliverable(updated))
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

      // ── run_judge: evaluate agent output, store in JudgeReport ──
      case "run_judge": {
        const result = await prisma.taskResult.findUnique({ where: { taskId: id } })
        if (!result?.fullOutput && !result?.encryptedPayload && !result?.walrusBlobId) {
          return NextResponse.json(
            { error: "Task has no agent output to review" },
            { status: 400 }
          )
        }

        const fullOutput = await decryptDeliverable(task, result)
        const judgeResult = await runJudge(task.description, fullOutput)

        const reportHash = crypto
          .createHash("sha256")
          .update(JSON.stringify({ verdict: judgeResult.verdict, recommendation: judgeResult.recommendation, notes: judgeResult.notes }))
          .digest("hex")

        const score = mapVerdictToScore(judgeResult.verdict)

        await prisma.judgeReport.upsert({
          where: { taskId: id },
          update: {
            verdict: judgeResult.verdict,
            score,
            reason: judgeResult.notes,
            recommendation: judgeResult.recommendation,
            reportHash,
          },
          create: {
            taskId: id,
            verdict: judgeResult.verdict,
            score,
            reason: judgeResult.notes,
            recommendation: judgeResult.recommendation,
            reportHash,
          },
        })

        await prisma.task.update({
          where: { id },
          data: {
            judgeVerdict: judgeResult.verdict,
            judgeRecommendation: judgeResult.recommendation,
            judgeNotes: judgeResult.notes,
          },
        })

        const updated = await prisma.task.findUnique({
          where: { id },
          include: { agent: true, result: true, judgeReport: true },
        })

        return NextResponse.json(redactDeliverable(updated))
      }

      // ── confirm_submission: verify on-chain tx, then set SUBMITTED ──
      case "confirm_submission": {
        const { txDigest } = body
        const taskObject = requireSuiTaskId(task)
        if (!taskObject.ok) return taskObject.response
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "confirm_submission",
          suiTaskId: taskObject.suiTaskId,
        })
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

        const [, updated] = await Promise.all([
          prisma.taskResult.update({
            where: { taskId: id },
            data: { submitTxDigest: txDigest },
          }),
          prisma.task.update({
            where: { id },
            data: { status: "SUBMITTED" },
            include: { agent: true, result: true, judgeReport: true },
          }),
          logTx(id, txDigest, "submit_completion"),
        ])

        return NextResponse.json(redactDeliverable(updated))
      }

      // ── confirm_judge: verify on-chain tx, then set JUDGE_REVIEWED ──
      case "confirm_judge": {
        const { txDigest } = body
        const taskObject = requireSuiTaskId(task)
        if (!taskObject.ok) return taskObject.response
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "confirm_judge",
          suiTaskId: taskObject.suiTaskId,
        })
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

        const [, updated] = await Promise.all([
          prisma.judgeReport.update({
            where: { taskId: id },
            data: { txDigest },
          }),
          prisma.task.update({
            where: { id },
            data: { status: "JUDGE_REVIEWED" },
            include: { agent: true, result: true, judgeReport: true },
          }),
          logTx(id, txDigest, "submit_judge_report"),
        ])

        return NextResponse.json(redactDeliverable(updated))
      }

      // ── confirm_chain: verify on-chain tx, then set FUNDED ──
      case "confirm_chain": {
        const { txDigest, suiTaskId } = body
        if (!suiTaskId) {
          return NextResponse.json({ error: "Missing Sui task object ID" }, { status: 400 })
        }
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "confirm_chain",
          suiTaskId,
        })
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

        const updated = await prisma.task.update({
          where: { id },
          data: { status: "FUNDED", suiTaskId, createTxDigest: txDigest },
          include: { agent: true },
        })

        await logTx(id, txDigest, "create_task", suiTaskId)

        return NextResponse.json(redactDeliverable(updated))
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
        const taskObject = requireSuiTaskId(task)
        if (!taskObject.ok) return taskObject.response
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "release",
          suiTaskId: taskObject.suiTaskId,
        })
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

        const [, updated] = await Promise.all([
          logTx(id, txDigest, "approve_and_release"),
          prisma.task.update({
            where: { id },
            data: { status: "RELEASED", releaseTxDigest: txDigest },
            include: { agent: true, result: true, judgeReport: true },
          }),
        ])
        await agentUpdate
        return NextResponse.json(redactDeliverable(updated))
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
        const taskObject = requireSuiTaskId(task)
        if (!taskObject.ok) return taskObject.response
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "dispute",
          suiTaskId: taskObject.suiTaskId,
        })
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

        const agentUpdate =
          task.agentId
            ? prisma.agent.update({
                where: { id: task.agentId },
                data: { disputedTasks: { increment: 1 } },
              })
            : Promise.resolve(null)

        const [, updated] = await Promise.all([
          logTx(id, txDigest, "mark_disputed"),
          prisma.task.update({
            where: { id },
            data: { status: "DISPUTED" },
            include: { agent: true, result: true, judgeReport: true },
          }),
        ])
        await agentUpdate
        return NextResponse.json(redactDeliverable(updated))
      }

      // ── discard: delete a PENDING_CHAIN task (not on-chain yet) ──
      case "discard": {
        if (task.status !== "PENDING_CHAIN") {
          return NextResponse.json(
            { error: "Only pending tasks can be discarded" },
            { status: 400 },
          )
        }
        await prisma.task.delete({ where: { id } })
        return NextResponse.json({ ok: true })
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
        const taskObject = requireSuiTaskId(task)
        if (!taskObject.ok) return taskObject.response
        const v = await requireTxVerification(txDigest, task.creatorAddress ?? undefined, {
          action: "cancel",
          suiTaskId: taskObject.suiTaskId,
        })
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

        const updated = await prisma.task.update({
          where: { id },
          data: { status: "CANCELLED", cancelTxDigest: txDigest },
          include: { agent: true, result: true, judgeReport: true },
        })

        await logTx(id, txDigest, "cancel_task")

        return NextResponse.json(redactDeliverable(updated))
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 },
    )
  }
}
