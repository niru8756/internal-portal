/*
  Warnings:

  - The values [PHONE] on the enum `AssetType` will be removed. If these variants are still used in the database, this will fail.
  - The values [HR,MANAGER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The values [POLICY_APPROVAL,DOCUMENT_APPROVAL,ASSET_REQUEST,LEAVE_REQUEST] on the enum `WorkflowType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `category` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('HARDWARE', 'SOFTWARE', 'CLOUD_SERVICE', 'SUBSCRIPTION', 'FURNITURE', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'REPAIR', 'UPGRADE', 'INSPECTION', 'CLEANING', 'SOFTWARE_UPDATE', 'SECURITY_PATCH');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('SECURITY_UPDATE', 'FEATURE_UPDATE', 'BUG_FIX', 'MAJOR_VERSION', 'MINOR_VERSION', 'PATCH');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'DELETION_ATTEMPTED', 'DELETION_FAILED', 'STATUS_CHANGED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'PERMISSION_CHANGED', 'FILE_UPLOADED', 'FILE_UPDATED', 'FILE_DELETED', 'POLICY_REVIEWED', 'POLICY_EXPIRED', 'POLICY_RENEWED', 'ASSET_ASSIGNED', 'ASSET_UNASSIGNED', 'ASSET_MAINTENANCE', 'SOFTWARE_UPDATED', 'WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_CANCELLED', 'EMPLOYEE_HIRED', 'EMPLOYEE_PROMOTED', 'EMPLOYEE_RESIGNED', 'DOCUMENT_REVIEWED', 'DOCUMENT_SIGNED', 'COMMENT_ADDED', 'NOTE_ADDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetStatus" ADD VALUE 'IN_USE';
ALTER TYPE "AssetStatus" ADD VALUE 'REPAIR';
ALTER TYPE "AssetStatus" ADD VALUE 'STOLEN';
ALTER TYPE "AssetStatus" ADD VALUE 'DISPOSED';

-- AlterEnum
BEGIN;
CREATE TYPE "AssetType_new" AS ENUM ('LAPTOP', 'DESKTOP', 'SERVER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'PRINTER', 'SCANNER', 'PROJECTOR', 'WEBCAM', 'HEADSET', 'DOCKING_STATION', 'SMARTPHONE', 'TABLET', 'SMARTWATCH', 'ROUTER', 'SWITCH', 'FIREWALL', 'ACCESS_POINT', 'MODEM', 'CLOUD_STORAGE', 'CLOUD_COMPUTE', 'CLOUD_DATABASE', 'CLOUD_PLATFORM', 'SOFTWARE_LICENSE', 'OPERATING_SYSTEM', 'ANTIVIRUS', 'PRODUCTIVITY_SUITE', 'DEVELOPMENT_TOOL', 'FURNITURE', 'VEHICLE', 'OTHER');
ALTER TABLE "Asset" ALTER COLUMN "type" TYPE "AssetType_new" USING ("type"::text::"AssetType_new");
ALTER TYPE "AssetType" RENAME TO "AssetType_old";
ALTER TYPE "AssetType_new" RENAME TO "AssetType";
DROP TYPE "AssetType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CEO', 'CTO', 'CFO', 'COO', 'ENGINEERING_MANAGER', 'PRODUCT_MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'MARKETING_MANAGER', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_DEVELOPER', 'MOBILE_DEVELOPER', 'DEVOPS_ENGINEER', 'QA_ENGINEER', 'DATA_SCIENTIST', 'UI_UX_DESIGNER', 'SYSTEM_ADMINISTRATOR', 'SECURITY_ENGINEER', 'SALES_REPRESENTATIVE', 'BUSINESS_ANALYST', 'MARKETING_SPECIALIST', 'HR_SPECIALIST', 'ACCOUNTANT', 'INTERN', 'JUNIOR_DEVELOPER', 'TRAINEE', 'ADMIN', 'EMPLOYEE');
ALTER TABLE "Employee" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowType_new" AS ENUM ('IT_EQUIPMENT_REQUEST', 'SOFTWARE_LICENSE_REQUEST', 'CLOUD_SERVICE_REQUEST', 'ACCESS_REQUEST', 'ELEVATED_ACCESS_REQUEST', 'SYSTEM_ADMIN_REQUEST', 'POLICY_UPDATE_REQUEST', 'PROCEDURE_CHANGE_REQUEST', 'COMPLIANCE_REVIEW_REQUEST', 'EXPENSE_APPROVAL_REQUEST', 'BUDGET_REQUEST', 'VENDOR_PAYMENT_REQUEST', 'HIRING_REQUEST', 'ROLE_CHANGE_REQUEST', 'TRAINING_REQUEST', 'VENDOR_CONTRACT_REQUEST', 'FACILITY_REQUEST', 'TRAVEL_REQUEST');
ALTER TABLE "ApprovalWorkflow" ALTER COLUMN "type" TYPE "WorkflowType_new" USING ("type"::text::"WorkflowType_new");
ALTER TYPE "WorkflowType" RENAME TO "WorkflowType_old";
ALTER TYPE "WorkflowType_new" RENAME TO "WorkflowType";
DROP TYPE "WorkflowType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Policy" DROP CONSTRAINT "Policy_ownerId_fkey";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "annualRate" DOUBLE PRECISION,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" "AssetCategory" NOT NULL,
ADD COLUMN     "hostname" TEXT,
ADD COLUMN     "installedSoftware" JSONB,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastMaintenance" TIMESTAMP(3),
ADD COLUMN     "lastUpdate" TIMESTAMP(3),
ADD COLUMN     "licenses" JSONB,
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "memory" TEXT,
ADD COLUMN     "modelNumber" TEXT,
ADD COLUMN     "monthlyRate" DOUBLE PRECISION,
ADD COLUMN     "nextMaintenance" TIMESTAMP(3),
ADD COLUMN     "operatingSystem" TEXT,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "processor" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "subscriptionExpiry" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "updateVersion" TEXT;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "salary" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "lastReviewDate" TIMESTAMP(3),
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "reviewDate" TIMESTAMP(3),
ALTER COLUMN "ownerId" DROP NOT NULL,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssetMaintenance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareUpdate" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "softwareName" TEXT NOT NULL,
    "fromVersion" TEXT,
    "toVersion" TEXT NOT NULL,
    "updateType" "UpdateType" NOT NULL,
    "updateDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "UpdateStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftwareUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTimeline" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyId" TEXT,
    "documentId" TEXT,
    "assetId" TEXT,
    "workflowId" TEXT,
    "employeeId" TEXT,

    CONSTRAINT "ActivityTimeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareUpdate" ADD CONSTRAINT "SoftwareUpdate_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
