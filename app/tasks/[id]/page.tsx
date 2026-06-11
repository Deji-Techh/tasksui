import Link from "next/link"
import { ArrowRight, Bot, Check, ExternalLink, FileText, Shield } from "lucide-react"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { TaskLifecycle } from "@/components/tasks/TaskLifecycle"
import { TaskStatus, AGENT_CATEGORY_LABELS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { explorerLink } from "@/lib/sui/client"
import { TaskActions } from "@/components/tasks/TaskActions"
import { notFound } from "next/navigation"

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: { agent: true, result: true, judgeReport: true },
  })

  if (!task) return notFound()

  const hasOutput =
    task.status === TaskStatus.SUBMITTED ||
    task.status === TaskStatus.JUDGE_REVIEWED ||
    task.status === TaskStatus.RELEASED
  const hasJudge =
    task.status === TaskStatus.JUDGE_REVIEWED ||
    task.status === TaskStatus.RELEASED
  const judge = task.judgeReport
  const result = task.result

  return (
    <div className="ts-public-page">
      <main>
        <section className="ts-section">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div>
              <span className="ts-kicker">Task {task.id.slice(0, 8)}</span>
              <h2>{task.title}</h2>
            </div>
            <TaskStatusBadge status={task.status as typeof TaskStatus[keyof typeof TaskStatus]} />
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
                    <strong>{task.agent?.name ?? "Unassigned"}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>
                      {AGENT_CATEGORY_LABELS[
                        task.agentCategory as keyof typeof AGENT_CATEGORY_LABELS
                      ] ?? task.agentCategory}
                    </strong>
                  </div>
                  <div>
                    <span>Reward</span>
                    <strong>{Number(task.rewardMist) / 1_000_000_000} SUI</strong>
                  </div>
                  {task.escrowId && (
                    <div>
                      <span>Escrow ID</span>
                      <a
                        href={explorerLink("object", task.escrowId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-sm)",
                          color: "var(--accent)",
                          textDecoration: "none",
                        }}
                      >
                        {task.escrowId.slice(0, 10)}...
                        {task.escrowId.slice(-6)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {task.suiTaskId && (
                    <div>
                      <span>Sui Task</span>
                      <a
                        href={explorerLink("object", task.suiTaskId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-sm)",
                          color: "var(--accent)",
                          textDecoration: "none",
                        }}
                      >
                        {task.suiTaskId.slice(0, 10)}...
                        {task.suiTaskId.slice(-6)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  <div>
                    <span>Created</span>
                    <strong>
                      {new Date(task.createdAt).toLocaleDateString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ── Agent output ── */}
              {hasOutput && result && (
                <div className="ts-detail-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Bot size={16} style={{ color: "var(--accent)" }} />
                    <h3 style={{ margin: 0 }}>Agent Output</h3>
                    {result.createdAt && (
                      <span style={{
                        marginLeft: "auto",
                        color: "var(--fg-tertiary)",
                        fontSize: "var(--text-xs)",
                      }}>
                        {new Date(result.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="ts-output-block">
                    <pre>{result.fullOutput}</pre>
                  </div>
                  {result.resultHash && (
                    <div className="ts-proof-badge">
                      <Shield size={14} />
                      <span>Proof: {result.resultHash.slice(0, 18)}...</span>
                    </div>
                  )}
                  {result.submitTxDigest && (
                    <div style={{ marginTop: 12, fontSize: "var(--text-xs)" }}>
                      <span style={{ color: "var(--fg-tertiary)" }}>Submit tx: </span>
                      <a
                        href={explorerLink("tx", result.submitTxDigest)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent)",
                          textDecoration: "none",
                        }}
                      >
                        {result.submitTxDigest.slice(0, 10)}...{result.submitTxDigest.slice(-6)}
                        <ExternalLink size={10} style={{ marginLeft: 4 }} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── Judge review ── */}
              {hasJudge && judge && (
                <div className="ts-detail-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <FileText size={16} style={{ color: "var(--accent)" }} />
                    <h3 style={{ margin: 0 }}>AI Judge Review</h3>
                    {judge.verdict && (
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
                        {judge.verdict}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      color: "var(--fg-secondary)",
                      fontSize: "var(--text-md)",
                      lineHeight: 1.6,
                    }}
                  >
                    {judge.reason}
                  </p>
                  {judge.reportHash && (
                    <div className="ts-proof-badge">
                      <Shield size={14} />
                      <span>Report: {judge.reportHash.slice(0, 18)}...</span>
                    </div>
                  )}
                  {judge.recommendation && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        border: "1px solid var(--card-border)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Check size={16} style={{ color: "var(--status-green)" }} />
                      <span style={{ color: "var(--fg)", fontWeight: 500 }}>
                        Recommendation: {judge.recommendation}
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
                <TaskLifecycle
                  currentStatus={
                    task.status as typeof TaskStatus[keyof typeof TaskStatus]
                  }
                />
              </div>

              <TaskActions
                taskId={task.id}
                status={task.status}
                suiTaskId={task.suiTaskId}
                escrowId={task.escrowId}
                agentId={task.agent?.suiObjectId ?? null}
                agentDbId={task.agent?.id ?? null}
                description={task.description}
                agentCategory={task.agentCategory}
                rewardSui={Number(task.rewardMist) / 1_000_000_000}
              />

              {task.agent && (
                <div className="ts-detail-card">
                  <h3>Agent</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Link
                      href={`/agents/${task.agent.id}`}
                      className="ts-button ts-button--secondary"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      View Agent <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              <div className="ts-detail-card">
                <h3>Create</h3>
                <div style={{ display: "grid", gap: 8 }}>
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
