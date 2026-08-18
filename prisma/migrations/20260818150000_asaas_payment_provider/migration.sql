-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "asaasCustomerId" TEXT;

-- AlterTable
ALTER TABLE "CompanySubscription" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provider" TEXT;

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "checkoutUrl" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provider" TEXT;

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_event_idx" ON "WebhookEvent"("provider", "event");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalId_key" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_asaasCustomerId_key" ON "Company"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySubscription_externalId_key" ON "CompanySubscription"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_externalId_key" ON "PaymentMethod"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_externalId_key" ON "Invoice"("externalId");

