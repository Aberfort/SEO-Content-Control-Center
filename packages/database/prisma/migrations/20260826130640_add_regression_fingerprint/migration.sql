-- AlterTable
ALTER TABLE "Regression" ADD COLUMN     "fingerprint" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Regression_organizationId_siteId_fingerprint_key" ON "Regression"("organizationId", "siteId", "fingerprint");
