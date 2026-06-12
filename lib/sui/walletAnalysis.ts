import { prisma } from "@/lib/db"

const network =
  (process.env["NEXT_PUBLIC_SUI_NETWORK"] as "testnet" | "mainnet") ??
  "testnet"

const RPC_URL =
  process.env["SUI_RPC_URL"] ??
  (network === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443")

const ADDRESS_RE = /0x[a-fA-F0-9]{1,64}/g
const CACHE_TTL_MS = 5 * 60 * 1000

type SuiRpcResult<T> = {
  jsonrpc: string
  id: number
  result?: T
  error?: { message?: string }
}

type CoinBalance = {
  coinType: string
  totalBalance: string
  coinObjectCount?: number
}

type OwnedObject = {
  data?: {
    objectId?: string
    type?: string
    display?: { data?: Record<string, string> | null }
  }
}

type TransactionBlock = {
  digest: string
  timestampMs?: string
  transaction?: {
    data?: {
      sender?: string
      transaction?: {
        transactions?: Array<{
          MoveCall?: {
            package?: string
            module?: string
            function?: string
          }
        }>
      }
    }
  }
  effects?: {
    status?: { status?: string; error?: string }
  }
  events?: Array<{ type?: string; parsedJson?: Record<string, unknown> }>
}

type TransactionPage = {
  data?: TransactionBlock[]
}

export type WalletAnalysisContext = {
  walletAddress: string
  suiBalanceMist: string
  coinBalances: CoinBalance[]
  ownedObjectSample: Array<{
    objectId: string
    type: string
    displayName?: string
  }>
  recentTransactions: Array<{
    digest: string
    timestampMs?: string
    sender?: string
    status?: string
    moveCalls: string[]
    eventTypes: string[]
  }>
  packageInteractions: Array<{
    packageId: string
    calls: number
    functions: string[]
  }>
  signals: string[]
}

function normalizeAddress(address: string) {
  return address.toLowerCase()
}

export function extractSuiAddress(input: string): string | null {
  const matches = input.match(ADDRESS_RE) ?? []
  const candidate = matches.find((value) => value.length >= 10)
  return candidate ? normalizeAddress(candidate) : null
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  })

  const data = (await response.json()) as SuiRpcResult<T>
  if (data.error) {
    throw new Error(data.error.message ?? "Sui RPC error")
  }
  return data.result as T
}

function summarizeTransactions(txs: TransactionBlock[]) {
  return txs.slice(0, 30).map((tx) => {
    const moveCalls =
      tx.transaction?.data?.transaction?.transactions
        ?.map((item) => item.MoveCall)
        .filter(Boolean)
        .map((call) => `${call?.package}::${call?.module}::${call?.function}`) ??
      []

    return {
      digest: tx.digest,
      timestampMs: tx.timestampMs,
      sender: tx.transaction?.data?.sender,
      status: tx.effects?.status?.status,
      moveCalls,
      eventTypes: tx.events?.map((event) => event.type ?? "").filter(Boolean).slice(0, 8) ?? [],
    }
  })
}

