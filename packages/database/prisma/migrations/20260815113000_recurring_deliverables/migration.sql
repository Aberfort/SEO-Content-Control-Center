-- CreateTable
CREATE TABLE "DeliveryPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "criticalAlerts" BOOLEAN NOT NULL DEFAULT true,
    "trafficDropAlerts" BOOLEAN NOT NULL DEFAULT true,
    "overdueAlerts" BOOLEAN NOT NULL DEFAULT true,
    "failedOperationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPreference_organizationId_userId_key" ON "DeliveryPreference"("organizationId", "userId");
CREATE INDEX "DeliveryPreference_userId_idx" ON "DeliveryPreference"("userId");
CREATE UNIQUE INDEX "DeliverableRun_organizationId_type_periodStart_periodEnd_key" ON "DeliverableRun"("organizationId", "type", "periodStart", "periodEnd");
CREATE INDEX "DeliverableRun_organizationId_createdAt_idx" ON "DeliverableRun"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeliveryPreference" ADD CONSTRAINT "DeliveryPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPreference" ADD CONSTRAINT "DeliveryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableRun" ADD CONSTRAINT "DeliverableRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
