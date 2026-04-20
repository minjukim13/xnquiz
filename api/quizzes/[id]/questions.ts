// GET /api/quizzes/[id]/questions — 퀴즈 내 문항 목록
// 학생: correctAnswer / rubric 숨김 (성적 공개 정책은 향후 확장)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest } from '../../../lib/auth.js'

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
      select: { courseCode: true, visible: true },
    })
    if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

    if (auth.role === 'STUDENT') {
      if (!quiz.visible) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseCode: { userId: auth.userId, courseCode: quiz.courseCode } },
      })
      if (!enrollment) return res.status(403).json({ error: '수강하지 않은 과목입니다' })
    }

    const questions = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { order: 'asc' },
    })

    // 학생은 정답 관련 필드 제거
    const isStudent = auth.role === 'STUDENT'
    const body = questions.map(q => {
      if (!isStudent) return q
      const { correctAnswer, rubric, correctComment, incorrectComment, neutralComment, ...rest } = q
      return rest
    })

    return res.status(200).json(body)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
