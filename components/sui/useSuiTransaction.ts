"use client"

import { useState, useCallback } from "react"
import {
  useDAppKit,
  useCurrentAccount,
  useWalletConnection,
} from "@mysten/dapp-kit-react"
import type { Transaction } from "@mysten/sui/transactions"

export function useSuiTransaction() {
  const dAppKit = useDAppKit()
  const account = useCurrentAccount()
  const { isConnected } = useWalletConnection()
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signAndExecute = useCallback(
    async (tx: Transaction) => {
      if (!isConnected || !account) {
        setError("Wallet not connected")
        return null
      }

      setIsSigning(true)
      setError(null)

      try {
        const result = await dAppKit.signAndExecuteTransaction({
          transaction: tx,
        })
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transaction failed"
        setError(message)
        throw err
      } finally {
        setIsSigning(false)
      }
    },
    [dAppKit, isConnected, account],
  )

  return {
    signAndExecute,
    isSigning,
    error,
    isConnected,
    account,
    address: account?.address ?? null,
  }
}
