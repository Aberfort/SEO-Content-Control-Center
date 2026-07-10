ALTER TABLE "User"
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorPendingCreatedAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorLastCounter" INTEGER;
