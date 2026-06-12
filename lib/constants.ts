export const AgentCategory = {
  MOVE_AUDIT: "MOVE_AUDIT",
  RESEARCH_SUMMARY: "RESEARCH_SUMMARY",
  WALLET_ANALYSIS: "WALLET_ANALYSIS",
} as const

export type AgentCategory = (typeof AgentCategory)[keyof typeof AgentCategory]

export const TaskStatus = {
  PENDING_CHAIN: "PENDING_CHAIN",
  FUNDED: "FUNDED",
  RUNNING: "RUNNING",
  SUBMITTED: "SUBMITTED",
  JUDGE_REVIEWED: "JUDGE_REVIEWED",
  RELEASED: "RELEASED",
  DISPUTED: "DISPUTED",
  CANCELLED: "CANCELLED",
} as const

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const JudgeVerdict = {
  PASS: "PASS",
  NEEDS_REVISION: "NEEDS_REVISION",
  FAIL: "FAIL",
} as const

export type JudgeVerdict = (typeof JudgeVerdict)[keyof typeof JudgeVerdict]

export const JudgeRecommendation = {
  APPROVE: "APPROVE",
  DISPUTE: "DISPUTE",
} as const

export type JudgeRecommendation =
  (typeof JudgeRecommendation)[keyof typeof JudgeRecommendation]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING_CHAIN: "Pending Chain",
  FUNDED: "Funded",
  RUNNING: "Running",
  SUBMITTED: "Submitted",
  JUDGE_REVIEWED: "Judge Reviewed",
  RELEASED: "Released",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
}

export const AGENT_CATEGORY_LABELS: Record<AgentCategory, string> = {
  MOVE_AUDIT: "Move Audit",
  RESEARCH_SUMMARY: "Research Summary",
  WALLET_ANALYSIS: "Wallet Analysis",
}

export interface AgentSeed {
  id: string
  suiObjectId: string
  ownerAddress: string
  name: string
  category: AgentCategory
  description: string
  systemPrompt: string
  avatarUrl: string | null
  reputationScore: number
  completedTasks: number
  disputedTasks: number
  totalEarnedMist: string
}

const TESTNET_WALLET = "0x5158112d3e7bd335808148553602771c1cc9f5641fabb2ebf38081dc2492898d"

export const SEEDED_AGENTS: AgentSeed[] = [
  {
    id: "agent-move-auditor",
    suiObjectId: "0x6cabcf7623456aa8d8876717ca034f896af8a93bffbc3fd7443912231c1a8009",
    ownerAddress: TESTNET_WALLET,
    name: "Move Auditor Agent",
    category: AgentCategory.MOVE_AUDIT,
    description:
      "Reviews Sui Move code and packages for logic errors, security vulnerabilities, and escrow risks. Provides structured findings with severity ratings and actionable suggestions.",
    systemPrompt:
      "You are a Sui Move auditor. Review the provided Move code for logic errors, security vulnerabilities, missing signer checks, wrong status transitions, escrow release bugs, repeated claim/release risks, missing object ID validation, incorrect agent/task matching, weak dispute/cancellation handling, and unsafe public functions.",
    avatarUrl: null,
    reputationScore: 92,
    completedTasks: 47,
    disputedTasks: 2,
    totalEarnedMist: "47000000000",
  },
  {
    id: "agent-research",
    suiObjectId: "0xdc7084e6e59e87dbd05e663ba9ec3a7769c16aa71f5bfbeaa0726b87a5e3b9c9",
    ownerAddress: TESTNET_WALLET,
    name: "Research Agent",
    category: AgentCategory.RESEARCH_SUMMARY,
    description:
      "Summarizes Sui docs, protocols, proposals, and technical text. Produces clear explanations with key points, builder use cases, risks, and recommended next steps.",
    systemPrompt:
      "You are a Sui ecosystem research agent. Summarize the provided content clearly. Identify important concepts, builder relevance, risks and limitations, and actionable next steps.",
    avatarUrl: null,
    reputationScore: 88,
    completedTasks: 63,
    disputedTasks: 4,
    totalEarnedMist: "51000000000",
  },
  {
    id: "agent-wallet-analysis",
    suiObjectId: "0x2d9bc4052c21910d9230034479087ebd37b14817e84cf7de33f9a15f15ed06ca",
    ownerAddress: TESTNET_WALLET,
    name: "Wallet Analysis Agent",
    category: AgentCategory.WALLET_ANALYSIS,
    description:
      "Analyzes Sui wallet activity, balances, owned objects, and transaction patterns. Labels behavior, calculates risk scores, and flags suspicious activity.",
    systemPrompt:
      "You are a Sui wallet analysis agent. Analyze wallet activity including balance, owned objects, coin balances, recent transactions, and package interactions. Label the wallet behavior (collector, defi_user, deployer, inactive, suspicious, unknown), assign a risk score (0-100), and flag any risk signals.",
    avatarUrl: null,
    reputationScore: 85,
    completedTasks: 31,
    disputedTasks: 3,
    totalEarnedMist: "28000000000",
  },
]

export const TASK_LIFECYCLE: TaskStatus[] = [
  TaskStatus.PENDING_CHAIN,
  TaskStatus.FUNDED,
  TaskStatus.RUNNING,
  TaskStatus.SUBMITTED,
  TaskStatus.JUDGE_REVIEWED,
  TaskStatus.RELEASED,
]

export const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING_CHAIN: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  FUNDED: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  RUNNING: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  SUBMITTED: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950",
  JUDGE_REVIEWED: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
  RELEASED: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  DISPUTED: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
  CANCELLED: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950",
}
