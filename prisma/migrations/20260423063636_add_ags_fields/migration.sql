-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "ltiLineItemsUrl" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "ltiLastScoreSentAt" TIMESTAMP(3),
ADD COLUMN     "ltiLineItemUrl" TEXT;
