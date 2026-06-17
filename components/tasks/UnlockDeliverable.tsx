"use client"

import { useState } from "react"
import { Loader2, LockKeyhole, Shield } from "lucide-react"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"

function unlockMessage(taskId: string, address: string) {
  return [
    "TaskSui unlock deliverable",
    `Task ID: ${taskId}`,
    `Wallet: ${address}`,
    "Only sign this message if you are unlocking a released TaskSui deliverable.",
  ].join("\n")
}

export function UnlockDeliverable({ taskId }: { taskId: string }) {
  const { address, isConnected, isSigning, signPersonalMessage } = useSuiTransaction()
  const [fullOutput, setFullOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const unlock = async () => {
    if (!address) {
      setError("Connect the creator wallet to unlock this released deliverable.")
      return
    }

    setIsUnlocking(true)
    setError(null)
    try {
      const message = unlockMessage(taskId, address)
      const signed = await signPersonalMessage(message)
      if (!signed?.signature) throw new Error("Message was not signed")

      const response = await fetch(`/api/tasks/${taskId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: signed.signature }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to unlock deliverable")
      setFullOutput(data.fullOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock deliverable")
    } finally {
      setIsUnlocking(false)
    }
  }

  if (fullOutput) {
    return (
      <div className="ts-output-block">
        <pre>{fullOutput}</pre>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: "16px",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Shield size={16} style={{ color: "var(--accent)" }} />
        <strong>Encrypted deliverable is ready</strong>
      </div>
      <p style={{ color: "var(--fg-secondary)", fontSize: "var(--text-sm)", margin: 0 }}>
        Escrow has been released. Sign a wallet message with the creator wallet to decrypt and view the full result.
      </p>
      {error && (
        <p style={{ color: "var(--status-red)", fontSize: "var(--text-sm)", margin: 0 }}>
          {error}
        </p>
      )}
      <button
        type="button"
        className="ts-button ts-button--primary"
        onClick={unlock}
        disabled={!isConnected || isUnlocking || isSigning}
        style={{ justifyContent: "center" }}
      >
        {isUnlocking || isSigning ? (
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            <LockKeyhole size={14} /> Unlock Full Deliverable
          </>
        )}
      </button>
    </div>
  )
}
