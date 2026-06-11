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
