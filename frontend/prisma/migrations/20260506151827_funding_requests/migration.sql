-- CreateEnum
CREATE TYPE "FundingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "funding_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "requested_lamports" TEXT NOT NULL,
    "daily_cap_lamports" TEXT,
    "reason" TEXT,
    "status" "FundingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_wallet" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_wallet" TEXT,
    "reject_reason" TEXT,
    "tx_hash" TEXT,

    CONSTRAINT "funding_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funding_requests_company_id_idx" ON "funding_requests"("company_id");

-- CreateIndex
CREATE INDEX "funding_requests_status_idx" ON "funding_requests"("status");

-- AddForeignKey
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
