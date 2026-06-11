import { Transaction } from "@mysten/sui/transactions"

const PACKAGE_ID = process.env["NEXT_PUBLIC_TASKSUI_PACKAGE_ID"] ?? "0x0"
const MODULE = "marketplace"
const MARKETPLACE_ID =
  process.env["NEXT_PUBLIC_TASKSUI_MARKETPLACE_ID"] ?? "0x0"

export function toBytes(hex: string): Uint8Array {
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
  proofHash: Uint8Array,
) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::submit_completion`,
    arguments: [
      tx.object(taskId),
      tx.object(agentProfileId),
      tx.pure(proofHash),
    ],
  })
  return tx
}

/**
 * Submit judge report on-chain. verdict and recommendation are u8 values.
 */
export function submitJudgeReportTx(
  taskId: string,
  verdict: number,
  recommendation: number,
) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::submit_judge_report`,
    arguments: [
      tx.object(taskId),
      tx.pure.u8(verdict),
      tx.pure.u8(recommendation),
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
