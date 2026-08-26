-- CreateEnum
CREATE TYPE "OperationApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "OperationApproval" (
    "id" TEXT NOT NULL,
    "bulkOperationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "OperationApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approverEmail" TEXT,
    "requestedByUserId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationApproval_tokenHash_key" ON "OperationApproval"("tokenHash");

-- CreateIndex
CREATE INDEX "OperationApproval_bulkOperationId_idx" ON "OperationApproval"("bulkOperationId");

-- AddForeignKey
ALTER TABLE "OperationApproval" ADD CONSTRAINT "OperationApproval_bulkOperationId_fkey" FOREIGN KEY ("bulkOperationId") REFERENCES "BulkOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationApproval" ADD CONSTRAINT "OperationApproval_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
