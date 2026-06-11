"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, X, Gavel, Wallet, Ban } from "lucide-react"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"
import { TaskStatus } from "@/lib/constants"

type Props = {
  taskId: string
  status: string
  suiTaskId: string | null
  escrowId: string | null
  agentId: string | null
  description: string
  agentCategory: string
  rewardSui: number
}

const CATEGORY_MAP: Record<string, number> = {
  MOVE_AUDIT: 0,
  RESEARCH_SUMMARY: 1,
  WALLET_ANALYSIS: 2,
}

const VERDICT_MAP: Record<string, number> = {
  PASS: 0,
  NEEDS_REVISION: 1,
  FAIL: 2,
}

const RECOMMENDATION_MAP: Record<string, number> = {
  APPROVE: 0,
  DISPUTE: 1,
}

function extractDigest(result: unknown): string {
  return (result as Record<string, unknown>).digest as string
    ?? ((result as Record<string, unknown>).Transaction as Record<string, unknown>)?.digest as string
    ?? ""
}

function extractTaskObjectId(result: unknown): string | null {
  const changes = (result as Record<string, unknown>).objectChanges as Array<Record<string, unknown>> | undefined
  if (!changes) return null
  const created = changes.find(
    (c) => c.type === "created" && String(c.objectType ?? "").includes("::marketplace::Task"),
  )
  return (created?.objectId as string) ?? null
}

