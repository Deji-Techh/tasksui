import crypto from "crypto"

type TaskForDeliverable = {
  id: string
  creatorAddress: string | null
  suiTaskId: string | null
}

type ResultForUnlock = {
  fullOutput?: string | null
  encryptedPayload?: string | null
  encryptionIv?: string | null
  encryptionTag?: string | null
  encryptionAlg?: string | null
  storageProvider?: string | null
  walrusBlobId?: string | null
  resultHash: string
  sealPolicyId?: string | null
}

type EncryptedDeliverable = {
  summary: string
  resultHash: string
  encryptedPayload: string | null
  encryptionIv: string
  encryptionTag: string
  encryptionAlg: "AES-256-GCM"
  storageProvider: "LOCAL_ENCRYPTED" | "WALRUS"
  walrusBlobId: string | null
  walrusObjectId: string | null
  walrusEndEpoch: string | null
  sealPolicyId: string
  encryptedSize: number
}

const ENCRYPTION_ALG = "AES-256-GCM" as const
const NODE_ENCRYPTION_ALG = "aes-256-gcm"

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

export function buildUnlockMessage(taskId: string, address: string) {
  return [
    "TaskSui unlock deliverable",
    `Task ID: ${taskId}`,
    `Wallet: ${address}`,
    "Only sign this message if you are unlocking a released TaskSui deliverable.",
  ].join("\n")
}

function getEncryptionKey() {
  const configured = process.env["TASKSUI_DELIVERABLE_KEY"]
  if (configured) {
    const maybeBase64 = Buffer.from(configured, "base64")
    if (maybeBase64.length === 32) return maybeBase64

    const maybeHex = Buffer.from(configured, "hex")
    if (maybeHex.length === 32) return maybeHex

    throw new Error("TASKSUI_DELIVERABLE_KEY must be a 32-byte base64 or 64-character hex key")
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TASKSUI_DELIVERABLE_KEY is required in production")
  }

  return crypto.createHash("sha256").update("tasksui-local-dev-deliverable-key").digest()
}

function policyIdForTask(task: TaskForDeliverable) {
  const prefix = process.env["SEAL_POLICY_PREFIX"] ?? "tasksui-seal-policy"
  return `${prefix}:${task.suiTaskId ?? task.id}`
}

function aadForTask(task: TaskForDeliverable, resultHash: string, sealPolicyId: string) {
  return Buffer.from(JSON.stringify({
    taskId: task.id,
    creatorAddress: task.creatorAddress,
    suiTaskId: task.suiTaskId,
    resultHash,
    sealPolicyId,
  }))
}

function summarizeOutput(fullOutput: string) {
  const firstParagraph =
    fullOutput
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .find(Boolean) ?? ""
  return firstParagraph.slice(0, 500)
}

async function storeOnWalrus(encryptedBytes: Buffer): Promise<{
  walrusBlobId: string
  walrusObjectId: string | null
  walrusEndEpoch: string | null
} | null> {
  const publisherUrl = process.env["WALRUS_PUBLISHER_URL"]
  if (!publisherUrl) return null

  const epochs = process.env["WALRUS_EPOCHS"] ?? "5"
  const url = new URL(publisherUrl)
  url.pathname = url.pathname.replace(/\/$/, "")
  url.searchParams.set("epochs", epochs)

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
  }
  const token = process.env["WALRUS_PUBLISHER_TOKEN"]
  if (token) headers["Authorization"] = `Bearer ${token}`

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(encryptedBytes),
  })

  if (!response.ok) {
    throw new Error(`Walrus upload failed with ${response.status}`)
  }

  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  const newlyCreated = data["newlyCreated"] as Record<string, unknown> | undefined
  const alreadyCertified = data["alreadyCertified"] as Record<string, unknown> | undefined
  const blobObject =
    (newlyCreated?.["blobObject"] as Record<string, unknown> | undefined) ??
    (alreadyCertified?.["blobObject"] as Record<string, unknown> | undefined)

  const walrusBlobId =
    String(data["blobId"] ?? newlyCreated?.["blobId"] ?? alreadyCertified?.["blobId"] ?? blobObject?.["blobId"] ?? "")
  if (!walrusBlobId) {
    throw new Error("Walrus upload did not return a blob ID")
  }

  return {
    walrusBlobId,
    walrusObjectId: blobObject?.["id"] ? String(blobObject["id"]) : null,
    walrusEndEpoch: blobObject?.["storage"] ? String((blobObject["storage"] as Record<string, unknown>)["endEpoch"] ?? "") : null,
  }
}

async function readFromWalrus(blobId: string) {
  const aggregatorUrl = process.env["WALRUS_AGGREGATOR_URL"]
  if (!aggregatorUrl) {
    throw new Error("WALRUS_AGGREGATOR_URL is required to read Walrus deliverables")
  }

  const base = aggregatorUrl.replace(/\/$/, "")
  const response = await fetch(`${base}/v1/blobs/${encodeURIComponent(blobId)}`)
  if (!response.ok) {
    throw new Error(`Walrus read failed with ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

export async function encryptDeliverable(
  task: TaskForDeliverable,
  fullOutput: string,
): Promise<EncryptedDeliverable> {
  const resultHash = crypto.createHash("sha256").update(fullOutput).digest("hex")
  const sealPolicyId = policyIdForTask(task)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(NODE_ENCRYPTION_ALG, getEncryptionKey(), iv)
  cipher.setAAD(aadForTask(task, resultHash, sealPolicyId))
  const ciphertext = Buffer.concat([cipher.update(fullOutput, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  const walrus = await storeOnWalrus(ciphertext)

  return {
    summary: summarizeOutput(fullOutput),
    resultHash,
    encryptedPayload: walrus ? null : ciphertext.toString("base64"),
    encryptionIv: iv.toString("base64"),
    encryptionTag: tag.toString("base64"),
    encryptionAlg: ENCRYPTION_ALG,
    storageProvider: walrus ? "WALRUS" : "LOCAL_ENCRYPTED",
    walrusBlobId: walrus?.walrusBlobId ?? null,
    walrusObjectId: walrus?.walrusObjectId ?? null,
    walrusEndEpoch: walrus?.walrusEndEpoch ?? null,
    sealPolicyId,
    encryptedSize: ciphertext.byteLength,
  }
}

export async function decryptDeliverable(
  task: TaskForDeliverable,
  result: ResultForUnlock,
) {
  if (result.fullOutput) {
    return result.fullOutput
  }

  if (!result.encryptionIv || !result.encryptionTag) {
    throw new Error("Deliverable encryption metadata is missing")
  }

  const ciphertext =
    result.storageProvider === "WALRUS"
      ? await readFromWalrus(result.walrusBlobId ?? "")
      : Buffer.from(result.encryptedPayload ?? "", "base64")

  if (!ciphertext.length) {
    throw new Error("Encrypted deliverable payload is missing")
  }

  const sealPolicyId = result.sealPolicyId ?? policyIdForTask(task)
  const decipher = crypto.createDecipheriv(
    NODE_ENCRYPTION_ALG,
    getEncryptionKey(),
    Buffer.from(result.encryptionIv, "base64"),
  )
  decipher.setAAD(aadForTask(task, result.resultHash, sealPolicyId))
  decipher.setAuthTag(Buffer.from(result.encryptionTag, "base64"))

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex")
  if (hash !== result.resultHash) {
    throw new Error("Deliverable hash mismatch")
  }

  return plaintext
}

export function publicDeliverableId(task: TaskForDeliverable) {
  return base64Url(`${task.id}:${task.suiTaskId ?? "offchain"}`)
}
