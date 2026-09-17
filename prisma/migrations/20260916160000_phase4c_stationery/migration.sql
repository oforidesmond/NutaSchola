-- Phase 4C: stationery catalog + sales with STN receipts

CREATE TABLE "StationeryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationeryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationerySale" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "recordedById" TEXT NOT NULL,
    "receiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationerySale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationerySaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "StationerySaleLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StationeryItem_schoolId_isActive_idx" ON "StationeryItem"("schoolId", "isActive");
CREATE UNIQUE INDEX "StationerySale_receiptId_key" ON "StationerySale"("receiptId");
CREATE INDEX "StationerySale_schoolId_createdAt_idx" ON "StationerySale"("schoolId", "createdAt");
CREATE INDEX "StationerySaleLine_saleId_idx" ON "StationerySaleLine"("saleId");

ALTER TABLE "StationeryItem" ADD CONSTRAINT "StationeryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StationerySale" ADD CONSTRAINT "StationerySale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StationerySale" ADD CONSTRAINT "StationerySale_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StationerySale" ADD CONSTRAINT "StationerySale_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StationerySale" ADD CONSTRAINT "StationerySale_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StationerySaleLine" ADD CONSTRAINT "StationerySaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "StationerySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StationerySaleLine" ADD CONSTRAINT "StationerySaleLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StationeryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
