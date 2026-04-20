// GET  /api/attempts?quizId=X — 응시 목록 (교수자: 전체, 학생: 본인)
// POST /api/attempts            — 응시 시작 (학생)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  if (req.method === 'GET')  return listAttempts(req, res, auth)
  if (req.method === 'POST') return startAttempt(req, res, auth)

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

// ── GET: 응시 목록 ──────────────────────────────────────────────
async function listAttempts(req: VercelRequest, res: VercelResponse, auth: AuthPayload) {
  const quizId = req.query.quizId as string | undefined

  try {
    const where: { quizId?: string; userId?: string } = {}
    if (quizId) where.quizId = quizId
    if (auth.role === 'STUDENT') where.userId = auth.userId

    const attempts = await prisma.attempt.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, studentId: true, department: true, year: true },
        },
      },
      orderBy: [{ userId: 'asc' }, { attemptNumber: 'asc' }],
    })

    return res.status(200).json(attempts)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── POST: 응시 시작 ──────────────────────────────────────────────
async function startAttempt(req: VercelRequest, res: VercelResponse, auth: AuthPayload) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const quizId = typeof body.quizId === 'string' ? body.quizId : ''
  if (!quizId) return res.status(400).json({ error: 'quizId 가 필요합니다' })

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

  // 학생 — 수강 + visible 확인
  if (auth.role === 'STUDENT') {
    if (!quiz.visible) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
    const enr = await prisma.enrollment.findUnique({
      where: { userId_courseCode: { userId: auth.userId, courseCode: quiz.courseCode } },
    })
    if (!enr) return res.status(403).json({ error: '수강하지 않은 과목입니다' })
  }

  // 기존 미제출 Attempt 가 있으면 재사용 (중복 시작 방지)
  const existing = await prisma.attempt.findFirst({
    where: { quizId, userId: auth.userId, submitted: false },
  })
  if (existing) return res.status(200).json(existing)

  // 허용 재응시 횟수 확인
  const submittedCount = await prisma.attempt.count({
    where: { quizId, userId: auth.userId, submitted: true },
  })
  if (quiz.allowAttempts > 0 && submittedCount >= quiz.allowAttempts) {
    return res.status(403).json({ error: `재응시 한도 초과 (허용 ${quiz.allowAttempts}회)` })
  }

  try {
    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        userId: auth.userId,
        attemptNumber: submittedCount + 1,
        startTime: new Date(),
      },
    })
    return res.status(201).json(attempt)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
