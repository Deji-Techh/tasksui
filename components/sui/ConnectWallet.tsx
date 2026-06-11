"use client"

import dynamic from "next/dynamic"

const ConnectButton = dynamic(
  () => import("@mysten/dapp-kit-react/ui").then((m) => ({ default: m.ConnectButton })),
  { ssr: false }
)

export function ConnectWallet() {
  return <ConnectButton />
}
