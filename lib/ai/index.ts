import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { AgentCategory } from "@/lib/constants"
import { formatWalletAnalysisContext, getWalletAnalysisContext } from "@/lib/sui/walletAnalysis"

const groq = createOpenAI({
  baseURL: process.env["GROQ_BASE_URL"] ?? "https://api.groq.com/openai/v1",
  apiKey: process.env["GROQ_API_KEY"],
})

const model = groq(process.env["GROQ_MODEL"] ?? "llama-3.3-70b-versatile")

const SYSTEM_PROMPTS: Record<AgentCategory, string> = {
  MOVE_AUDIT:
    "You are a Sui Move auditor. Review the provided Move code for logic errors, security vulnerabilities, missing signer checks, wrong status transitions, escrow release bugs, repeated claim/release risks, missing object ID validation, incorrect agent/task matching, weak dispute/cancellation handling, and unsafe public functions. Format your output in markdown with severity levels (Critical, High, Medium, Low) and actionable recommendations.",
  RESEARCH_SUMMARY:
    "You are a Sui ecosystem research agent. Summarize the provided content clearly. Identify important concepts, builder relevance, risks and limitations, and actionable next steps. Format your output in markdown with clear sections.",
  WALLET_ANALYSIS:
    "You are a Sui wallet analysis agent. Analyze wallet activity including balance, owned objects, coin balances, recent transactions, and package interactions. Label the wallet behavior (collector, defi_user, deployer, inactive, suspicious, unknown), assign a risk score (0-100), and flag any risk signals. Format your output in markdown.",
}

export async function runAgent(
  agentCategory: AgentCategory,
  systemPrompt: string,
  taskDescription: string
): Promise<string> {
  const system = SYSTEM_PROMPTS[agentCategory] ?? systemPrompt
  let prompt = taskDescription

  if (agentCategory === AgentCategory.WALLET_ANALYSIS) {
    const context = await getWalletAnalysisContext(taskDescription)
    prompt = context
      ? `${formatWalletAnalysisContext(context)}

User task:
${taskDescription}

Use the RPC data as the source of truth. If the sampled data is incomplete, say what is missing instead of inventing activity.`
      : `${taskDescription}

No valid Sui wallet address was found in the task input. Ask the user to provide a Sui address and avoid pretending wallet data was fetched.`
  }

  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: 0.3,
  })

  return text
}

export async function runJudge(
  taskDescription: string,
  agentOutput: string
): Promise<{
  verdict: string
  recommendation: string
  notes: string
}> {
  const system = `You are an AI judge reviewing agent work. Compare the task description against the agent's output. Determine if the work was completed correctly.

Respond with a JSON object with these fields:
- verdict: "PASS" | "NEEDS_REVISION" | "FAIL"
- recommendation: "APPROVE" | "DISPUTE"
- notes: A paragraph explaining your reasoning and what the agent did well or missed`

  const prompt = `Task description:
${taskDescription}

Agent output:
${agentOutput}`

  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: 0.1,
  })

  try {
    const parsed = JSON.parse(text)
    const validVerdicts = ["PASS", "NEEDS_REVISION", "FAIL"]
    const validRecommendations = ["APPROVE", "DISPUTE"]
    if (!validVerdicts.includes(parsed.verdict) || !validRecommendations.includes(parsed.recommendation)) {
      throw new Error("Invalid verdict or recommendation")
    }
    return parsed
  } catch {
    return {
      verdict: "NEEDS_REVISION",
      recommendation: "DISPUTE",
      notes: text,
    }
  }
}
