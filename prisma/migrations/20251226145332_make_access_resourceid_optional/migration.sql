-- DropForeignKey
ALTER TABLE "Access" DROP CONSTRAINT "Access_resourceId_fkey";

-- AlterTable
ALTER TABLE "Access" ALTER COLUMN "resourceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
