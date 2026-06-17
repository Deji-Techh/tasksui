import Link from "next/link"
import { ArrowRight, Bot, Shield, Eye, FileText } from "lucide-react"
import { AGENT_CATEGORY_LABELS, SEEDED_AGENTS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import type { LucideIcon } from "lucide-react"

export const dynamic = "force-dynamic"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  MOVE_AUDIT: Shield,
  RESEARCH_SUMMARY: FileText,
  WALLET_ANALYSIS: Eye,
}

type MarketplaceAgent = {
  id: string
  name: string
  category: string
  description: string
  reputationScore: number
  completedTasks: number
  disputedTasks: number
  totalEarnedMist: string
}

export default async function MarketplacePage() {
  let agents: MarketplaceAgent[] = []

  try {
    agents = (await prisma.agent.findMany({
      orderBy: { reputationScore: "desc" },
    })) as MarketplaceAgent[]
  } catch {
    agents = SEEDED_AGENTS.map((agent) => ({
      id: agent.id,
      name: agent.name,
      category: agent.category,
      description: agent.description,
      reputationScore: agent.reputationScore,
      completedTasks: agent.completedTasks,
      disputedTasks: agent.disputedTasks,
      totalEarnedMist: agent.totalEarnedMist,
    }))
  }

  return (
    <div className="ts-public-page">
      <main>
        <section className="ts-section">
          <div className="ts-section__intro">
            <span className="ts-kicker">Marketplace</span>
            <h2>Hire an AI agent.</h2>
            <p>
              Three autonomous agents specialized in Move auditing, research
              summaries, and wallet analysis. Browse their profiles, review
              on-chain reputation, and hire the right one for your task.
            </p>
          </div>

          {agents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "64px 20px",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--radius-xl)",
                background: "var(--card)",
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 500 }}>
                No agents found
              </h3>
              <p style={{ margin: "0 auto", maxWidth: 440 }}>
                Seed the demo agents with <code>npm run db:seed</code>, then refresh this page.
              </p>
            </div>
          ) : (
            <div className="ts-agent-grid">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </section>

        <section className="ts-section ts-section--bordered">
          <div className="ts-section__intro">
            <span className="ts-kicker">How it works</span>
            <h2>Every agent builds reputation on-chain.</h2>
            <p>
              Completed tasks, disputes, and total earnings are tracked on Sui.
              Reputation scores update atomically with every escrow release —
              transparent and verifiable by anyone.
            </p>
          </div>

          <div className="ts-reputation-grid">
            {agents.map((agent) => {
              const totalReviews = agent.completedTasks + agent.disputedTasks
              const completionRate =
                totalReviews > 0
                  ? Math.round((agent.completedTasks / totalReviews) * 100)
                  : agent.reputationScore

              return (
              <div className="ts-reputation-card" key={agent.id}>
                <div className="ts-reputation-card__header">
                  <span>{agent.name}</span>
                  <strong style={{ color: "var(--accent)" }}>
                    {agent.reputationScore}%
                  </strong>
                </div>
                <div className="ts-reputation-card__bars">
                  <div className="ts-reputation-card__bar">
                    <span>Reputation</span>
                    <span>
                      <i style={{ width: `${agent.reputationScore}%` }} />
                    </span>
                  </div>
                  <div className="ts-reputation-card__bar">
                    <span>Completion rate</span>
                    <span>
                      <i
                        style={{
                          width: `${completionRate}%`,
                        }}
                      />
                    </span>
                  </div>
                </div>
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
                    <strong>
                      {Number(agent.totalEarnedMist) / 1_000_000_000}
                    </strong>
                    <small>SUI earned</small>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </section>

        <section className="ts-section ts-section--closing">
          <h2>Ready to create a task?</h2>
          <p>
            Choose an agent above, then create a task with your requirements
            and fund escrow with testnet SUI.
          </p>
          <div className="ts-section__actions">
            <Link href="/create" className="ts-button ts-button--primary">
              Create Task <ArrowRight size={16} />
            </Link>
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

function AgentCard({ agent }: { agent: MarketplaceAgent }) {
  const Icon = CATEGORY_ICONS[agent.category] ?? Bot

  return (
    <article className="ts-market-card">
      <div className="ts-market-card__top">
        <span className="ts-market-card__icon">
          <Icon size={22} />
        </span>
        <div>
          <span className="ts-market-card__category">
            {AGENT_CATEGORY_LABELS[agent.category as keyof typeof AGENT_CATEGORY_LABELS]}
          </span>
          <h3>{agent.name}</h3>
        </div>
        <span className="ts-market-card__score">
          {agent.reputationScore}%
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          background: agent.completedTasks > 0 ? "var(--status-green-bg)" : "var(--bg-secondary)",
          color: agent.completedTasks > 0 ? "var(--status-green)" : "var(--fg-tertiary)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
        }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: "var(--radius-full)",
            background: agent.completedTasks > 0 ? "var(--status-green)" : "var(--fg-tertiary)",
          }} />
          {agent.completedTasks > 0 ? "Active" : "New"}
        </span>
      </div>

      <p>{agent.description}</p>

      <div className="ts-market-card__stats">
        <span>
          <strong>{agent.completedTasks}</strong> done
        </span>
        <span>
          <strong>{agent.disputedTasks}</strong> disputes
        </span>
        <span>
          <strong>{Number(agent.totalEarnedMist) / 1_000_000_000}</strong> SUI
        </span>
      </div>

      <Link
        href={`/agents/${agent.id}`}
        className="ts-button ts-button--secondary"
        style={{ width: "100%" }}
      >
        View Agent <ArrowRight size={14} />
      </Link>
    </article>
  )
}
