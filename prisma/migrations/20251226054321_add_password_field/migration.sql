/*
  Warnings:

  - The values [ASSET] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assetId` on the `ActivityTimeline` table. All the data in the column will be lost.
  - You are about to drop the column `assetId` on the `ApprovalWorkflow` table. All the data in the column will be lost.
  - You are about to drop the column `assetId` on the `SoftwareUpdate` table. All the data in the column will be lost.
  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssetMaintenance` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[serialNumber]` on the table `Resource` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `resourceId` to the `SoftwareUpdate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('EMPLOYEE', 'RESOURCE', 'ACCESS', 'POLICY', 'DOCUMENT', 'APPROVAL_WORKFLOW');
ALTER TABLE "AuditLog" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TABLE "ActivityTimeline" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
DROP TYPE "EntityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActivityTimeline" DROP CONSTRAINT "ActivityTimeline_assetId_fkey";

-- DropForeignKey
ALTER TABLE "ApprovalWorkflow" DROP CONSTRAINT "ApprovalWorkflow_assetId_fkey";

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "AssetMaintenance" DROP CONSTRAINT "AssetMaintenance_assetId_fkey";

-- DropForeignKey
ALTER TABLE "SoftwareUpdate" DROP CONSTRAINT "SoftwareUpdate_assetId_fkey";

-- AlterTable
ALTER TABLE "ActivityTimeline" DROP COLUMN "assetId",
ADD COLUMN     "resourceId" TEXT;

-- AlterTable
ALTER TABLE "ApprovalWorkflow" DROP COLUMN "assetId",
ADD COLUMN     "resourceId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "annualRate" DOUBLE PRECISION,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "hostname" TEXT,
ADD COLUMN     "installedSoftware" JSONB,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastMaintenance" TIMESTAMP(3),
ADD COLUMN     "lastUpdate" TIMESTAMP(3),
ADD COLUMN     "lastUsed" TIMESTAMP(3),
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseKey" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "memory" TEXT,
ADD COLUMN     "modelNumber" TEXT,
ADD COLUMN     "monthlyRate" DOUBLE PRECISION,
ADD COLUMN     "nextMaintenance" TIMESTAMP(3),
ADD COLUMN     "operatingSystem" TEXT,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "processor" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "serviceLevel" TEXT,
ADD COLUMN     "softwareVersion" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "subscriptionExpiry" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "updateVersion" TEXT,
ADD COLUMN     "usageMetrics" JSONB,
ADD COLUMN     "value" DOUBLE PRECISION,
ADD COLUMN     "warrantyExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SoftwareUpdate" DROP COLUMN "assetId",
ADD COLUMN     "resourceId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "AssetMaintenance";

-- DropEnum
DROP TYPE "AssetCategory";

-- DropEnum
DROP TYPE "AssetStatus";

-- DropEnum
DROP TYPE "AssetType";

-- CreateTable
CREATE TABLE "ResourceMaintenance" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "nextDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_serialNumber_key" ON "Resource"("serialNumber");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMaintenance" ADD CONSTRAINT "ResourceMaintenance_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareUpdate" ADD CONSTRAINT "SoftwareUpdate_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
