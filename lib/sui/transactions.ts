import { Transaction } from "@mysten/sui/transactions"

const PACKAGE_ID = process.env["NEXT_PUBLIC_TASKSUI_PACKAGE_ID"] ?? "0x0"
const MODULE = "marketplace"
const MARKETPLACE_ID =
  process.env["NEXT_PUBLIC_TASKSUI_MARKETPLACE_ID"] ?? "0x0"

function toBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(h.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Create task + fund escrow. Splits payment from gas coin.
 */
export function createTaskTx(
  description: string,
  category: number,
  rewardMist: bigint,
) {
  const descriptionHash = new Uint8Array(
    new TextEncoder().encode(description).slice(0, 32),
  )
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(rewardMist)])
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_task`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure(descriptionHash),
      tx.pure.u8(category),
      tx.pure.u64(rewardMist),
      coin,
    ],
  })
  return tx
}

/**
 * Assign agent after funding.
 */
export function assignAgentTx(taskId: string, agentProfileId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::assign_agent`,
    arguments: [tx.object(taskId), tx.object(agentProfileId)],
  })
  return tx
}

/**
 * Submit completion proof on-chain.
 */
export function submitCompletionTx(
  taskId: string,
  agentProfileId: string,
  resultHash: Uint8Array,
  summary: string,
) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::submit_completion`,
    arguments: [
      tx.object(taskId),
      tx.object(agentProfileId),
      tx.pure(resultHash),
      tx.pure.string(summary),
    ],
  })
  return tx
}

/**
 * Submit judge report on-chain.
 */
export function submitJudgeReportTx(
  taskId: string,
  verdict: string,
  score: number,
  reportHash: Uint8Array,
) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::submit_judge_report`,
    arguments: [
      tx.object(taskId),
      tx.pure.string(verdict),
      tx.pure.u64(BigInt(score)),
      tx.pure(reportHash),
    ],
  })
  return tx
}

/**
 * Approve work and release escrow to agent owner.
 */
export function approveAndReleaseTx(taskId: string, agentProfileId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::approve_and_release`,
    arguments: [tx.object(taskId), tx.object(agentProfileId)],
  })
  return tx
}

/**
 * Cancel task and refund escrow to creator.
 */
export function cancelTaskTx(taskId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::cancel_task`,
    arguments: [tx.object(taskId)],
  })
  return tx
}

/**
 * Mark task as disputed and refund.
 */
export function markDisputedTx(taskId: string, agentProfileId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::mark_disputed`,
    arguments: [tx.object(taskId), tx.object(agentProfileId)],
  })
  return tx
}
