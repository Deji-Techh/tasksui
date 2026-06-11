-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suiObjectId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "disputedTasks" INTEGER NOT NULL DEFAULT 0,
    "totalEarnedMist" TEXT NOT NULL DEFAULT '0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "agentCategory" TEXT NOT NULL,
    "rewardMist" TEXT NOT NULL DEFAULT '0',
    "creatorAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_CHAIN',
    "escrowId" TEXT,
    "suiTaskId" TEXT,
    "inputText" TEXT,
    "inputHash" TEXT,
    "outputText" TEXT,
    "proofHash" TEXT,
    "judgeVerdict" TEXT,
    "judgeRecommendation" TEXT,
    "judgeNotes" TEXT,
    "createTxDigest" TEXT,
    "releaseTxDigest" TEXT,
    "cancelTxDigest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agentId" TEXT,
    CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "fullOutput" TEXT NOT NULL,
    "summary" TEXT,
    "resultHash" TEXT NOT NULL,
    "completionProofId" TEXT,
    "submitTxDigest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskResult_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reportHash" TEXT NOT NULL,
    "judgeReportId" TEXT,
    "txDigest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "suiBalanceMist" TEXT,
    "balancesJson" TEXT,
    "objectsJson" TEXT,
    "txsJson" TEXT,
    "packageJson" TEXT,
    "analysisSummary" TEXT,
    "behaviorLabel" TEXT,
    "riskScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT,
    "txDigest" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_suiObjectId_key" ON "Agent"("suiObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskResult_taskId_key" ON "TaskResult"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeReport_taskId_key" ON "JudgeReport"("taskId");

-- CreateIndex
CREATE INDEX "WalletAnalysisCache_walletAddress_idx" ON "WalletAnalysisCache"("walletAddress");
