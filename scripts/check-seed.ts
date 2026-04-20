import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const stats = {
    교수자: await prisma.user.count({ where: { role: 'PROFESSOR' } }),
    학생: await prisma.user.count({ where: { role: 'STUDENT' } }),
    과목: await prisma.course.count(),
    수강등록: await prisma.enrollment.count(),
    퀴즈: await prisma.quiz.count(),
    문항: await prisma.question.count(),
    문제은행: await prisma.questionBank.count(),
    문제은행문항: await prisma.bankQuestion.count(),
    응시총건: await prisma.attempt.count(),
    제출완료: await prisma.attempt.count({ where: { submitted: true } }),
    채점완료: await prisma.attempt.count({ where: { graded: true } }),
    답안: await prisma.answer.count(),
  }
  console.log(stats)
  await prisma.$disconnect()
}

main()
