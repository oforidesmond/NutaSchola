-- Phase 4A: feeType + termId on FeeStructure, admission fee waiver, shared receipt numbering.

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ADMISSION', 'SCHOOL_FEES');

-- CreateEnum
CREATE TYPE "ReceiptPrefix" AS ENUM ('ADM', 'FEE', 'STN');

-- AlterTable SchoolSettings: shared receipt sequence
ALTER TABLE "SchoolSettings" ADD COLUMN "receiptNextSeq" INTEGER NOT NULL DEFAULT 1;

-- AlterTable AdmissionApplication: per-application waiver
ALTER TABLE "AdmissionApplication" ADD COLUMN "admissionFeeWaived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdmissionApplication" ADD COLUMN "admissionFeeWaivedReason" TEXT;

-- AlterTable FeeStructure: feeType + termId (backfill from isAdmissionFee, then drop flag)
ALTER TABLE "FeeStructure" ADD COLUMN "feeType" "FeeType";
ALTER TABLE "FeeStructure" ADD COLUMN "termId" TEXT;

UPDATE "FeeStructure"
SET "feeType" = CASE WHEN "isAdmissionFee" = true THEN 'ADMISSION'::"FeeType" ELSE 'SCHOOL_FEES'::"FeeType" END
WHERE "feeType" IS NULL;

ALTER TABLE "FeeStructure" ALTER COLUMN "feeType" SET NOT NULL;

ALTER TABLE "FeeStructure" DROP COLUMN "isAdmissionFee";

ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FeeStructure_schoolId_feeType_termId_classLevelId_idx" ON "FeeStructure"("schoolId", "feeType", "termId", "classLevelId");

-- CreateTable Receipt
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "prefix" "ReceiptPrefix" NOT NULL,
    "seq" INTEGER NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Receipt_schoolId_receiptNumber_key" ON "Receipt"("schoolId", "receiptNumber");
CREATE INDEX "Receipt_schoolId_prefix_idx" ON "Receipt"("schoolId", "prefix");

ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Payment: link to Receipt
ALTER TABLE "Payment" ADD COLUMN "receiptId" TEXT;
CREATE UNIQUE INDEX "Payment_receiptId_key" ON "Payment"("receiptId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
