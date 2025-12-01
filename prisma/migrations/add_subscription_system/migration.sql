-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('GUEST', 'FREE', 'PRO', 'PREMIUM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "subscriptionStart" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "subscriptionEnd" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RequestUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "requestType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestUsage_userId_createdAt_idx" ON "RequestUsage"("userId", "createdAt");
CREATE INDEX "RequestUsage_deviceId_createdAt_idx" ON "RequestUsage"("deviceId", "createdAt");
CREATE INDEX "RequestUsage_createdAt_idx" ON "RequestUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "RequestUsage" ADD CONSTRAINT "RequestUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

