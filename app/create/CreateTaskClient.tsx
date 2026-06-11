"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Eye, FileText, Loader2, Shield, Wallet } from "lucide-react"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AgentCategory, AGENT_CATEGORY_LABELS } from "@/lib/constants"
import { useSuiTransaction } from "@/components/sui/useSuiTransaction"

const AGENT_ICONS: Record<AgentCategory, React.ReactNode> = {
  MOVE_AUDIT: <Shield size={16} />,
  RESEARCH_SUMMARY: <FileText size={16} />,
  WALLET_ANALYSIS: <Eye size={16} />,
}

const CATEGORY_MAP: Record<string, number> = {
  MOVE_AUDIT: 0,
  RESEARCH_SUMMARY: 1,
  WALLET_ANALYSIS: 2,
}

const CATEGORY_INPUT_LABELS: Record<string, { label: string; placeholder: string }> = {
  MOVE_AUDIT: { label: "Move code", placeholder: "Paste the Sui Move source code to audit..." },
  RESEARCH_SUMMARY: { label: "Research input", placeholder: "Paste the docs, protocol description, or technical text to summarize..." },
  WALLET_ANALYSIS: { label: "Wallet address", placeholder: "0x..." },
}

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(10, "Describe your task in at least 10 characters").max(2000),
  inputText: z.string().max(5000).optional(),
  agentCategory: z.enum(
    [AgentCategory.MOVE_AUDIT, AgentCategory.RESEARCH_SUMMARY, AgentCategory.WALLET_ANALYSIS]
  ),
  rewardSui: z.coerce.number().min(0.1, "Minimum 0.1 SUI").max(100, "Maximum 100 SUI"),
})

type FormValues = z.infer<typeof formSchema>

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

export default function CreateTaskClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signAndExecute, isSigning, error: txError, isConnected, address } = useSuiTransaction()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const preselectedCategory = searchParams.get("category") as AgentCategory | null

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      inputText: "",
      agentCategory: undefined,
      rewardSui: 1,
    },
  })

  useEffect(() => {
    if (preselectedCategory && Object.keys(AGENT_CATEGORY_LABELS).includes(preselectedCategory)) {
      form.setValue("agentCategory", preselectedCategory)
    }
  }, [preselectedCategory, form])

  const onSubmit = async (values: FormValues) => {
    setError(null)
    setLoading(true)
    try {
      const mergedDescription = values.inputText
        ? `[Task Input]\n${values.inputText}\n\n[Instructions]\n${values.description}`
        : values.description

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, description: mergedDescription, creatorAddress: address }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to create task")
      }
      const task = await res.json()

      const { createTaskTx, hashDescription } = await import("@/lib/sui/transactions")
      const rewardMist = BigInt(Math.floor(values.rewardSui * 1_000_000_000))
      const descHash = await hashDescription(values.description)
      const tx = createTaskTx(descHash, CATEGORY_MAP[values.agentCategory] ?? 2, rewardMist)
      const result = await signAndExecute(tx)
      if (!result) {
        throw new Error("Sui transaction was not signed or failed")
      }
      const txDigest = extractDigest(result)
      const suiTaskId = extractTaskObjectId(result)
      if (!suiTaskId) {
        throw new Error("Could not find created Sui task object — object extraction failed")
      }
      const confirmRes = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_chain",
          creatorAddress: address,
          txDigest,
          suiTaskId,
        }),
      })
      if (!confirmRes.ok) {
        const data = await confirmRes.json()
        throw new Error(data.error ?? "Chain confirmation failed")
      }

      setSubmitted(true)
      setTimeout(() => router.push(`/tasks/${task.id}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  const isProcessing = loading || isSigning

  if (submitted) {
    return (
      <div className="ts-public-page">
        <main>
          <section
            className="ts-section ts-section--closing"
            style={{ minHeight: "60vh" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                margin: "0 auto 24px",
                border: "1px solid var(--status-green)",
                borderRadius: "var(--radius-full)",
                background: "var(--status-green-bg)",
                color: "var(--status-green)",
              }}
            >
              <Check size={32} />
            </div>
            <h2>Task created</h2>
            <p>
              Your task has been created and funded on Sui. Redirecting to task
              page where you can activate the AI agent.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="ts-public-page">
      <main>
        <section className="ts-section">
          <div className="ts-section__intro">
            <span className="ts-kicker">Create Task</span>
            <h2>Describe your task.</h2>
            <p>
              Choose an AI agent, describe what you need, and set your reward
              in SUI. Payment is held in escrow until you approve the work.
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            style={{ maxWidth: 640 }}
          >
            <Form {...form}>
              <div style={{ display: "grid", gap: 28 }}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={formLabelStyle}>Task title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Audit the staking pool Move module"
                          {...field}
                          style={inputStyle}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={formLabelStyle}>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your task in detail. The more context, the better the agent output."
                          rows={5}
                          {...field}
                          style={inputStyle}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inputText"
                  render={({ field }) => {
                    const cat = form.watch("agentCategory")
                    const cfg = cat ? CATEGORY_INPUT_LABELS[cat] : null
                    return (
                      <FormItem>
                        <FormLabel style={formLabelStyle}>
                          {cfg?.label ?? "Task input"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={cfg?.placeholder ?? "Paste the content for the agent to process..."}
                            rows={4}
                            {...field}
                            style={inputStyle}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="agentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={formLabelStyle}>Agent type</FormLabel>
                      <FormControl>
                        <div className="ts-segmented-control">
                          {(Object.keys(AGENT_CATEGORY_LABELS) as AgentCategory[]).map(
                            (cat) => (
                              <button
                                key={cat}
                                type="button"
                                className={`ts-segmented-control__option ${field.value === cat ? "is-active" : ""}`}
                                onClick={() => field.onChange(cat)}
                              >
                                {AGENT_ICONS[cat]}
                                {AGENT_CATEGORY_LABELS[cat]}
                              </button>
                            )
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rewardSui"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={formLabelStyle}>
                        Reward (SUI)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          placeholder="1.0"
                          {...field}
                          style={inputStyle}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(error || txError) && (
                  <div
                    style={{
                      padding: "12px 16px",
                      border: "1px solid var(--status-red)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--status-red-bg)",
                      color: "var(--status-red)",
                      fontSize: "14px",
                    }}
                  >
                    {error ?? txError}
                  </div>
                )}

                {!isConnected && (
                  <p style={{ color: "var(--status-red)", fontSize: "13px", margin: 0 }}>
                    Connect your Sui wallet to create a task.
                  </p>
                )}

                <button
                  type="submit"
                  className="ts-button ts-button--primary"
                  disabled={isProcessing || !isConnected}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {isProcessing ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <>
                      <Wallet size={16} /> Create & Fund Escrow
                    </>
                  )}
                </button>
              </div>
            </Form>
          </form>
        </section>
      </main>

      <footer className="ts-public-footer">
        <div>
          <img src="/logo-dark.png" alt="" className="ts-site-nav__logo" />
          <span>TaskSui</span>
        </div>
        <nav>
          <a href="/marketplace">Marketplace</a>
          <a href="/create">Create Task</a>
          <a href="/dashboard">Dashboard</a>
          <a href="https://sui.io" target="_blank" rel="noopener noreferrer">
            Sui Network
          </a>
        </nav>
      </footer>
    </div>
  )
}

const formLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "var(--fg)",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  height: 48,
  border: "1px solid var(--card-border)",
  borderRadius: "var(--radius-md)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: "var(--text-md)",
  padding: "0 14px",
  width: "100%",
}
