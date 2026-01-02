/*
  Resource Structure Enhancement Migration
  
  This migration:
  1. Creates new tables for ResourceTypeEntity, ResourceCategoryEntity, and PropertyCatalog
  2. Adds new columns to Resource and ResourceItem tables
  3. Seeds predefined resource types, categories, and properties
  4. Migrates existing resource type enum values to the new table structure
*/

-- CreateEnum
CREATE TYPE "PropertyDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INDIVIDUAL', 'POOLED', 'SHARED');

-- CreateEnum (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'itemstatus') THEN
        CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'LOST', 'DAMAGED');
    END IF;
END $$;

-- DropForeignKey (if exists)
ALTER TABLE "ResourceAssignment" DROP CONSTRAINT IF EXISTS "ResourceAssignment_resourceId_fkey";

-- DropIndex (if exists)
DROP INDEX IF EXISTS "Resource_serialNumber_key";
DROP INDEX IF EXISTS "ResourceAssignment_resourceId_employeeId_status_key";

-- AlterTable - Access table modifications
ALTER TABLE "Access" DROP COLUMN IF EXISTS "permissionLevel";

-- AlterTable - Resource table modifications (drop old columns if they exist)
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "annualRate";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "brand";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "defaultPermission";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "hostname";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "ipAddress";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "lastMaintenance";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "lastUpdate";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "licenseExpiry";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "licenseKey";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "location";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "macAddress";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "memory";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "modelNumber";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "monthlyRate";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "nextMaintenance";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "operatingSystem";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "osVersion";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "processor";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "purchaseDate";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "serialNumber";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "serviceLevel";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "softwareVersion";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "specifications";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "storage";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "subscriptionExpiry";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "subscriptionId";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "totalQuantity";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "updateVersion";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "value";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "warrantyExpiry";

-- Add new columns to Resource table
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "propertySchema" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "resourceCategoryId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "resourceTypeId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "schemaLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable - ResourceAssignment modifications
ALTER TABLE "ResourceAssignment" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "ResourceAssignment" DROP COLUMN IF EXISTS "lossReason";
ALTER TABLE "ResourceAssignment" DROP COLUMN IF EXISTS "quantityAssigned";
ALTER TABLE "ResourceAssignment" DROP COLUMN IF EXISTS "returnReason";
ALTER TABLE "ResourceAssignment" DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "ResourceAssignment" ADD COLUMN IF NOT EXISTS "assignmentType" "AssignmentType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "ResourceAssignment" ADD COLUMN IF NOT EXISTS "itemId" TEXT;

-- DropEnum (only if exists)
DROP TYPE IF EXISTS "AccessPermissionLevel";

-- CreateTable: ResourceTypeEntity
CREATE TABLE IF NOT EXISTS "ResourceTypeEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceTypeEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ResourceCategoryEntity
CREATE TABLE IF NOT EXISTS "ResourceCategoryEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resourceTypeId" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceCategoryEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertyCatalog
CREATE TABLE IF NOT EXISTS "PropertyCatalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "PropertyDataType" NOT NULL,
    "description" TEXT,
    "defaultValue" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "resourceTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ResourceItem
CREATE TABLE IF NOT EXISTS "ResourceItem" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "serialNumber" TEXT,
    "hostname" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "operatingSystem" TEXT,
    "osVersion" TEXT,
    "processor" TEXT,
    "memory" TEXT,
    "storage" TEXT,
    "licenseKey" TEXT,
    "softwareVersion" TEXT,
    "licenseType" TEXT,
    "maxUsers" TEXT,
    "activationCode" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ResourceTypeEntity_name_key" ON "ResourceTypeEntity"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ResourceCategoryEntity_name_resourceTypeId_key" ON "ResourceCategoryEntity"("name", "resourceTypeId");
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyCatalog_key_key" ON "PropertyCatalog"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "ResourceItem_serialNumber_key" ON "ResourceItem"("serialNumber");

-- AddForeignKey: ResourceCategoryEntity -> ResourceTypeEntity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResourceCategoryEntity_resourceTypeId_fkey') THEN
        ALTER TABLE "ResourceCategoryEntity" ADD CONSTRAINT "ResourceCategoryEntity_resourceTypeId_fkey" 
        FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceTypeEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: PropertyCatalog -> ResourceTypeEntity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PropertyCatalog_resourceTypeId_fkey') THEN
        ALTER TABLE "PropertyCatalog" ADD CONSTRAINT "PropertyCatalog_resourceTypeId_fkey" 
        FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceTypeEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Resource -> ResourceTypeEntity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resource_resourceTypeId_fkey') THEN
        ALTER TABLE "Resource" ADD CONSTRAINT "Resource_resourceTypeId_fkey" 
        FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceTypeEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Resource -> ResourceCategoryEntity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resource_resourceCategoryId_fkey') THEN
        ALTER TABLE "Resource" ADD CONSTRAINT "Resource_resourceCategoryId_fkey" 
        FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategoryEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ResourceItem -> Resource
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResourceItem_resourceId_fkey') THEN
        ALTER TABLE "ResourceItem" ADD CONSTRAINT "ResourceItem_resourceId_fkey" 
        FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ResourceAssignment -> Resource
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_resourceId_fkey" 
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ResourceAssignment -> ResourceItem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResourceAssignment_itemId_fkey') THEN
        ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_itemId_fkey" 
        FOREIGN KEY ("itemId") REFERENCES "ResourceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;


