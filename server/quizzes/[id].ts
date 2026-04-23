// GET    /api/quizzes/[id] — 퀴즈 상세
// PATCH  /api/quizzes/[id] — 퀴즈 수정 (교수자/운영자)
// DELETE /api/quizzes/[id] — 퀴즈 삭제 (교수자/운영자, cascade)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'
import { toQuizResponse, scorePolicyFromLabel, type QuizStats } from '../../lib/mappers/quiz.js'
import { syncQuizScoresToCanvas } from '../../lib/lti/ags.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'GET')    return getQuiz(req, res, auth, id)
  if (req.method === 'PATCH')  return patchQuiz(req, res, auth, id)
  if (req.method === 'DELETE') return deleteQuiz(req, res, auth, id)

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

// ── GET 상세 ─────────────────────────────────────────────────
async function getQuiz(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { course: true } })
    if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

    if (auth.role === 'STUDENT') {
      if (!quiz.visible) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
      if (quiz.status === 'draft' || quiz.status === 'grading') {
        return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
      }
      const enr = await prisma.enrollment.findUnique({
        where: { userId_courseCode: { userId: auth.userId, courseCode: quiz.courseCode } },
      })
      if (!enr) return res.status(403).json({ error: '수강하지 않은 과목입니다' })

      // 학생 시점: 다른 수강생 평균·제출현황 비노출 (문항 수/총점만 응시용으로 제공)
      const questions = await prisma.question.findMany({
        where: { quizId: id }, select: { points: true },
      })
      const stats: QuizStats = {
        totalStudents: null, submitted: null, graded: null, pendingGrade: null,
        questions: questions.length,
        totalPoints: questions.reduce((a, q) => a + q.points, 0),
        avgScore: null,
      }
      return res.status(200).json(toQuizResponse(quiz, stats))
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
      totalStudents, submitted, graded,
      pendingGrade: Math.max(0, submitted - graded),
      questions: questions.length,
      totalPoints: questions.reduce((a, q) => a + q.points, 0),
      avgScore: avg._avg.totalScore,
    }

    return res.status(200).json(toQuizResponse(quiz, stats))
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── PATCH 수정 ──────────────────────────────────────────────────
async function patchQuiz(req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 수정 가능합니다' })

  const existing = await prisma.quiz.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') {
    const t = body.title.trim()
    if (!t) return res.status(400).json({ error: 'title 은 빈 문자열일 수 없습니다' })
    if (t.length > 200) return res.status(400).json({ error: 'title 은 200자 이하' })
    data.title = t
  }

  if (typeof body.courseCode === 'string') {
    const code = body.courseCode.toUpperCase()
    const course = await prisma.course.findUnique({ where: { code } })
    if (!course) return res.status(400).json({ error: `존재하지 않는 과목코드: ${code}` })
    data.courseCode = code
  }

  // 단순 필드
  if ('description' in body) data.description = body.description
  if ('status' in body)      data.status      = body.status
  if ('visible' in body)     data.visible     = !!body.visible
  if ('hasFileUpload' in body) data.hasFileUpload = !!body.hasFileUpload
  if ('week' in body)        data.week        = body.week
  if ('session' in body)     data.session     = body.session
  if ('timeLimit' in body) {
    const t = body.timeLimit
    if (t === null || t === undefined) {
      data.timeLimit = null
    } else if (typeof t === 'number' && Number.isInteger(t) && t > 0) {
      data.timeLimit = t
    } else {
      return res.status(400).json({ error: 'timeLimit 은 양의 정수(분) 또는 null 이어야 합니다' })
    }
  }
  if ('allowAttempts' in body) {
    const a = body.allowAttempts
    // -1 = 무제한 (클라 규약)
    if (typeof a === 'number' && Number.isInteger(a) && (a >= 1 || a === -1)) {
      data.allowAttempts = a
    } else {
      return res.status(400).json({ error: 'allowAttempts 는 1 이상 정수 또는 -1(무제한) 이어야 합니다' })
    }
  }
  if ('scoreRevealEnabled' in body) data.scoreRevealEnabled = !!body.scoreRevealEnabled
  if ('scoreRevealScope'  in body) data.scoreRevealScope   = body.scoreRevealScope
  if ('scoreRevealTiming' in body) data.scoreRevealTiming  = body.scoreRevealTiming
  if ('allowLateSubmit'   in body) data.allowLateSubmit    = !!body.allowLateSubmit

  // 날짜
  const dateFields = ['startDate', 'dueDate', 'lockDate', 'scoreRevealStart', 'scoreRevealEnd', 'lateSubmitDeadline']
  for (const f of dateFields) {
    if (f in body) data[f] = body[f] ? new Date(body[f] as string) : null
  }

  // scorePolicy 한글 라벨
  if ('scorePolicy' in body) {
    data.scorePolicy = scorePolicyFromLabel(body.scorePolicy as string | undefined)
  }

  // AGS 트리거 판단: scoreRevealEnabled 가 false → true 로 바뀌는 순간 Canvas Gradebook 동기화
  const shouldTriggerAgs =
    'scoreRevealEnabled' in body &&
    !!body.scoreRevealEnabled &&
    existing.scoreRevealEnabled === false &&
    !!existing.courseCode

  try {
    const updated = await prisma.quiz.update({
      where: { id },
      data,
      include: { course: true },
    })

    // Canvas 로 점수 전송 (LTI 과목이어야만 동작 — ltiLineItemsUrl null 이면 함수가 에러 던짐)
    if (shouldTriggerAgs && updated.course.ltiLineItemsUrl && updated.course.ltiPlatformId) {
      try {
        const agsResult = await syncQuizScoresToCanvas(updated.id)
        console.log('[ags] sync ok', { quizId: updated.id, ...agsResult })
      } catch (err) {
        // AGS 실패해도 점수 공개 설정 자체는 성공으로 처리 (학생 UI 노출은 별도 이슈)
        console.error('[ags] sync failed', { quizId: updated.id, err: String(err) })
      }
    }

    const [totalStudents, submitted, graded, questions, avg] = await Promise.all([
      prisma.enrollment.count({ where: { courseCode: updated.courseCode, role: 'STUDENT' } }),
      prisma.attempt.count({ where: { quizId: id, submitted: true } }),
      prisma.attempt.count({ where: { quizId: id, graded: true } }),
      prisma.question.findMany({ where: { quizId: id }, select: { points: true } }),
      prisma.attempt.aggregate({
        where: { quizId: id, graded: true, totalScore: { not: null } },
        _avg: { totalScore: true },
      }),
    ])

    const stats: QuizStats = {
      totalStudents, submitted, graded,
      pendingGrade: Math.max(0, submitted - graded),
      questions: questions.length,
      totalPoints: questions.reduce((a, q) => a + q.points, 0),
      avgScore: avg._avg.totalScore,
    }

    return res.status(200).json(toQuizResponse(updated, stats))
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── DELETE 삭제 ─────────────────────────────────────────────────
async function deleteQuiz(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 삭제 가능합니다' })

  const existing = await prisma.quiz.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

  try {
    await prisma.quiz.delete({ where: { id } })
    return res.status(204).end()
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
