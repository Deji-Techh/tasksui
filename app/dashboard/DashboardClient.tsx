"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Plus, Loader2 } from "lucide-react"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { AGENT_CATEGORY_LABELS, TaskStatus } from "@/lib/constants"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"

type Task = {
  id: string
  title: string
  agentCategory: string
  rewardMist: string
  status: string
  agent: { name: string; suiObjectId: string } | null
}

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "created", label: "Created", statuses: [TaskStatus.PENDING_CHAIN, TaskStatus.FUNDED, TaskStatus.RUNNING] },
  { key: "in_review", label: "In Review", statuses: [TaskStatus.SUBMITTED, TaskStatus.JUDGE_REVIEWED] },
  { key: "completed", label: "Completed", statuses: [TaskStatus.RELEASED] },
  { key: "disputed", label: "Disputed", statuses: [TaskStatus.DISPUTED] },
  { key: "cancelled", label: "Cancelled", statuses: [TaskStatus.CANCELLED] },
]

export default function DashboardClient() {
  const { isConnected, address } = useSuiTransaction()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("created")

  useEffect(() => {
    const url = isConnected && address
      ? `/api/tasks?creatorAddress=${address}`
      : "/api/tasks"
    setFetchError(null)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`)
        return r.json()
      })
      .then(setTasks)
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load tasks"))
      .finally(() => setLoading(false))
  }, [isConnected, address])

  const activeStatuses: string[] = TABS.find((t) => t.key === activeTab)?.statuses ?? []
  const filtered = tasks.filter((t) => activeStatuses.includes(t.status))

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
              <h2>{isConnected ? "Your tasks." : "All tasks."}</h2>
              <p>
                {isConnected
                  ? "Track your submitted tasks, agent progress, and escrow status."
                  : "Connect your wallet to see your tasks."}
              </p>
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

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--card-border)", paddingBottom: 0 }}>
            {TABS.map((tab) => {
              const count = tasks.filter((t) => tab.statuses.includes(t.status)).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                    background: "none",
                    color: activeTab === tab.key ? "var(--fg)" : "var(--fg-tertiary)",
                    fontSize: "var(--text-sm)",
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span style={{
                      marginLeft: 6,
                      padding: "1px 6px",
                      borderRadius: "var(--radius-full)",
                      background: activeTab === tab.key ? "var(--accent-bg)" : "var(--bg-secondary)",
                      fontSize: "var(--text-xs)",
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : fetchError ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              color: "var(--status-red)", fontSize: "var(--text-sm)",
            }}>
              Failed to load tasks: {fetchError}
            </div>
          ) : filtered.length === 0 ? (
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
                No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} tasks
              </h3>
              <p style={{ margin: "0 auto", maxWidth: 400 }}>
                {activeTab === "created"
                  ? "Create your first task to hire an AI agent. Payment is held in escrow until you approve the work."
                  : "Tasks in this category will appear here."}
              </p>
              {activeTab === "created" && (
                <div
                  className="ts-section__actions"
                  style={{ justifyContent: "center", marginTop: 24 }}
                >
                  <Link href="/create" className="ts-button ts-button--primary">
                    Create Task <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
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

              {filtered.map((task) => (
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
                    {Number(task.rewardMist) / 1_000_000_000} SUI
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
