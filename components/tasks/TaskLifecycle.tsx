"use client"

import { Check, Circle } from "lucide-react"
import { TaskStatus, TASK_STATUS_LABELS, TASK_LIFECYCLE } from "@/lib/constants"
import type { TaskStatus as TaskStatusType } from "@/lib/constants"

export function TaskLifecycle({ currentStatus }: { currentStatus: TaskStatusType }) {
  const currentIdx = TASK_LIFECYCLE.indexOf(currentStatus)

  return (
    <div className="ts-lifecycle">
      {TASK_LIFECYCLE.map((status, i) => {
        const isDone = i < currentIdx
        const isCurrent = i === currentIdx
        const isPending = i > currentIdx

        return (
          <div
            key={status}
            className={`ts-lifecycle__step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""} ${isPending ? "is-pending" : ""}`}
          >
            <div className="ts-lifecycle__dot">
              {isDone ? (
                <Check size={12} />
              ) : isCurrent ? (
                <Circle size={12} fill="currentColor" />
              ) : (
                <Circle size={12} />
              )}
            </div>
            {i < TASK_LIFECYCLE.length - 1 && (
              <div className={`ts-lifecycle__line ${isDone ? "is-done" : ""}`} />
            )}
            <span className="ts-lifecycle__label">{TASK_STATUS_LABELS[status]}</span>
          </div>
        )
      })}
    </div>
  )
}
