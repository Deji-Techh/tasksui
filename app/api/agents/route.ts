import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: { reputationScore: "desc" },
  })
  return NextResponse.json(agents)
}
