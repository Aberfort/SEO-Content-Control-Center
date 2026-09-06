-- CreateTable
CREATE TABLE "PlanGrantCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "redeemedByOrgId" TEXT,
    "redeemedByUserId" TEXT,

    CONSTRAINT "PlanGrantCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanGrantCode_code_key" ON "PlanGrantCode"("code");

-- CreateIndex
CREATE INDEX "PlanGrantCode_createdAt_idx" ON "PlanGrantCode"("createdAt");
