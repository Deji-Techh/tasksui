import Link from "next/link"
import { ArrowLeft, ArrowRight, Bot, Shield, Eye, FileText, ExternalLink } from "lucide-react"
import { AGENT_CATEGORY_LABELS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import type { LucideIcon } from "lucide-react"

type AgentTaskWithResult = {
  id: string
  title: string
  status: string
  rewardMist: string
  result?: { resultHash: string | null } | null
}

type AgentTaskWithProof = AgentTaskWithResult & {
  result: { resultHash: string }
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  MOVE_AUDIT: Shield,
  RESEARCH_SUMMARY: FileText,
  WALLET_ANALYSIS: Eye,
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { createdAt: "desc" }, take: 20, include: { result: true } },
    },
  })

  if (!agent) return notFound()

  const Icon = CATEGORY_ICONS[agent.category] ?? Bot
  const totalCompleted = agent.completedTasks + agent.disputedTasks
  const completionRate = totalCompleted > 0
    ? Math.round((agent.completedTasks / totalCompleted) * 100)
    : 0

  const agentTasks = agent.tasks as AgentTaskWithResult[]
  const tasksWithProofs = agentTasks.filter(
    (t): t is AgentTaskWithProof => t.status === "RELEASED" && Boolean(t.result?.resultHash),
  )

  return (
    <div className="ts-public-page">
      <main>
        <section className="ts-section">
          <Link
            href="/marketplace"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--fg-secondary)",
              fontSize: "14px",
              textDecoration: "none",
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={14} />
            Back to Marketplace
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "var(--accent-bg)",
                color: "var(--accent)",
                flexShrink: 0,
              }}
            >
              <Icon size={28} />
            </span>
            <div>
              <span className="ts-kicker">
                {AGENT_CATEGORY_LABELS[agent.category as keyof typeof AGENT_CATEGORY_LABELS]}
              </span>
              <h2 style={{ margin: "4px 0 0" }}>{agent.name}</h2>
            </div>
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-full)",
                background: "var(--accent-bg)",
                color: "var(--accent)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
              }}
            >
              {agent.reputationScore}% Reputation
            </span>
          </div>

          <div className="ts-detail-grid">
            <div>
              <div className="ts-detail-card">
                <h3>About</h3>
                <p style={{ color: "var(--fg-secondary)", lineHeight: 1.7 }}>
                  {agent.description}
                </p>
              </div>

              <div className="ts-detail-card">
                <h3>Stats</h3>
                <div className="ts-reputation-card__stats">
                  <div>
                    <strong>{agent.completedTasks}</strong>
                    <small>completed</small>
                  </div>
                  <div>
                    <strong>{agent.disputedTasks}</strong>
                    <small>disputes</small>
                  </div>
                  <div>
                    <strong>{completionRate}%</strong>
                    <small>completion rate</small>
                  </div>
                  <div>
                    <strong>{Number(agent.totalEarnedMist) / 1_000_000_000}</strong>
                    <small>SUI earned</small>
                  </div>
                </div>
              </div>

              {agent.suiObjectId && (
                <div className="ts-detail-card">
                  <h3>On-Chain Identity</h3>
                  <a
                    href={`https://testnet.suivision.xyz/object/${agent.suiObjectId}`}
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
                    {agent.suiObjectId.slice(0, 10)}...{agent.suiObjectId.slice(-6)}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            <div>
              <div className="ts-detail-card">
                <Link
                  href={`/create?category=${encodeURIComponent(agent.category)}&agentId=${encodeURIComponent(agent.id)}`}
                  className="ts-button ts-button--primary"
                  style={{ width: "100%", justifyContent: "center", textDecoration: "none", marginBottom: 16 }}
                >
                  Hire this Agent <ArrowRight size={14} />
                </Link>

                {tasksWithProofs.length > 0 && (
                  <>
                    <h3>Proof History</h3>
                    <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
                      {tasksWithProofs.slice(0, 5).map((task) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            border: "1px solid var(--card-border)",
                            borderRadius: "var(--radius-md)",
                            color: "inherit",
                            textDecoration: "none",
                            fontSize: 13,
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                            {task.title}
                          </span>
                          <code style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            color: "var(--accent)",
                            marginLeft: 8,
                            flexShrink: 0,
                          }}>
                            {task.result.resultHash.slice(0, 14)}...
                          </code>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                <h3>Recent Tasks</h3>
                {agentTasks.length === 0 ? (
                  <p style={{ color: "var(--fg-tertiary)", fontSize: "14px" }}>
                    No tasks assigned yet.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {agentTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        style={{
                          display: "block",
                          padding: "12px 16px",
                          border: "1px solid var(--card-border)",
                          borderRadius: "var(--radius-md)",
                          color: "inherit",
                          textDecoration: "none",
                          fontSize: "14px",
                        }}
                      >
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {task.title}
                        </div>
                        <div
                          style={{
                            color: "var(--fg-tertiary)",
                            fontSize: "var(--text-xs)",
                          }}
                        >
                          {task.status} &middot; {Number(task.rewardMist) / 1_000_000_000} SUI
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
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
