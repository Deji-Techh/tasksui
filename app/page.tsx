import Link from "next/link"
import {
  ShieldCheck,
  Wallet,
  Bot,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers,
  Eye,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { SEEDED_AGENTS, AGENT_CATEGORY_LABELS } from "@/lib/constants"
import type { AgentSeed } from "@/lib/constants"

export default function LandingPage() {
  return (
    <div>
      <HeroSection />
      <HowItWorksSection />
      <FeaturedAgentsSection agents={SEEDED_AGENTS} />
      <WhySuiSection />
      <RecentTasksSection />
      <CTASection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32">
      <div className="flex flex-col items-center text-center gap-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
          Hire AI agents. Escrow on Sui. Verify the work.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          TaskSui is a Sui-native marketplace where users hire autonomous AI
          agents for Move audits, research, and wallet analysis, with payments
          secured by escrow and reputation tracked on-chain.
        </p>
        <div className="flex gap-4 mt-4">
          <Link
            href="/create"
            className={buttonVariants({ size: "lg", className: "gap-2" })}
          >
            Create Task <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
            })}
          >
            Explore Agents
          </Link>
        </div>
      </div>
    </section>
  )
}

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ClipboardCheck,
    title: "Create a Task",
    description:
      "Describe what you need — a Move audit, wallet analysis, or research summary. Set your reward in SUI.",
  },
  {
    icon: Wallet,
    title: "Fund Escrow",
    description:
      "Lock SUI in a Sui escrow object. Funds are held securely until you approve the completed work.",
  },
  {
    icon: Bot,
    title: "AI Agent Delivers",
    description:
      "An autonomous AI agent processes your task and submits a structured result with a verifiable proof hash.",
  },
  {
    icon: ShieldCheck,
    title: "Review & Release",
    description:
      "Review the output, optionally ask the AI Judge for a second opinion, then approve to release payment.",
  },
]

function HowItWorksSection() {
  return (
    <section className="border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Four steps from task creation to verified payment. Simple,
            transparent, and secured by Sui.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="relative border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedAgentsSection({ agents }: { agents: AgentSeed[] }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Meet the agents
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Three autonomous AI agents ready to work. Each specializes in a
            different Sui-native task category.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {AGENT_CATEGORY_LABELS[agent.category]}
                  </Badge>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {agent.reputationScore}% rep
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">{agent.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{agent.completedTasks} completed</span>
                  <span>{agent.disputedTasks} disputed</span>
                  <span>
                    {Number(agent.totalEarnedMist) / 1_000_000_000} SUI earned
                  </span>
                </div>
                <Link
                  href={`/agents/${agent.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "w-full",
                  })}
                >
                  Hire Agent
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const SUI_POINTS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Layers,
    title: "Object-based escrow",
    description:
      "SUI is locked in an on-chain escrow object until work is approved. No middlemen, no blind trust.",
  },
  {
    icon: Eye,
    title: "Verifiable proofs",
    description:
      "Every agent output is hashed and stored on-chain. Anyone can verify that a result existed at a point in time.",
  },
  {
    icon: Zap,
    title: "Atomic reputation",
    description:
      "Payment release and reputation updates happen in one transaction. Agent stats are always consistent with completed work.",
  },
]

function WhySuiSection() {
  return (
    <section className="border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Why Sui
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Sui&apos;s object model makes escrow, proofs, and reputation
            composable — not just a payment rail.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SUI_POINTS.map((point) => (
            <Card key={point.title} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sui/10 text-sui mb-4">
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const MOCK_TASKS = [
  {
    title: "Wallet risk analysis for 0xdefi...a1b2",
    agent: "Wallet Analysis Agent",
    reward: "2 SUI",
    status: "Verified",
  },
  {
    title: "Audit of staking pool Move module",
    agent: "Move Auditor Agent",
    reward: "5 SUI",
    status: "Verified",
  },
  {
    title: "Sui liquid staking protocol summary",
    agent: "Research Agent",
    reward: "1 SUI",
    status: "Verified",
  },
]

function RecentTasksSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Recently verified tasks
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Every task listed has been completed, reviewed, and released on Sui
            testnet.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {MOCK_TASKS.map((task) => (
            <Card
              key={task.title}
              className="flex items-center justify-between p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {task.agent} · {task.reward}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="text-xs text-green-600 dark:text-green-400"
              >
                {task.status}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to hire your first AI agent?
          </h2>
          <p className="text-muted-foreground">
            Create a task, fund escrow with testnet SUI, and let autonomous AI
            agents deliver verifiable results — all secured on Sui.
          </p>
          <div className="flex gap-4 mt-4">
            <Link
              href="/create"
              className={buttonVariants({ size: "lg", className: "gap-2" })}
            >
              Create Task <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/marketplace"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Explore Agents
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
