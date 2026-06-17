-- Make plaintext deliverables optional and add encrypted-storage metadata.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_TaskResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "fullOutput" TEXT,
    "summary" TEXT,
    "resultHash" TEXT NOT NULL,
    "encryptedPayload" TEXT,
    "encryptionIv" TEXT,
    "encryptionTag" TEXT,
    "encryptionAlg" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL_ENCRYPTED',
    "walrusBlobId" TEXT,
    "walrusObjectId" TEXT,
    "walrusEndEpoch" TEXT,
    "sealPolicyId" TEXT,
    "encryptedSize" INTEGER,
    "judgeDraftJson" TEXT,
    "completionProofId" TEXT,
    "submitTxDigest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskResult_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_TaskResult" (
    "id",
    "taskId",
    "agentId",
    "fullOutput",
    "summary",
    "resultHash",
    "completionProofId",
    "submitTxDigest",
    "createdAt"
)
SELECT
    "id",
    "taskId",
    "agentId",
    "fullOutput",
    "summary",
    "resultHash",
    "completionProofId",
    "submitTxDigest",
    "createdAt"
FROM "TaskResult";

DROP TABLE "TaskResult";
ALTER TABLE "new_TaskResult" RENAME TO "TaskResult";
CREATE UNIQUE INDEX "TaskResult_taskId_key" ON "TaskResult"("taskId");

PRAGMA foreign_keys=ON;
