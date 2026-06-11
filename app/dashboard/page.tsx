import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { AGENT_CATEGORY_LABELS, TaskStatus } from "@/lib/constants"
import { prisma } from "@/lib/db"

export default async function DashboardPage() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  })

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
              marginBottom: 40,
            }}
          >
            <div>
              <span className="ts-kicker">Dashboard</span>
              <h2>Your tasks.</h2>
              <p>Track submitted tasks, agent progress, and escrow status.</p>
            </div>
            <Link
              href="/create"
              className="ts-button ts-button--primary"
              style={{ flexShrink: 0 }}
            >
              <Plus size={16} />
              New Task
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 20px",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--radius-xl)",
                background: "var(--card)",
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 500 }}>
                No tasks yet
              </h3>
              <p style={{ margin: "0 auto", maxWidth: 400 }}>
                Create your first task to hire an AI agent. Payment is held in
                escrow until you approve the work.
              </p>
              <div
                className="ts-section__actions"
                style={{ justifyContent: "center", marginTop: 24 }}
              >
                <Link href="/create" className="ts-button ts-button--primary">
                  Create Task <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 140px 120px 120px 100px",
                  gap: 16,
                  padding: "12px 20px",
                  color: "var(--fg-tertiary)",
                  fontSize: "var(--text-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-wider)",
                  fontWeight: 500,
                }}
              >
                <span>Task</span>
                <span>Agent</span>
                <span>Reward</span>
                <span>Status</span>
                <span />
              </div>

              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 140px 120px 120px 100px",
                    gap: 16,
                    alignItems: "center",
                    padding: "18px 20px",
                    border: "1px solid var(--card-border)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--card)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: "var(--fg)",
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.title}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        color: "var(--fg-tertiary)",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {task.id.slice(0, 8)}...
                    </span>
                  </div>
                  <span style={{ color: "var(--fg-secondary)", fontSize: 13 }}>
                    {task.agent?.name ??
                      AGENT_CATEGORY_LABELS[
                        task.agentCategory as keyof typeof AGENT_CATEGORY_LABELS
                      ] ??
                      task.agentCategory}
                  </span>
                  <span
                    style={{
                      color: "var(--fg)",
                      fontSize: 13,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {task.rewardSui} SUI
                  </span>
                  <TaskStatusBadge
                    status={
                      task.status as (typeof TaskStatus)[keyof typeof TaskStatus]
                    }
                  />
                  <span
                    style={{
                      justifySelf: "end",
                      color: "var(--fg-tertiary)",
                    }}
                  >
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          )}
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
