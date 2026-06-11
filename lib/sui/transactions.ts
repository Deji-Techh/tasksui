import { Transaction } from "@mysten/sui/transactions"

const PACKAGE_ID = process.env["NEXT_PUBLIC_TASKSUI_PACKAGE_ID"] ?? "0x0"
const MODULE = "marketplace"

export function createTaskTx(
  agentProfileId: string,
  descriptionHash: Uint8Array,
  category: number,
  coinObjectId: string,
) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_task_with_escrow`,
    arguments: [
      tx.object(agentProfileId),
      tx.pure(descriptionHash),
      tx.pure.u8(category),
      tx.object(coinObjectId),
    ],
  })
  return tx
}

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

export function approveAndReleaseTx(taskId: string, agentProfileId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::approve_and_release`,
    arguments: [tx.object(taskId), tx.object(agentProfileId)],
  })
  return tx
}

export function cancelTaskTx(taskId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::cancel_before_submission`,
    arguments: [tx.object(taskId)],
  })
  return tx
}

export function markDisputedTx(taskId: string, agentProfileId: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::mark_disputed`,
    arguments: [tx.object(taskId), tx.object(agentProfileId)],
  })
  return tx
}
