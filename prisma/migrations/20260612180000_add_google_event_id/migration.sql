ALTER TABLE "Job" ADD COLUMN "googleEventId" TEXT;
CREATE UNIQUE INDEX "Job_googleEventId_key" ON "Job"("googleEventId");
