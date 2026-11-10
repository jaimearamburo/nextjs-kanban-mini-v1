-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_guestId_fkey";

-- DropTable
DROP TABLE "Activity";

-- DropEnum
DROP TYPE "ActivityKind";

