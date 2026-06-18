import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { SEEDED_AGENTS } from "@/lib/constants"

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { reputationScore: "desc" },
    })
    return NextResponse.json(agents)
  } catch {
    return NextResponse.json(SEEDED_AGENTS)
  }
}
