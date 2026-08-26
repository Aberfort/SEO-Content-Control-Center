-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "siteScope" TEXT[] DEFAULT ARRAY[]::TEXT[];
