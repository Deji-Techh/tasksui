import { NextRequest, NextResponse } from "next/server"
import { verifyPersonalMessageSignature } from "@mysten/sui/verify"
import { prisma } from "@/lib/db"
import { buildUnlockMessage, decryptDeliverable } from "@/lib/deliverables"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const address = typeof body.address === "string" ? body.address : ""
    const signature = typeof body.signature === "string" ? body.signature : ""

    if (!address || !signature) {
      return NextResponse.json(
        { error: "Wallet signature required" },
        { status: 400 },
      )
    }

    const message = buildUnlockMessage(id, address)
    await verifyPersonalMessageSignature(
      new TextEncoder().encode(message),
      signature,
      { address },
    )

    const task = await prisma.task.findUnique({
      where: { id },
      include: { result: true },
    })

    if (!task || !task.result) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    if (task.creatorAddress !== address) {
      return NextResponse.json({ error: "Not authorized to unlock this task" }, { status: 403 })
    }
    if (task.status !== "RELEASED") {
      return NextResponse.json({ error: "Deliverable unlocks after escrow release" }, { status: 403 })
    }

    const fullOutput = await decryptDeliverable(task, task.result)

    return NextResponse.json({
      fullOutput,
      resultHash: task.result.resultHash,
      storageProvider: task.result.storageProvider,
      walrusBlobId: task.result.walrusBlobId,
      sealPolicyId: task.result.sealPolicyId,
    })
  } catch (err) {
    console.error("Deliverable unlock failed", err)
    return NextResponse.json(
      { error: "Failed to unlock deliverable" },
      { status: 400 },
    )
  }
}
