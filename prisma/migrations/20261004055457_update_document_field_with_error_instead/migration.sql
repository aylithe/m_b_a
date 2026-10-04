/*
  Warnings:

  - You are about to drop the column `error` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "error" JSONB;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "error";
