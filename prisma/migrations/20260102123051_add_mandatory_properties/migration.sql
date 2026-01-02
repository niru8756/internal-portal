-- AlterTable
ALTER TABLE "ResourceTypeEntity" ADD COLUMN     "mandatoryProperties" JSONB NOT NULL DEFAULT '[]';
