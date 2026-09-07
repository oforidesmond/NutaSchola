-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN "body" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "NotificationLog_schoolId_createdAt_idx" ON "NotificationLog"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
