-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "ltiCanvasCourseId" INTEGER;

-- CreateIndex
CREATE INDEX "Course_ltiCanvasCourseId_idx" ON "Course"("ltiCanvasCourseId");
