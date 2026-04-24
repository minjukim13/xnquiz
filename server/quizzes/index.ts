// GET  /api/quizzes?courseCode=CS301 — 퀴즈 목록 + 실시간 집계
// POST /api/quizzes                   — 퀴즈 생성 (교수자/운영자)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'
import { toQuizResponse, scorePolicyFromLabel, type QuizStats } from '../../lib/mappers/quiz.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  if (req.method === 'GET')  return listQuizzes(req, res, auth)
  if (req.method === 'POST') return createQuiz(req, res, auth)

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

// ── GET: 목록 + 집계 ────────────────────────────────────────────
async function listQuizzes(req: VercelRequest, res: VercelResponse, auth: AuthPayload) {
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
      // 학생에게는 응시 가능한 상태만 노출 (draft=작성중, grading=채점중 숨김)
      where.status = { in: ['open', 'closed'] }
    }

    if (courseCode) {
      where.courseCode = where.courseCode
        ? { ...(where.courseCode as Prisma.StringFilter), equals: courseCode }
        : courseCode
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    })

    const isStudent = auth.role === 'STUDENT'

    const results = await Promise.all(quizzes.map(async (q) => {
      // 학생 시점: 응시에 필요한 최소 집계만 계산 (다른 수강생 평균·제출현황 비노출)
      if (isStudent) {
        const questions = await prisma.question.findMany({
          where: { quizId: q.id }, select: { points: true },
        })
        const stats: QuizStats = {
          totalStudents: null,
          submitted: null,
          graded: null,
          pendingGrade: null,
          questions: questions.length,
          totalPoints: questions.reduce((acc, x) => acc + x.points, 0),
          avgScore: null,
        }
        return toQuizResponse(q, stats)
      }

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

// ── POST: 생성 (교수자/운영자) ──────────────────────────────────
async function createQuiz(req: VercelRequest, res: VercelResponse, auth: AuthPayload) {
  if (auth.role === 'STUDENT') {
    return res.status(403).json({ error: '교수자만 생성 가능합니다' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const courseCodeRaw = typeof body.courseCode === 'string' ? body.courseCode : ''

  if (!title) return res.status(400).json({ error: 'title 이 필요합니다' })
  if (title.length > 200) return res.status(400).json({ error: 'title 은 200자 이하여야 합니다' })
  if (!courseCodeRaw) return res.status(400).json({ error: 'courseCode 가 필요합니다' })

  const code = courseCodeRaw.toUpperCase()
  const course = await prisma.course.findUnique({ where: { code } })
  if (!course) return res.status(400).json({ error: `존재하지 않는 과목코드: ${code}` })

  if ('timeLimit' in body && body.timeLimit !== null && body.timeLimit !== undefined) {
    const t = body.timeLimit
    if (typeof t !== 'number' || !Number.isFinite(t) || !Number.isInteger(t) || t <= 0) {
      return res.status(400).json({ error: 'timeLimit 은 양의 정수(분) 또는 null 이어야 합니다' })
    }
  }
  if ('allowAttempts' in body && body.allowAttempts !== null && body.allowAttempts !== undefined) {
    const a = body.allowAttempts
    // -1 = 무제한 (클라 규약)
    if (typeof a !== 'number' || !Number.isInteger(a) || (a !== -1 && a < 1)) {
      return res.status(400).json({ error: 'allowAttempts 는 1 이상 정수 또는 -1(무제한) 이어야 합니다' })
    }
  }

  try {
    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseCode: code,
        createdById: auth.userId,
        description: typeof body.description === 'string' ? body.description : undefined,
        status: (body.status as 'draft' | 'open' | 'closed' | 'grading') ?? 'draft',
        visible: !!body.visible,
        hasFileUpload: !!body.hasFileUpload,
        startDate: body.startDate ? new Date(body.startDate as string) : null,
        dueDate:   body.dueDate   ? new Date(body.dueDate as string)   : null,
        lockDate:  body.lockDate  ? new Date(body.lockDate as string)  : null,
        week:    typeof body.week    === 'number' ? body.week    : null,
        session: typeof body.session === 'number' ? body.session : null,
        timeLimit: typeof body.timeLimit === 'number' ? body.timeLimit : null,
        scorePolicy: scorePolicyFromLabel(body.scorePolicy as string | undefined),
        allowAttempts: typeof body.allowAttempts === 'number' ? body.allowAttempts : 1,
        scoreRevealEnabled: !!body.scoreRevealEnabled,
        scoreRevealScope:  (body.scoreRevealScope  as 'wrong_only' | 'with_answer' | null | undefined) ?? null,
        scoreRevealTiming: (body.scoreRevealTiming as 'immediately' | 'after_due' | 'period' | null | undefined) ?? null,
        scoreRevealStart: body.scoreRevealStart ? new Date(body.scoreRevealStart as string) : null,
        scoreRevealEnd:   body.scoreRevealEnd   ? new Date(body.scoreRevealEnd   as string) : null,
        allowLateSubmit: !!body.allowLateSubmit,
        lateSubmitDeadline: body.lateSubmitDeadline ? new Date(body.lateSubmitDeadline as string) : null,
      },
      include: { course: true },
    })

    const totalStudents = await prisma.enrollment.count({
      where: { courseCode: code, role: 'STUDENT' },
    })

    const stats: QuizStats = {
      totalStudents,
      submitted: 0, graded: 0, pendingGrade: 0,
      questions: 0, totalPoints: 0, avgScore: null,
    }

    return res.status(201).json(toQuizResponse(quiz, stats))
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
