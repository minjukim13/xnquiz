// GET /api/quizzes?courseCode=CS301 — 퀴즈 목록 + 실시간 집계
// 학생: 수강 과목 + visible=true 만. 교수자/운영자: 전체.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest } from '../../lib/auth.js'
import { toQuizResponse, type QuizStats } from '../../lib/mappers/quiz.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const courseCode = (req.query.courseCode as string | undefined)?.toUpperCase()

  try {
    const where: Prisma.QuizWhereInput = {}

    if (auth.role === 'STUDENT') {
      const enrolled = await prisma.enrollment.findMany({
        where: { userId: auth.userId },
        select: { courseCode: true },
      })
      where.courseCode = { in: enrolled.map(e => e.courseCode) }
      where.visible = true
    }

    if (courseCode) {
      where.courseCode = where.courseCode
        ? { ...where.courseCode as Prisma.StringFilter, equals: courseCode }
        : courseCode
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    })

    const results = await Promise.all(quizzes.map(async (q) => {
      const [totalStudents, submitted, graded, questions, avg] = await Promise.all([
        prisma.enrollment.count({ where: { courseCode: q.courseCode, role: 'STUDENT' } }),
        prisma.attempt.count({ where: { quizId: q.id, submitted: true } }),
        prisma.attempt.count({ where: { quizId: q.id, graded: true } }),
        prisma.question.findMany({ where: { quizId: q.id }, select: { points: true } }),
        prisma.attempt.aggregate({
          where: { quizId: q.id, graded: true, totalScore: { not: null } },
          _avg: { totalScore: true },
        }),
      ])

      const stats: QuizStats = {
        totalStudents,
        submitted,
        graded,
        pendingGrade: Math.max(0, submitted - graded),
        questions: questions.length,
        totalPoints: questions.reduce((acc, x) => acc + x.points, 0),
        avgScore: avg._avg.totalScore,
      }

      return toQuizResponse(q, stats)
    }))

    return res.status(200).json(results)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
