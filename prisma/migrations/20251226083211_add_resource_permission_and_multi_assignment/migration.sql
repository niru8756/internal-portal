-- CreateEnum
CREATE TYPE "AccessPermissionLevel" AS ENUM ('READ', 'WRITE', 'EDIT', 'ADMIN');

-- AlterTable
ALTER TABLE "Access" ADD COLUMN     "justification" TEXT,
ADD COLUMN     "permissionLevel" "AccessPermissionLevel" NOT NULL DEFAULT 'READ';

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "assignedToIds" TEXT[],
ADD COLUMN     "permissionLevel" "AccessPermissionLevel" NOT NULL DEFAULT 'READ';
