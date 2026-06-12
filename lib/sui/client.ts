const network =
  (process.env["NEXT_PUBLIC_SUI_NETWORK"] as "testnet" | "mainnet") ??
  "testnet"

export const PACKAGE_ID =
  process.env["NEXT_PUBLIC_TASKSUI_PACKAGE_ID"] ?? "0x0"

export const EXPLORER_BASE =
  network === "mainnet"
    ? "https://suiexplorer.com"
    : "https://testnet.suivision.xyz"

export function explorerLink(type: "object" | "tx" | "address", id: string) {
  return `${EXPLORER_BASE}/${type}/${id}`
}

const RPC_URL =
  network === "mainnet"
    ? "https://fullnode.mainnet.sui.io"
    : "https://fullnode.testnet.sui.io"

type VerifyAction =
  | "confirm_chain"
  | "confirm_submission"
  | "confirm_judge"
  | "release"
  | "dispute"
  | "cancel"

type TxEvent = {
  type?: string
  parsedJson?: Record<string, unknown>
}

type ObjectChange = {
  type?: string
  objectId?: string
  objectType?: string
}

type MoveCall = {
  package?: string
  module?: string
  function?: string
}

type TransactionBlock = {
  effects?: { status?: { status?: string } }
  transaction?: {
    data?: {
      sender?: string
      transaction?: {
        transactions?: Array<{ MoveCall?: MoveCall }>
      }
    }
  }
  events?: TxEvent[]
  objectChanges?: ObjectChange[]
}

const EXPECTED_EVENTS: Record<Exclude<VerifyAction, "confirm_chain">, string> = {
  confirm_submission: "CompletionSubmitted",
  confirm_judge: "JudgeReviewed",
  release: "EscrowReleased",
  dispute: "TaskDisputed",
  cancel: "TaskCancelled",
}

const EXPECTED_FUNCTIONS: Record<VerifyAction, string[]> = {
  confirm_chain: ["create_task"],
  confirm_submission: ["assign_agent", "submit_completion"],
  confirm_judge: ["submit_judge_report"],
  release: ["approve_and_release"],
  dispute: ["mark_disputed"],
  cancel: ["cancel_task"],
}

function normalizeId(value?: string | null) {
  return value?.toLowerCase() ?? ""
}

function parsedTaskId(event: TxEvent) {
  const value = event.parsedJson?.task_id
  return typeof value === "string" ? value : ""
}

function hasTaskEvent(tx: TransactionBlock, eventName: string, suiTaskId?: string) {
  return (tx.events ?? []).some((event) => {
    if (!event.type?.includes(`::marketplace::${eventName}`)) return false
    if (!suiTaskId) return true
    return normalizeId(parsedTaskId(event)) === normalizeId(suiTaskId)
  })
}

function hasExpectedMoveCalls(tx: TransactionBlock, action: VerifyAction) {
  const calls =
    tx.transaction?.data?.transaction?.transactions
      ?.map((item) => item.MoveCall)
      .filter((call): call is MoveCall => Boolean(call)) ?? []

  const expectedFunctions = EXPECTED_FUNCTIONS[action]
  return expectedFunctions.every((functionName) =>
    calls.some((call) =>
      normalizeId(call.package) === normalizeId(PACKAGE_ID) &&
      call.module === "marketplace" &&
      call.function === functionName,
    ),
  )
}

/** Verify a transaction digest exists, succeeded, and matches the expected TaskSui action. */
export async function verifySuiTx(
  digest: string,
  expectedSender?: string,
  expected?: {
    action?: VerifyAction
    suiTaskId?: string
  },
): Promise<{ ok: boolean; sender: string; error?: string }> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getTransactionBlock",
        params: [
          digest,
          {
            showEffects: true,
            showInput: true,
            showEvents: true,
            showObjectChanges: true,
          },
        ],
      }),
    })
    const json = await res.json()
    const tx = json.result as TransactionBlock | undefined
    if (!tx) return { ok: false, sender: "", error: "Transaction not found" }

    const status = tx.effects?.status?.status
    if (status !== "success") {
      return { ok: false, sender: "", error: `Transaction status: ${status}` }
    }

    const sender = tx.transaction?.data?.sender ?? ""
    if (expectedSender && normalizeId(sender) !== normalizeId(expectedSender)) {
      return { ok: false, sender, error: "Sender mismatch" }
    }

    if (expected?.action) {
      if (!hasExpectedMoveCalls(tx, expected.action)) {
        return { ok: false, sender, error: "Expected TaskSui Move call not found" }
      }

      if (expected.action === "confirm_chain") {
        const createdTask = (tx.objectChanges ?? []).find(
          (change) =>
            change.type === "created" &&
            normalizeId(change.objectId) === normalizeId(expected.suiTaskId) &&
            String(change.objectType ?? "").includes("::marketplace::Task"),
        )
        if (!createdTask) {
          return { ok: false, sender, error: "Created Task object not found in transaction" }
        }
        if (!hasTaskEvent(tx, "TaskCreated", expected.suiTaskId)) {
          return { ok: false, sender, error: "TaskCreated event not found" }
        }
      } else {
        const eventName = EXPECTED_EVENTS[expected.action]
        if (!hasTaskEvent(tx, eventName, expected.suiTaskId)) {
          return { ok: false, sender, error: `${eventName} event not found for task` }
        }
      }
    }

    return { ok: true, sender }
  } catch (err) {
    return { ok: false, sender: "", error: String(err) }
  }
}
