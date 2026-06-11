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

/** Verify a transaction digest exists and was successful on Sui. */
export async function verifySuiTx(
  digest: string,
  expectedSender?: string,
): Promise<{ ok: boolean; sender: string; error?: string }> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getTransactionBlock",
        params: [digest, { showEffects: true }],
      }),
    })
    const json = await res.json()
    const tx = json.result
    if (!tx) return { ok: false, sender: "", error: "Transaction not found" }

    const status = tx.effects?.status?.status
    if (status !== "success") {
      return { ok: false, sender: "", error: `Transaction status: ${status}` }
    }

    const sender = tx.transaction?.data?.sender ?? ""
    if (expectedSender && sender !== expectedSender) {
      return { ok: false, sender, error: "Sender mismatch" }
    }

    return { ok: true, sender }
  } catch (err) {
    return { ok: false, sender: "", error: String(err) }
  }
}
