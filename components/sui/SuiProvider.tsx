"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react"
import { SuiGrpcClient } from "@mysten/sui/grpc"

const GRPC_URLS = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
} as const

type SuiNetwork = keyof typeof GRPC_URLS

function defaultNetwork(): SuiNetwork {
  const configured = process.env["NEXT_PUBLIC_SUI_NETWORK"]
  return configured === "mainnet" ? "mainnet" : "testnet"
}

function createTaskSuiDAppKit() {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"

  return createDAppKit({
    networks: ["testnet", "mainnet"],
    defaultNetwork: defaultNetwork(),
    storage: window.localStorage,
    storageKey: "tasksui:selected-wallet",
    slushWalletConfig: isLocalhost
      ? null
      : {
          appName: "TaskSui",
          origin: "https://my.slush.app",
        },
    createClient: (network) =>
      new SuiGrpcClient({
        network,
        baseUrl: GRPC_URLS[network],
      }),
  })
}

type TaskSuiDAppKit = ReturnType<typeof createTaskSuiDAppKit>

declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: TaskSuiDAppKit
  }
}

export function SuiProvider({ children }: { children: ReactNode }) {
  const [dAppKit, setDAppKit] = useState<TaskSuiDAppKit | null>(null)

  useEffect(() => {
    setDAppKit(createTaskSuiDAppKit())
  }, [])

  if (!dAppKit) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
        {null}
      </div>
    )
  }

  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
}