function summarizePackages(transactions: ReturnType<typeof summarizeTransactions>) {
  const packages = new Map<string, { calls: number; functions: Set<string> }>()

  for (const tx of transactions) {
    for (const moveCall of tx.moveCalls) {
      const [packageId, moduleName, functionName] = moveCall.split("::")
      if (!packageId) continue
      const current = packages.get(packageId) ?? { calls: 0, functions: new Set<string>() }
      current.calls += 1
      if (moduleName && functionName) current.functions.add(`${moduleName}::${functionName}`)
      packages.set(packageId, current)
    }
  }

  return Array.from(packages.entries())
    .map(([packageId, value]) => ({
      packageId,
      calls: value.calls,
      functions: Array.from(value.functions).slice(0, 8),
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 12)
}

function buildSignals(context: Omit<WalletAnalysisContext, "signals">) {
  const signals: string[] = []
  const balance = BigInt(context.suiBalanceMist || "0")
  const txCount = context.recentTransactions.length

  if (balance === BigInt(0)) signals.push("No SUI balance found.")
  if (txCount === 0) signals.push("No recent outgoing or incoming transactions found.")
  if (context.ownedObjectSample.length > 20) signals.push("Wallet owns many objects in the sample window.")
  if (context.packageInteractions.length > 5) signals.push("Wallet has interacted with multiple Move packages recently.")
  if (context.recentTransactions.some((tx) => tx.status && tx.status !== "success")) {
    signals.push("At least one sampled transaction did not succeed.")
  }

  return signals
}

export async function getWalletAnalysisContext(
  taskText: string,
): Promise<WalletAnalysisContext | null> {
  const walletAddress = extractSuiAddress(taskText)
  if (!walletAddress) return null

  const cached = await prisma.walletAnalysisCache.findFirst({
    where: { walletAddress },
    orderBy: { createdAt: "desc" },
  })

  if (cached && Date.now() - cached.createdAt.getTime() < CACHE_TTL_MS) {
    return {
      walletAddress,
      suiBalanceMist: cached.suiBalanceMist ?? "0",
      coinBalances: cached.balancesJson ? JSON.parse(cached.balancesJson) : [],
      ownedObjectSample: cached.objectsJson ? JSON.parse(cached.objectsJson) : [],
      recentTransactions: cached.txsJson ? JSON.parse(cached.txsJson) : [],
      packageInteractions: cached.packageJson ? JSON.parse(cached.packageJson) : [],
      signals: cached.analysisSummary ? JSON.parse(cached.analysisSummary) : [],
    }
  }

  const [balance, balances, objects, fromTxs, toTxs] = await Promise.all([
    rpcCall<{ totalBalance?: string }>("suix_getBalance", [walletAddress]).catch(() => ({ totalBalance: "0" })),
    rpcCall<CoinBalance[]>("suix_getAllBalances", [walletAddress]).catch(() => []),
    rpcCall<{ data?: OwnedObject[] }>("suix_getOwnedObjects", [
      walletAddress,
      {
        options: {
          showType: true,
          showDisplay: true,
          showOwner: true,
        },
      },
      null,
      30,
    ]).catch(() => ({ data: [] })),
    rpcCall<TransactionPage>("suix_queryTransactionBlocks", [
      {
        filter: { FromAddress: walletAddress },
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      },
      null,
      20,
      true,
    ]).catch(() => ({ data: [] })),
    rpcCall<TransactionPage>("suix_queryTransactionBlocks", [
      {
        filter: { ToAddress: walletAddress },
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      },
      null,
      20,
      true,
    ]).catch(() => ({ data: [] })),
  ])

  const txMap = new Map<string, TransactionBlock>()
  for (const tx of [...(fromTxs.data ?? []), ...(toTxs.data ?? [])]) {
    txMap.set(tx.digest, tx)
  }

  const ownedObjectSample =
    objects.data?.map((object) => ({
      objectId: object.data?.objectId ?? "",
      type: object.data?.type ?? "unknown",
      displayName: object.data?.display?.data?.name,
    })).filter((object) => object.objectId) ?? []

  const recentTransactions = summarizeTransactions(Array.from(txMap.values()))
  const packageInteractions = summarizePackages(recentTransactions)
  const contextWithoutSignals = {
    walletAddress,
    suiBalanceMist: balance.totalBalance ?? "0",
    coinBalances: balances.slice(0, 20),
    ownedObjectSample,
    recentTransactions,
    packageInteractions,
  }
  const context = {
    ...contextWithoutSignals,
    signals: buildSignals(contextWithoutSignals),
  }

  await prisma.walletAnalysisCache.create({
    data: {
      walletAddress,
      suiBalanceMist: context.suiBalanceMist,
      balancesJson: JSON.stringify(context.coinBalances),
      objectsJson: JSON.stringify(context.ownedObjectSample),
      txsJson: JSON.stringify(context.recentTransactions),
      packageJson: JSON.stringify(context.packageInteractions),
      analysisSummary: JSON.stringify(context.signals),
    },
  })

  return context
}

export function formatWalletAnalysisContext(context: WalletAnalysisContext) {
  return `Sui wallet data fetched from RPC:

Wallet: ${context.walletAddress}
SUI balance: ${context.suiBalanceMist} MIST

Coin balances:
${JSON.stringify(context.coinBalances, null, 2)}

Owned object sample:
${JSON.stringify(context.ownedObjectSample, null, 2)}

Recent transactions:
${JSON.stringify(context.recentTransactions, null, 2)}

Package interactions:
${JSON.stringify(context.packageInteractions, null, 2)}

Computed signals:
${context.signals.length > 0 ? context.signals.map((signal) => `- ${signal}`).join("\n") : "- No local risk signals from the sampled data."}`
}
