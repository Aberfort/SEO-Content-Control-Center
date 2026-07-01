CREATE TABLE "SyncedContentItem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "status" TEXT NOT NULL,
  "modifiedAt" TIMESTAMP(3) NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SyncedContentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncedContentItem_siteId_externalId_key" ON "SyncedContentItem"("siteId", "externalId");
CREATE INDEX "SyncedContentItem_organizationId_siteId_modifiedAt_idx" ON "SyncedContentItem"("organizationId", "siteId", "modifiedAt");
CREATE INDEX "SyncedContentItem_organizationId_lastSeenAt_idx" ON "SyncedContentItem"("organizationId", "lastSeenAt");

ALTER TABLE "SyncedContentItem"
ADD CONSTRAINT "SyncedContentItem_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
