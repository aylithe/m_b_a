/*
  Warnings:

  - You are about to drop the column `roleId` on the `Message` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roleId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "roleId",
ADD COLUMN     "role" TEXT;
