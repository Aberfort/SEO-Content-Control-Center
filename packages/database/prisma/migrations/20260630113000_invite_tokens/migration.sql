ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

ALTER TABLE "OrganizationMember"
ADD COLUMN "inviteTokenHash" TEXT,
ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN "inviteAcceptedAt" TIMESTAMP(3),
ADD COLUMN "inviteCanceledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "OrganizationMember_inviteTokenHash_key" ON "OrganizationMember"("inviteTokenHash");
