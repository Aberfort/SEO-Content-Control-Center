-- CreateTable
CREATE TABLE "GscDailyMetric" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "propertyUrl" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscDailyMetric_siteId_propertyUrl_date_key" ON "GscDailyMetric"("siteId", "propertyUrl", "date");

-- CreateIndex
CREATE INDEX "GscDailyMetric_siteId_propertyUrl_date_idx" ON "GscDailyMetric"("siteId", "propertyUrl", "date");

-- AddForeignKey
ALTER TABLE "GscDailyMetric" ADD CONSTRAINT "GscDailyMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
