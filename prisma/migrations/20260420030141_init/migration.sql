-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROFESSOR', 'TA', 'STUDENT');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('draft', 'open', 'closed', 'grading');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'true_false', 'multiple_answers', 'short_answer', 'essay', 'numerical', 'formula', 'matching', 'fill_in_multiple_blanks', 'multiple_dropdowns', 'file_upload', 'text');

-- CreateEnum
CREATE TYPE "AutoGradeMode" AS ENUM ('AUTO', 'MANUAL', 'PARTIAL', 'NONE');

-- CreateEnum
CREATE TYPE "ScorePolicy" AS ENUM ('KEEP_HIGHEST', 'KEEP_LATEST', 'KEEP_AVERAGE');

-- CreateEnum
CREATE TYPE "ScoreRevealScope" AS ENUM ('wrong_only', 'with_answer');

-- CreateEnum
CREATE TYPE "ScoreRevealTiming" AS ENUM ('immediately', 'after_due', 'period');

-- CreateEnum
CREATE TYPE "BankDifficulty" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "EnrollmentRole" AS ENUM ('PROFESSOR', 'TA', 'STUDENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "studentId" TEXT,
    "department" TEXT,
    "year" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "role" "EnrollmentRole" NOT NULL DEFAULT 'STUDENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "QuizStatus" NOT NULL DEFAULT 'draft',
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "lockDate" TIMESTAMP(3),
    "week" INTEGER,
    "session" INTEGER,
    "timeLimit" INTEGER,
    "hasFileUpload" BOOLEAN NOT NULL DEFAULT false,
    "scorePolicy" "ScorePolicy" NOT NULL DEFAULT 'KEEP_HIGHEST',
    "allowAttempts" INTEGER NOT NULL DEFAULT 1,
    "scoreRevealEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scoreRevealScope" "ScoreRevealScope",
    "scoreRevealTiming" "ScoreRevealTiming",
    "scoreRevealStart" TIMESTAMP(3),
    "scoreRevealEnd" TIMESTAMP(3),
    "allowLateSubmit" BOOLEAN NOT NULL DEFAULT false,
    "lateSubmitDeadline" TIMESTAMP(3),
    "avgScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoGrade" "AutoGradeMode" NOT NULL DEFAULT 'MANUAL',
    "correctAnswer" JSONB,
    "choices" JSONB,
    "correctComment" TEXT,
    "incorrectComment" TEXT,
    "neutralComment" TEXT,
    "rubric" TEXT,
    "allowedFileTypes" JSONB,
    "maxFileSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "difficulty" "BankDifficulty",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankQuestion" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "BankDifficulty",
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "scoringMode" TEXT,
    "rubric" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "graded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB,
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Quiz_courseId_idx" ON "Quiz"("courseId");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "Quiz_createdById_idx" ON "Quiz"("createdById");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_order_key" ON "Question"("quizId", "order");

-- CreateIndex
CREATE INDEX "QuestionBank_courseId_idx" ON "QuestionBank"("courseId");

-- CreateIndex
CREATE INDEX "BankQuestion_bankId_idx" ON "BankQuestion"("bankId");

-- CreateIndex
CREATE INDEX "Attempt_quizId_idx" ON "Attempt"("quizId");

-- CreateIndex
CREATE INDEX "Attempt_userId_idx" ON "Attempt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_quizId_userId_attemptNumber_key" ON "Attempt"("quizId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "Answer_attemptId_idx" ON "Answer"("attemptId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_attemptId_questionId_key" ON "Answer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
