"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, X, Gavel, Wallet, Ban, Plus, ExternalLink, ArrowRight, Trash2 } from "lucide-react"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"
import { TaskStatus } from "@/lib/constants"

type Props = {
  taskId: string
  status: string
  suiTaskId: string | null
  escrowId: string | null
  agentSuiObjectId: string | null
  description: string
  agentCategory: string
  rewardSui: number
  proofHash?: string | null
  judgeVerdict?: string | null
  judgeRecommendation?: string | null
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

async function fetchCreatedTaskObjectId(digest: string): Promise<string | null> {
  const network = process.env["NEXT_PUBLIC_SUI_NETWORK"] === "mainnet" ? "mainnet" : "testnet"
  const rpcUrl =
    network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443"

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sui_getTransactionBlock",
      params: [
        digest,
        {
          showObjectChanges: true,
        },
      ],
    }),
  })
  const data = await response.json()
  return extractTaskObjectId(data.result)
}

export function TaskActions({
  taskId, status, suiTaskId, escrowId, agentSuiObjectId,
  description, agentCategory, rewardSui, proofHash, judgeVerdict, judgeRecommendation,
  agentDbId,
}: Props & { agentDbId?: string | null }) {
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
    const txDigest = extractDigest(result)
    await callApi("confirm_chain", {
      txDigest,
      suiTaskId: extractTaskObjectId(result) ?? await fetchCreatedTaskObjectId(txDigest),
    })
  })

  const submitProofOnChain = async (hash: string, onChainAgentId: string) => {
    if (!suiTaskId) {
      throw new Error("Missing on-chain task ID — task must be funded first")
    }
    const { assignAndSubmitTx, toBytes } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      assignAndSubmitTx(suiTaskId, onChainAgentId, toBytes(hash)),
    )
    if (!result) {
      throw new Error("Transaction was not signed or failed")
    }
    await callApi("confirm_submission", { txDigest: extractDigest(result) })
  }

  const handleRunAgent = () => runAction("run_agent", async () => {
    const task = await callApi("run_agent")
    const onChainAgentId = task.agent?.suiObjectId
    if (!onChainAgentId) {
      throw new Error("No on-chain agent available for this category")
    }
    const hash = task.proofHash ?? task.result?.resultHash
    if (!hash) {
      throw new Error("Agent output exists but no proof hash was returned")
    }
    await submitProofOnChain(hash, onChainAgentId)
  })

  const handleSubmitExistingProof = () => runAction("submit_existing_proof", async () => {
    if (!agentSuiObjectId) {
      throw new Error("No on-chain agent is assigned to this task")
    }
    if (!proofHash) {
      throw new Error("No proof hash is available for this task")
    }
    await submitProofOnChain(proofHash, agentSuiObjectId)
  })

  const handleRunJudge = () => runAction("run_judge", async () => {
    if (!suiTaskId) {
      throw new Error("Missing on-chain task ID — task must be funded first")
    }
    const task = await callApi("run_judge")
    const { submitJudgeReportTx } = await import("@/lib/sui/transactions")
    const verdictU8 = VERDICT_MAP[task.judgeVerdict ?? task.judgeReport?.verdict ?? judgeVerdict ?? ""] ?? 0
    const recommendationU8 =
      RECOMMENDATION_MAP[
        task.judgeRecommendation ?? task.judgeReport?.recommendation ?? judgeRecommendation ?? ""
      ] ?? 0
    const result = await signAndExecute(
      submitJudgeReportTx(suiTaskId, verdictU8, recommendationU8),
    )
    if (!result) {
      throw new Error("Transaction was not signed or failed")
    }
    await callApi("confirm_judge", { txDigest: extractDigest(result) })
  })

  const handleApprove = () => runAction("approve", async () => {
    const { approveAndReleaseTx } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      approveAndReleaseTx(suiTaskId ?? taskId, agentSuiObjectId ?? ""),
    )
    if (!result) throw new Error("Transaction was not signed")
    await callApi("release", { txDigest: extractDigest(result) })
  })

  const handleReject = () => runAction("reject", async () => {
    const { markDisputedTx } = await import("@/lib/sui/transactions")
    const result = await signAndExecute(
      markDisputedTx(suiTaskId ?? taskId, agentSuiObjectId ?? ""),
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

  const handleDiscard = () => runAction("discard", async () => {
    await callApi("discard")
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
          <button type="button" onClick={() => setActionError(null)} style={{
            marginLeft: 8, background: "none", border: "none",
            color: "var(--status-red)", cursor: "pointer", textDecoration: "underline",
          }}>Dismiss</button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {/* ── PENDING_CHAIN ── */}
        {status === TaskStatus.PENDING_CHAIN && (
          <>
            <button type="button" className="ts-button ts-button--primary" onClick={handleFundEscrow}
              disabled={btn("fund")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("fund") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Wallet size={14} /> Fund Escrow</>}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleDiscard}
              disabled={btn("discard")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("discard") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Trash2 size={14} /> Discard</>}
            </button>
          </>
        )}

        {/* ── FUNDED ── */}
        {status === TaskStatus.FUNDED && (
          <>
            <button type="button" className="ts-button ts-button--primary" onClick={handleRunAgent}
              disabled={btn("run_agent")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("run_agent") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Run Agent"}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleCancel}
              disabled={btn("cancel_tx")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("cancel_tx") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Ban size={14} /> Cancel Task</>}
            </button>
          </>
        )}

        {/* ── RUNNING ── */}
        {status === TaskStatus.RUNNING && (
          proofHash && agentSuiObjectId ? (
            <button type="button" className="ts-button ts-button--primary" onClick={handleSubmitExistingProof}
              disabled={btn("submit_existing_proof")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("submit_existing_proof") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Submit Proof On-chain"}
            </button>
          ) : (
            <button type="button" className="ts-button ts-button--secondary" disabled
              style={{ width: "100%", justifyContent: "center" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
              Processing...
            </button>
          )
        )}

        {/* ── SUBMITTED ── */}
        {status === TaskStatus.SUBMITTED && (
          <>
            <button type="button" className="ts-button ts-button--primary" onClick={handleApprove}
              disabled={btn("approve")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("approve") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Check size={14} /> Approve & Release</>}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleRunJudge}
              disabled={btn("run_judge")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("run_judge") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Gavel size={14} /> Ask AI Judge</>}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleReject}
              disabled={btn("reject")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("reject") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><X size={14} /> Reject & Refund</>}
            </button>
          </>
        )}

        {/* ── JUDGE_REVIEWED ── */}
        {status === TaskStatus.JUDGE_REVIEWED && (
          <>
            <button type="button" className="ts-button ts-button--primary" onClick={handleApprove}
              disabled={btn("approve")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("approve") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Check size={14} /> Approve & Release</>}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleReject}
              disabled={btn("reject")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("reject") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><X size={14} /> Reject & Refund</>}
            </button>
          </>
        )}

        {/* ── RELEASED ── */}
        {status === TaskStatus.RELEASED && (
          <>
            {suiTaskId && (
              <a href={`https://testnet.suivision.xyz/object/${suiTaskId}`} target="_blank" rel="noopener noreferrer"
                className="ts-button ts-button--secondary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                <ExternalLink size={14} /> View Proof on Explorer
              </a>
            )}
            {agentDbId && (
              <a href={`/agents/${agentDbId}`}
                className="ts-button ts-button--secondary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                <ArrowRight size={14} /> View Agent
              </a>
            )}
            <a href="/create"
              className="ts-button ts-button--primary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
              <Plus size={14} /> Create Similar Task
            </a>
          </>
        )}

        {/* ── DISPUTED ── */}
        {status === TaskStatus.DISPUTED && (
          <>
            <button type="button" className="ts-button ts-button--primary" onClick={handleRunJudge}
              disabled={btn("run_judge")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("run_judge") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Gavel size={14} /> Ask AI Judge</>}
            </button>
            <button type="button" className="ts-button ts-button--secondary" onClick={handleApprove}
              disabled={btn("approve")} style={{ width: "100%", justifyContent: "center" }}>
              {btn("approve") ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Check size={14} /> Approve Anyway</>}
            </button>
          </>
        )}

        {/* ── CANCELLED ── */}
        {status === TaskStatus.CANCELLED && (
          <>
            <a href="/create"
              className="ts-button ts-button--primary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
              <Plus size={14} /> Create New Task
            </a>
            {suiTaskId && (
              <a href={`https://testnet.suivision.xyz/object/${suiTaskId}`} target="_blank" rel="noopener noreferrer"
                className="ts-button ts-button--secondary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                <ExternalLink size={14} /> View Refund Tx
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}
