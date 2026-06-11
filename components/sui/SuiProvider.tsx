"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"

export function SuiProvider({ children }: { children: ReactNode }) {
  const [dAppKit, setDAppKit] = useState<any>(null)
  const [DAppKitProvider, setProvider] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      import("@mysten/dapp-kit-react"),
      import("@mysten/sui/jsonRpc"),
    ]).then(([dappKitModule, suiModule]) => {
      const kit = dappKitModule.createDAppKit({
        networks: ["testnet", "mainnet"],
        createClient: (network: string) =>
          new suiModule.SuiJsonRpcClient({
            network: network as "testnet" | "mainnet",
            url: suiModule.getJsonRpcFullnodeUrl(
              network as "testnet" | "mainnet"
            ),
          }),
        defaultNetwork: (process.env["NEXT_PUBLIC_SUI_NETWORK"] ??
          "testnet") as "testnet" | "mainnet",
      })
      setDAppKit(kit)
      setProvider(() => dappKitModule.DAppKitProvider)
    })
  }, [])

  if (!dAppKit || !DAppKitProvider) {
    return <>{children}</>
  }

  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
}
