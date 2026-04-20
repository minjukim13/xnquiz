// GET /api/quizzes/[id] — 퀴즈 상세 (문항 제외, 문항은 /questions 엔드포인트)
import type { VercelRequest, VercelResponse } from '@vercel/node'
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

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { course: true },
    })
    if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

    // 학생 접근 제어
    if (auth.role === 'STUDENT') {
      if (!quiz.visible) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseCode: { userId: auth.userId, courseCode: quiz.courseCode } },
      })
      if (!enrollment) return res.status(403).json({ error: '수강하지 않은 과목입니다' })
    }

    const [totalStudents, submitted, graded, questions, avg] = await Promise.all([
      prisma.enrollment.count({ where: { courseCode: quiz.courseCode, role: 'STUDENT' } }),
      prisma.attempt.count({ where: { quizId: id, submitted: true } }),
      prisma.attempt.count({ where: { quizId: id, graded: true } }),
      prisma.question.findMany({ where: { quizId: id }, select: { points: true } }),
      prisma.attempt.aggregate({
        where: { quizId: id, graded: true, totalScore: { not: null } },
        _avg: { totalScore: true },
      }),
    ])

    const stats: QuizStats = {
      totalStudents,
      submitted,
      graded,
      pendingGrade: Math.max(0, submitted - graded),
      questions: questions.length,
      totalPoints: questions.reduce((acc, q) => acc + q.points, 0),
      avgScore: avg._avg.totalScore,
    }

    return res.status(200).json(toQuizResponse(quiz, stats))
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
