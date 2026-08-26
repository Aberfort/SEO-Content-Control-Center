-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('WORDPRESS', 'CRAWLER', 'GSC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RegressionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "MonitoredUrl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrlSnapshot" (
    "id" TEXT NOT NULL,
    "monitoredUrlId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "finalUrl" TEXT,
    "responseTimeMs" INTEGER,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1" TEXT,
    "canonical" TEXT,
    "metaRobots" TEXT,
    "xRobotsTag" TEXT,
    "hasStructuredData" BOOLEAN,
    "hasGa4" BOOLEAN,
    "hasGtm" BOOLEAN,
    "contentHash" TEXT,
    "htmlHash" TEXT,
    "extra" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UrlSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "monitoredUrlId" TEXT,
    "source" "EventSource" NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regression" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "monitoredUrlId" TEXT,
    "status" "RegressionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "EventSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegressionEvent" (
    "id" TEXT NOT NULL,
    "regressionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contributing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitoredUrl_organizationId_siteId_isActive_idx" ON "MonitoredUrl"("organizationId", "siteId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredUrl_siteId_urlHash_key" ON "MonitoredUrl"("siteId", "urlHash");

-- CreateIndex
CREATE INDEX "UrlSnapshot_monitoredUrlId_capturedAt_idx" ON "UrlSnapshot"("monitoredUrlId", "capturedAt");

-- CreateIndex
CREATE INDEX "UrlSnapshot_organizationId_siteId_capturedAt_idx" ON "UrlSnapshot"("organizationId", "siteId", "capturedAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_siteId_occurredAt_idx" ON "Event"("organizationId", "siteId", "occurredAt");

-- CreateIndex
CREATE INDEX "Event_siteId_type_idx" ON "Event"("siteId", "type");

-- CreateIndex
CREATE INDEX "Event_siteId_severity_idx" ON "Event"("siteId", "severity");

-- CreateIndex
CREATE INDEX "Event_monitoredUrlId_occurredAt_idx" ON "Event"("monitoredUrlId", "occurredAt");

-- CreateIndex
CREATE INDEX "Regression_organizationId_siteId_status_idx" ON "Regression"("organizationId", "siteId", "status");

-- CreateIndex
CREATE INDEX "Regression_siteId_detectedAt_idx" ON "Regression"("siteId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RegressionEvent_regressionId_eventId_key" ON "RegressionEvent"("regressionId", "eventId");

-- AddForeignKey
ALTER TABLE "MonitoredUrl" ADD CONSTRAINT "MonitoredUrl_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlSnapshot" ADD CONSTRAINT "UrlSnapshot_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regression" ADD CONSTRAINT "Regression_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regression" ADD CONSTRAINT "Regression_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionEvent" ADD CONSTRAINT "RegressionEvent_regressionId_fkey" FOREIGN KEY ("regressionId") REFERENCES "Regression"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionEvent" ADD CONSTRAINT "RegressionEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
