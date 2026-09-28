-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roleId_fkey";

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "roleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
