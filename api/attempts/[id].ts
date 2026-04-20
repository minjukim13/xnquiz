// GET   /api/attempts/[id] — 응시 상세 + 답안 목록
// PATCH /api/attempts/[id] — 수동채점 반영 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'GET')   return getAttempt(req, res, auth, id)
  if (req.method === 'PATCH') return patchAttempt(req, res, auth, id)

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

// ── GET 상세 ────────────────────────────────────────────────────
async function getAttempt(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        answers: { orderBy: { question: { order: 'asc' } }, include: { question: true } },
        user: {
          select: { id: true, name: true, email: true, studentId: true, department: true, year: true },
        },
      },
    })
    if (!attempt) return res.status(404).json({ error: '응시 기록을 찾을 수 없습니다' })

    // 학생은 본인 attempt 만
    if (auth.role === 'STUDENT' && attempt.userId !== auth.userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다' })
    }

    return res.status(200).json(attempt)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── PATCH 수동채점 ──────────────────────────────────────────────
// body: { grades: [{ questionId, manualScore, feedback? }] }
// 합계 갱신 + Attempt.manualScore / totalScore / graded=true 반영
async function patchAttempt(req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 채점 가능합니다' })

  const attempt = await prisma.attempt.findUnique({ where: { id } })
  if (!attempt) return res.status(404).json({ error: '응시 기록을 찾을 수 없습니다' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const grades = Array.isArray(body.grades) ? body.grades : []
  if (grades.length === 0) {
    return res.status(400).json({ error: 'grades 배열이 필요합니다' })
  }

  try {
    // 각 Answer 에 manualScore 반영
    await prisma.$transaction(grades.map((g) => {
      const { questionId, manualScore, feedback } = g as Record<string, unknown>
      if (typeof questionId !== 'string') {
        throw new Error('grades[].questionId 필요')
      }
      if (typeof manualScore !== 'number') {
        throw new Error('grades[].manualScore 는 숫자여야 합니다')
      }
      return prisma.answer.updateMany({
        where: { attemptId: id, questionId },
        data: {
          manualScore,
          feedback: typeof feedback === 'string' ? feedback : undefined,
          gradedById: auth.userId,
          gradedAt: new Date(),
        },
      })
    }))

    // 합계 재계산
    const answers = await prisma.answer.findMany({ where: { attemptId: id } })
    const autoSum = answers.reduce((acc, a) => acc + (a.autoScore ?? 0), 0)
    const manualSum = answers.reduce((acc, a) => acc + (a.manualScore ?? 0), 0)

    const updated = await prisma.attempt.update({
      where: { id },
      data: {
        autoScore: autoSum,
        manualScore: manualSum,
        totalScore: autoSum + manualSum,
        graded: true,
      },
    })

    return res.status(200).json(updated)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
