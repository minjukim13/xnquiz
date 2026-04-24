-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "ltiContextId" TEXT,
ADD COLUMN     "ltiDeploymentId" TEXT,
ADD COLUMN     "ltiLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "ltiNrpsUrl" TEXT,
ADD COLUMN     "ltiPlatformId" TEXT;

-- CreateIndex
CREATE INDEX "Course_ltiPlatformId_ltiContextId_idx" ON "Course"("ltiPlatformId", "ltiContextId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_ltiPlatformId_fkey" FOREIGN KEY ("ltiPlatformId") REFERENCES "lti_platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
