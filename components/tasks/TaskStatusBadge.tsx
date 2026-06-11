import { TaskStatus, TASK_STATUS_LABELS } from "@/lib/constants"
import type { TaskStatus as TaskStatusType } from "@/lib/constants"

const STATUS_STYLES: Record<TaskStatusType, string> = {
  PENDING_CHAIN: "background: var(--status-yellow-bg); color: var(--status-yellow); border-color: var(--status-yellow);",
  FUNDED: "background: var(--status-blue-bg); color: var(--status-blue); border-color: var(--status-blue);",
  RUNNING: "background: var(--status-purple-bg); color: var(--status-purple); border-color: var(--status-purple);",
  SUBMITTED: "background: var(--status-blue-bg); color: var(--status-blue); border-color: var(--status-blue);",
  JUDGE_REVIEWED: "background: var(--status-orange-bg); color: var(--status-orange); border-color: var(--status-orange);",
  RELEASED: "background: var(--status-green-bg); color: var(--status-green); border-color: var(--status-green);",
  DISPUTED: "background: var(--status-red-bg); color: var(--status-red); border-color: var(--status-red);",
  CANCELLED: "background: transparent; color: var(--fg-tertiary); border-color: var(--fg-tertiary);",
}

export function TaskStatusBadge({ status }: { status: TaskStatusType }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "24px",
        padding: "0 10px",
        border: "1px solid",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-wide)",
        textTransform: "uppercase",
        ...parseStyle(STATUS_STYLES[status]),
      }}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}

function parseStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  s.split(";").forEach((part) => {
    const colon = part.indexOf(":")
    if (colon < 0) return
    const raw = part.slice(0, colon).trim()
    const key = raw.startsWith("--") ? raw : raw.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    const val = part.slice(colon + 1).trim()
    if (key && val) out[key] = val
  })
  return out
}
