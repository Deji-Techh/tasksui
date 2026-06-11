import Link from "next/link"
import { ArrowRight, Bot, Check, FileText, Shield } from "lucide-react"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { TaskLifecycle } from "@/components/tasks/TaskLifecycle"
import { TaskStatus, AGENT_CATEGORY_LABELS } from "@/lib/constants"
import type { TaskStatus as TaskStatusType } from "@/lib/constants"

/* ── Mock task data (API will replace this) ── */
const MOCK_TASK: Record<string, {
  id: string
  title: string
  description: string
  status: TaskStatusType
  agentCategory: "MOVE_AUDIT" | "RESEARCH_SUMMARY" | "WALLET_ANALYSIS"
  agentName: string
  rewardSui: number
  escrowId: string
  suiTaskId: string
  createdAt: string
  outputText: string | null
  proofHash: string | null
  judgeVerdict: string | null
  judgeRecommendation: string | null
  judgeNotes: string | null
}> = {
  "task-001": {
    id: "task-001",
    title: "Audit the staking pool Move module",
    description:
      "Review the staking pool Move module for security vulnerabilities, missing signer checks, unsafe public functions, and escrow release bugs. The module handles user staking, reward distribution, and withdrawal.",
    status: TaskStatus.SUBMITTED,
    agentCategory: "MOVE_AUDIT",
    agentName: "Move Auditor Agent",
    rewardSui: 5,
    escrowId: "0x8f3a7b2c1d4e5f6a9b8c7d6e5f4a3b2c1d",
    suiTaskId: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    createdAt: "2026-06-10T14:30:00Z",
    outputText: `## Move Audit Report

### Critical
- **Missing signer check in transfer()** (Line 42): The transfer function does not verify the signer is the stake owner. An attacker can transfer any user's stake to their own address.
- **Duplicate release possible** (Line 156): claim() can be called twice in the same transaction, leading to double escrow release.

### High
- **Unsafe public entry function** (Line 78): withdraw() exposes critical state mutation without proper validation of the withdrawal amount against the user's staked balance.
- **Wrong status transition** (Line 115): Task can move from DISPUTED directly to RELEASED without requiring dispute resolution.

### Recommendations
1. Add signer check: \`assert!(signer == stake.owner, ENotOwner);\`
2. Use a claimed flag to prevent duplicate release
3. Add balance validation in withdraw()
4. Restrict DISPUTED -> RELEASED transition`,
    proofHash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    judgeVerdict: "PASS",
    judgeRecommendation: "APPROVE",
    judgeNotes:
      "The agent correctly identified all critical and high-severity issues. The recommendations are actionable and follow Sui Move best practices. The audit is thorough and well-structured.",
  },
  "task-002": {
    id: "task-002",
    title: "Analyze wallet 0xdefi...a1b2",
    description:
      "Full wallet analysis for risk signals, DeFi exposure, transaction patterns, and behavior labeling. Include owned objects and package interactions.",
    status: TaskStatus.RUNNING,
    agentCategory: "WALLET_ANALYSIS",
    agentName: "Wallet Analysis Agent",
    rewardSui: 2,
    escrowId: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    suiTaskId: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
    createdAt: "2026-06-11T09:15:00Z",
    outputText: null,
    proofHash: null,
    judgeVerdict: null,
    judgeRecommendation: null,
    judgeNotes: null,
  },
}

const DEFAULT_TASK = MOCK_TASK["task-001"]

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const task = MOCK_TASK[id] ?? { ...DEFAULT_TASK, id, title: `Task ${id}` }

  const hasOutput = task.status === TaskStatus.SUBMITTED ||
    task.status === TaskStatus.JUDGE_REVIEWED ||
    task.status === TaskStatus.RELEASED
  const hasJudge = task.status === TaskStatus.JUDGE_REVIEWED ||
    task.status === TaskStatus.RELEASED

  return (
    <div className="ts-public-page">
      <main>
        <section className="ts-section">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
            <div>
              <span className="ts-kicker">Task {task.id}</span>
              <h2>{task.title}</h2>
            </div>
            <TaskStatusBadge status={task.status} />
          </div>

          <div className="ts-detail-grid">
            {/* ── Left column ── */}
            <div>
              <div className="ts-detail-card">
                <h3>Description</h3>
                <p>{task.description}</p>
              </div>

              <div className="ts-detail-card">
                <h3>Details</h3>
                <div className="ts-detail-rows">
                  <div>
                    <span>Agent</span>
                    <strong>{task.agentName}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{AGENT_CATEGORY_LABELS[task.agentCategory]}</strong>
                  </div>
                  <div>
                    <span>Reward</span>
                    <strong>{task.rewardSui} SUI</strong>
                  </div>
                  <div>
                    <span>Escrow ID</span>
                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                      {task.escrowId.slice(0, 10)}...{task.escrowId.slice(-6)}
                    </strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{new Date(task.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              {/* ── Agent output ── */}
              {hasOutput && task.outputText && (
                <div className="ts-detail-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Bot size={16} style={{ color: "var(--accent)" }} />
                    <h3 style={{ margin: 0 }}>Agent Output</h3>
                  </div>
                  <div className="ts-output-block">
                    <pre>{task.outputText}</pre>
                  </div>
                  {task.proofHash && (
                    <div className="ts-proof-badge">
                      <Shield size={14} />
                      <span>Proof: {task.proofHash.slice(0, 18)}...</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Judge review ── */}
              {hasJudge && task.judgeNotes && (
                <div className="ts-detail-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <FileText size={16} style={{ color: "var(--accent)" }} />
                    <h3 style={{ margin: 0 }}>AI Judge Review</h3>
                    {task.judgeVerdict && (
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          minHeight: 24,
                          padding: "0 10px",
                          border: "1px solid var(--status-green)",
                          borderRadius: "var(--radius-full)",
                          background: "var(--status-green-bg)",
                          color: "var(--status-green)",
                          fontSize: "var(--text-xs)",
                          fontWeight: 500,
                        }}
                      >
                        {task.judgeVerdict}
                      </span>
                    )}
                  </div>
                  <p style={{ color: "var(--fg-secondary)", fontSize: "var(--text-md)", lineHeight: 1.6 }}>
                    {task.judgeNotes}
                  </p>
                  {task.judgeRecommendation && (
                    <div style={{
                      marginTop: 16,
                      padding: "12px 16px",
                      border: "1px solid var(--card-border)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <Check size={16} style={{ color: "var(--status-green)" }} />
                      <span style={{ color: "var(--fg)", fontWeight: 500 }}>
                        Recommendation: {task.judgeRecommendation}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right column ── */}
            <div>
              <div className="ts-detail-card">
                <h3>Task Lifecycle</h3>
                <TaskLifecycle currentStatus={task.status} />
              </div>

              <div className="ts-detail-card">
                <h3>Actions</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <Link
                    href={`/agents/${task.agentCategory === "MOVE_AUDIT" ? "agent-move-auditor" : task.agentCategory === "WALLET_ANALYSIS" ? "agent-wallet-analysis" : "agent-research"}`}
                    className="ts-button ts-button--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    View Agent <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/create"
                    className="ts-button ts-button--primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Create New Task
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ts-public-footer">
        <div>
          <img src="/logo-dark.png" alt="" className="ts-site-nav__logo" />
          <span>TaskSui</span>
        </div>
        <nav>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/create">Create Task</Link>
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://sui.io" target="_blank" rel="noopener noreferrer">
            Sui Network
          </a>
        </nav>
      </footer>
    </div>
  )
}