export function TaskActions({
  taskId, status, suiTaskId, escrowId, agentId,
  description, agentCategory, rewardSui,
}: Props) {
  const router = useRouter()
  const { signAndExecute, isSigning, error, isConnected, address } = useSuiTransaction()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const callApi = async (action: string, body?: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, creatorAddress: address, ...body }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Action failed")
    }
    return res.json()
  }

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setActionLoading(label)
    setActionError(null)
    try {
      await fn()
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleFundEscrow = () => runAction("fund", async () => {
    const { createTaskTx, hashDescription } = await import("@/lib/sui/transactions")
    const rewardMist = BigInt(Math.floor(rewardSui * 1_000_000_000))
    const descHash = await hashDescription(description)
    const tx = createTaskTx(descHash, CATEGORY_MAP[agentCategory] ?? 2, rewardMist)
    const result = await signAndExecute(tx)
    if (!result) throw new Error("Transaction was not signed")
    await callApi("confirm_chain", {
      txDigest: extractDigest(result),
      suiTaskId: extractTaskObjectId(result),
    })
  })

  const handleRunAgent = () => runAction("run_agent", async () => {
    const task = await callApi("run_agent")
    const onChainAgentId = task.agent?.suiObjectId
    if (suiTaskId && onChainAgentId && task.proofHash) {
      const { assignAndSubmitTx, toBytes } = await import("@/lib/sui/transactions")
      const result = await signAndExecute(
        assignAndSubmitTx(suiTaskId, onChainAgentId, toBytes(task.proofHash)),
      )
      if (result) {
        await callApi("confirm_submission", { txDigest: extractDigest(result) })
      }
    }
  })

  const handleRunJudge = () => runAction("run_judge", async () => {
    const task = await callApi("run_judge")
    if (suiTaskId) {
      const { submitJudgeReportTx } = await import("@/lib/sui/transactions")
      const verdictU8 = VERDICT_MAP[task.judgeVerdict] ?? 0
      const recommendationU8 = RECOMMENDATION_MAP[task.judgeRecommendation] ?? 0
      const result = await signAndExecute(
        submitJudgeReportTx(suiTaskId, verdictU8, recommendationU8),
      )
      if (result) {
        await callApi("confirm_judge", { txDigest: extractDigest(result) })
      }
    }
  })

  const handleApprove = () => runAction("approve", async () => {
    const { approveAndReleaseTx } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      approveAndReleaseTx(suiTaskId ?? taskId, agentId ?? ""),
    )
    if (!result) throw new Error("Transaction was not signed")
    await callApi("release", { txDigest: extractDigest(result) })
  })

  const handleReject = () => runAction("reject", async () => {
    const { markDisputedTx } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      markDisputedTx(suiTaskId ?? taskId, agentId ?? ""),
    )
    if (!result) throw new Error("Transaction was not signed")
    await callApi("dispute", { txDigest: extractDigest(result) })
  })

  const handleCancel = () => runAction("cancel_tx", async () => {
    const { cancelTaskTx } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      cancelTaskTx(suiTaskId ?? taskId),
    )
    if (!result) throw new Error("Transaction was not signed")
    await callApi("cancel", { txDigest: extractDigest(result) })
  })

  const btn = (key: string) => actionLoading === key || isSigning

  if (!isConnected) {
    return (
      <div className="ts-detail-card">
        <h3>Actions</h3>
        <p style={{ color: "var(--fg-secondary)", fontSize: "14px", marginBottom: 12 }}>
          Connect your Sui wallet to perform on-chain actions.
        </p>
      </div>
    )
  }

  return (
    <div className="ts-detail-card">
      <h3>Actions</h3>

      {(actionError || error) && (
        <div style={{
          padding: "10px 14px", marginBottom: 12,
          border: "1px solid var(--status-red)",
          borderRadius: "var(--radius-md)",
          background: "var(--status-red-bg)",
          color: "var(--status-red)", fontSize: "13px",
        }}>
          {actionError ?? error}
          <button onClick={() => setActionError(null)} style={{
            marginLeft: 8, background: "none", border: "none",
            color: "var(--status-red)", cursor: "pointer", textDecoration: "underline",
          }}>Dismiss</button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {/* ── PENDING_CHAIN ── */}
        {status === TaskStatus.PENDING_CHAIN && (
          <>
            <button className="ts-button ts-button--primary" onClick={handleFundEscrow}
              disabled={btn("fund")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("fund") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Wallet size={14} /> Fund Escrow</>}
            </button>
            <button className="ts-button ts-button--secondary"
              disabled style={{ width: "100%", justifyContent: "center" }}>
              <Ban size={14} /> Cancel
            </button>
          </>
        )}

        {/* ── FUNDED ── */}
        {status === TaskStatus.FUNDED && (
          <>
            <button className="ts-button ts-button--primary" onClick={handleRunAgent}
              disabled={btn("run_agent")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("run_agent") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Run Agent"}
            </button>
            <button className="ts-button ts-button--secondary" onClick={handleCancel}
              disabled={btn("cancel_tx")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("cancel_tx") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Ban size={14} /> Cancel Task</>}
            </button>
          </>
        )}

        {/* ── RUNNING ── */}
        {status === TaskStatus.RUNNING && (
          <button className="ts-button ts-button--secondary" disabled
            style={{ width: "100%", justifyContent: "center" }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
            Processing...
          </button>
        )}

        {/* ── SUBMITTED ── */}
        {status === TaskStatus.SUBMITTED && (
          <>
            <button className="ts-button ts-button--primary" onClick={handleApprove}
              disabled={btn("approve")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("approve") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Check size={14} /> Approve & Release</>}
            </button>
            <button className="ts-button ts-button--secondary" onClick={handleRunJudge}
              disabled={btn("run_judge")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("run_judge") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Gavel size={14} /> Ask AI Judge</>}
            </button>
            <button className="ts-button ts-button--secondary" onClick={handleReject}
              disabled={btn("reject")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("reject") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><X size={14} /> Reject & Refund</>}
            </button>
          </>
        )}

        {/* ── JUDGE_REVIEWED ── */}
        {status === TaskStatus.JUDGE_REVIEWED && (
          <>
            <button className="ts-button ts-button--primary" onClick={handleApprove}
              disabled={btn("approve")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("approve") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Check size={14} /> Approve & Release</>}
            </button>
            <button className="ts-button ts-button--secondary" onClick={handleReject}
              disabled={btn("reject")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("reject") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><X size={14} /> Reject & Refund</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
