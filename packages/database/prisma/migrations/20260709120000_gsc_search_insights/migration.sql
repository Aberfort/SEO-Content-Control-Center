-- Persist top Google Search Console page/query Search Analytics rows per synced date range.
CREATE TABLE "GscSearchInsight" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "propertyUrl" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscSearchInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GscSearchInsight_range_page_query_key" ON "GscSearchInsight"("siteId", "propertyUrl", "startDate", "endDate", "page", "query");

CREATE INDEX "GscSearchInsight_range_idx" ON "GscSearchInsight"("siteId", "propertyUrl", "startDate", "endDate");

CREATE INDEX "GscSearchInsight_syncedAt_idx" ON "GscSearchInsight"("siteId", "propertyUrl", "syncedAt");

ALTER TABLE "GscSearchInsight" ADD CONSTRAINT "GscSearchInsight_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
