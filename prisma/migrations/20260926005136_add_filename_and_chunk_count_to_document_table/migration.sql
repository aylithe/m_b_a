/*
  Warnings:

  - Added the required column `chunkCount` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "chunkCount" INTEGER NOT NULL,
ADD COLUMN     "filename" TEXT NOT NULL;
