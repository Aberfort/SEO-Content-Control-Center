-- CreateEnum
CREATE TYPE "TaskOutcomeStatus" AS ENUM ('IMPROVED', 'STABLE', 'DECLINED', 'INCONCLUSIVE');

-- AlterTable
ALTER TABLE "BacklogTask"
ADD COLUMN "outcomeStatus" "TaskOutcomeStatus",
ADD COLUMN "outcomeNote" TEXT,
ADD COLUMN "outcomeVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BulkOperationItem" ADD COLUMN "backlogTaskId" TEXT;

-- CreateIndex
CREATE INDEX "BulkOperationItem_backlogTaskId_idx" ON "BulkOperationItem"("backlogTaskId");

-- AddForeignKey
ALTER TABLE "BulkOperationItem" ADD CONSTRAINT "BulkOperationItem_backlogTaskId_fkey" FOREIGN KEY ("backlogTaskId") REFERENCES "BacklogTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
