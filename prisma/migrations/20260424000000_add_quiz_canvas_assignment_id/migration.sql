-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "canvasAssignmentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_canvasAssignmentId_key" ON "Quiz"("canvasAssignmentId");
