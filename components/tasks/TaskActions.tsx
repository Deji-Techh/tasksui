"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Shield, Check, X, Gavel } from "lucide-react"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"
import { TaskStatus } from "@/lib/constants"

type Props = {
  taskId: string
  status: string
  suiTaskId: string | null
  escrowId: string | null
  agentId: string | null
}

export function TaskActions({ taskId, status, suiTaskId, escrowId, agentId }: Props) {
  const router = useRouter()
  const { signAndExecute, isSigning, error, isConnected, address } = useSuiTransaction()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const callApi = async (action: string, body?: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Action failed")
    }
    return res.json()
  }

  const handleRunAgent = async () => {
    setActionLoading("run_agent")
    setActionError(null)
    try {
      await callApi("run_agent")
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to run agent")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRunJudge = async () => {
    setActionLoading("run_judge")
    setActionError(null)
    try {
      await callApi("run_judge")
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to run judge")
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async () => {
    setActionLoading("approve")
    setActionError(null)
    try {
      const { approveAndReleaseTx } = await import("@/lib/sui/transactions")
      const result = await signAndExecute(
        approveAndReleaseTx(suiTaskId ?? taskId, agentId ?? ""),
      )
      if (!result) return
      const txDigest = (result as Record<string, unknown>).digest as string
        ?? ((result as Record<string, unknown>).Transaction as Record<string, unknown>)?.digest as string
        ?? ""
      await callApi("release", { txDigest })
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Release failed")
    } finally {
      setActionLoading(null)
    }
  }

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

      {actionError && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            border: "1px solid var(--status-red)",
            borderRadius: "var(--radius-md)",
            background: "var(--status-red-bg)",
            color: "var(--status-red)",
            fontSize: "13px",
          }}
        >
          {actionError}
          <button
            onClick={() => setActionError(null)}
            style={{
              marginLeft: 8,
              background: "none",
              border: "none",
              color: "var(--status-red)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            border: "1px solid var(--status-red)",
            borderRadius: "var(--radius-md)",
            background: "var(--status-red-bg)",
            color: "var(--status-red)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {status === TaskStatus.FUNDED && (
          <button
            className="ts-button ts-button--primary"
            onClick={handleRunAgent}
            disabled={actionLoading === "run_agent"}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {actionLoading === "run_agent" ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>Run Agent</>
            )}
          </button>
        )}

        {status === TaskStatus.SUBMITTED && (
          <>
            <button
              className="ts-button ts-button--primary"
              onClick={handleApprove}
              disabled={actionLoading === "approve" || isSigning}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {actionLoading === "approve" || isSigning ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  <Check size={14} /> Approve & Release
                </>
              )}
            </button>
            <button
              className="ts-button ts-button--secondary"
              onClick={handleRunJudge}
              disabled={actionLoading === "run_judge"}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {actionLoading === "run_judge" ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  <Gavel size={14} /> Ask AI Judge
                </>
              )}
            </button>
            <button
              className="ts-button ts-button--secondary"
              disabled
              style={{ width: "100%", justifyContent: "center" }}
            >
              <X size={14} /> Reject
            </button>
          </>
        )}

        {status === TaskStatus.JUDGE_REVIEWED && (
          <>
            <button
              className="ts-button ts-button--primary"
              onClick={handleApprove}
              disabled={actionLoading === "approve" || isSigning}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {actionLoading === "approve" || isSigning ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  <Check size={14} /> Approve & Release
                </>
              )}
            </button>
            <button
              className="ts-button ts-button--secondary"
              disabled
              style={{ width: "100%", justifyContent: "center" }}
            >
              <X size={14} /> Reject
            </button>
          </>
        )}

        {status === TaskStatus.RUNNING && (
          <button
            className="ts-button ts-button--secondary"
            disabled
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
            Processing...
          </button>
        )}
      </div>
    </div>
  )
}
