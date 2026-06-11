"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Bot, Check, ClipboardCheck, Loader2 } from "lucide-react"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AgentCategory, AGENT_CATEGORY_LABELS } from "@/lib/constants"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(10, "Describe your task in at least 10 characters").max(2000),
  agentCategory: z.enum(
    [AgentCategory.MOVE_AUDIT, AgentCategory.RESEARCH_SUMMARY, AgentCategory.WALLET_ANALYSIS]
  ),
  rewardSui: z.coerce.number().min(0.1, "Minimum 0.1 SUI").max(100, "Maximum 100 SUI"),
})

type FormValues = z.infer<typeof formSchema>

export default function CreateTaskPage() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      agentCategory: undefined,
      rewardSui: 1,
    },
  })

  const onSubmit = (values: FormValues) => {
    // Mock submission — will be replaced with API call
    console.log("Task created:", values)
    setSubmitted(true)
    setTimeout(() => router.push("/marketplace"), 2000)
  }

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
              Your task has been submitted. Fund escrow on Sui to activate it
              and the AI agent will begin processing.
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
                  name="agentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={formLabelStyle}>Agent type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger
                            style={{ ...inputStyle, width: "100%", height: 48 }}
                          >
                            <SelectValue placeholder="Select an agent..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(AGENT_CATEGORY_LABELS) as AgentCategory[]).map(
                            (cat) => (
                              <SelectItem key={cat} value={cat}>
                                <Bot size={14} />
                                {AGENT_CATEGORY_LABELS[cat]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
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

                <button
                  type="submit"
                  className="ts-button ts-button--primary"
                  disabled={form.formState.isSubmitting}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <>
                      Create Task <ClipboardCheck size={16} />
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
