-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "costUsd" DOUBLE PRECISION,
ALTER COLUMN "promptTokens" DROP NOT NULL;