-- ============================================
-- DATA MIGRATION: Seed predefined resource types
-- ============================================

-- Insert predefined resource types (PHYSICAL, SOFTWARE, CLOUD)
INSERT INTO "ResourceTypeEntity" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'PHYSICAL', 'Physical hardware assets like laptops, phones, and equipment', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'SOFTWARE', 'Software licenses and applications', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'CLOUD', 'Cloud services and subscriptions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- ============================================
-- DATA MIGRATION: Seed predefined categories
-- ============================================

-- Insert predefined categories for PHYSICAL type
INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Laptop',
    'Laptop computers and notebooks',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Phone',
    'Mobile phones and smartphones',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Monitor',
    'Computer monitors and displays',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Peripheral',
    'Keyboards, mice, and other peripherals',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

-- Insert predefined categories for SOFTWARE type
INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'SaaS',
    'Software as a Service applications',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Desktop Application',
    'Installed desktop software',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Development Tool',
    'IDEs, SDKs, and development tools',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

-- Insert predefined categories for CLOUD type
INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Cloud Account',
    'Cloud provider accounts (AWS, Azure, GCP)',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'CLOUD'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

INSERT INTO "ResourceCategoryEntity" ("id", "name", "description", "resourceTypeId", "isSystem", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'Cloud Service',
    'Specific cloud services and resources',
    rt.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'CLOUD'
ON CONFLICT ("name", "resourceTypeId") DO NOTHING;

-- ============================================
-- DATA MIGRATION: Seed predefined properties
-- ============================================

-- Hardware properties (linked to PHYSICAL type)
INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'serialNumber',
    'Serial Number',
    'STRING'::"PropertyDataType",
    'Unique serial number for hardware identification',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'hostname',
    'Hostname',
    'STRING'::"PropertyDataType",
    'Network hostname of the device',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'ipAddress',
    'IP Address',
    'STRING'::"PropertyDataType",
    'Network IP address',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'macAddress',
    'MAC Address',
    'STRING'::"PropertyDataType",
    'Network MAC address',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'operatingSystem',
    'Operating System',
    'STRING'::"PropertyDataType",
    'Operating system name',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'osVersion',
    'OS Version',
    'STRING'::"PropertyDataType",
    'Operating system version',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'processor',
    'Processor',
    'STRING'::"PropertyDataType",
    'CPU/Processor model',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'memory',
    'Memory (RAM)',
    'STRING'::"PropertyDataType",
    'RAM capacity',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'storage',
    'Storage',
    'STRING'::"PropertyDataType",
    'Storage capacity',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'PHYSICAL'
ON CONFLICT ("key") DO NOTHING;

-- Common properties (not linked to specific type)
INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "createdAt")
VALUES 
    (gen_random_uuid()::text, 'purchaseDate', 'Purchase Date', 'DATE', 'Date of purchase', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'warrantyExpiry', 'Warranty Expiry', 'DATE', 'Warranty expiration date', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'value', 'Value', 'NUMBER', 'Monetary value of the asset', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Software properties (linked to SOFTWARE type)
INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'licenseKey',
    'License Key',
    'STRING'::"PropertyDataType",
    'Software license key',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'softwareVersion',
    'Software Version',
    'STRING'::"PropertyDataType",
    'Version of the software',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'licenseType',
    'License Type',
    'STRING'::"PropertyDataType",
    'Type of license (perpetual, subscription, etc.)',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'maxUsers',
    'Maximum Users',
    'STRING'::"PropertyDataType",
    'Maximum number of users allowed',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'activationCode',
    'Activation Code',
    'STRING'::"PropertyDataType",
    'Software activation code',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'licenseExpiry',
    'License Expiry',
    'DATE'::"PropertyDataType",
    'License expiration date',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'SOFTWARE'
ON CONFLICT ("key") DO NOTHING;

-- Cloud properties (linked to CLOUD type)
INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'accountId',
    'Account ID',
    'STRING'::"PropertyDataType",
    'Cloud provider account identifier',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'CLOUD'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'region',
    'Region',
    'STRING'::"PropertyDataType",
    'Cloud region or data center location',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'CLOUD'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PropertyCatalog" ("id", "key", "label", "dataType", "description", "isSystem", "resourceTypeId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    'subscriptionTier',
    'Subscription Tier',
    'STRING'::"PropertyDataType",
    'Service tier or plan level',
    true,
    rt.id,
    CURRENT_TIMESTAMP
FROM "ResourceTypeEntity" rt WHERE rt.name = 'CLOUD'
ON CONFLICT ("key") DO NOTHING;

-- ============================================
-- DATA MIGRATION: Link existing resources to new type entities
-- ============================================

-- Update existing resources to link to the new ResourceTypeEntity table
UPDATE "Resource" r
SET "resourceTypeId" = rt.id
FROM "ResourceTypeEntity" rt
WHERE r.type::text = rt.name AND r."resourceTypeId" IS NULL;
