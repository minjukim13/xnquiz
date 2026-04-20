// POST /api/attempts/[id]/submit — 학생 최종 제출 + 자동채점
//
// 1) 이 응시의 모든 Answer 에 대해 autoGradeAnswer 실행
// 2) Attempt.autoScore / submitted / submittedAt 저장
// 3) 수동채점 필요 문항이 없으면 graded=true + totalScore=autoScore 까지 한 번에 확정
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest } from '../../../lib/auth.js'
import { autoGradeAnswer } from '../../../lib/grader.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { quiz: true },
  })
  if (!attempt) return res.status(404).json({ error: '응시 기록을 찾을 수 없습니다' })

  if (attempt.userId !== auth.userId) {
    return res.status(403).json({ error: '본인 응시가 아닙니다' })
  }
  if (attempt.submitted) {
    return res.status(409).json({ error: '이미 제출된 응시입니다' })
  }

  try {
    // 모든 문항과 저장된 답안 로드
    const questions = await prisma.question.findMany({ where: { quizId: attempt.quizId } })
    const existingAnswers = await prisma.answer.findMany({ where: { attemptId: id } })
    const answerMap = new Map(existingAnswers.map(a => [a.questionId, a]))

    // 자동채점 실행 + Answer 레코드 생성/업데이트
    let autoSum = 0
    let allAuto = true

    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        const existing = answerMap.get(q.id)
        const response = existing?.response ?? null
        const autoScore = autoGradeAnswer(
          { type: q.type, points: q.points, correctAnswer: q.correctAnswer, scoringMode: null },
          response,
        )

        if (autoScore === null) {
          allAuto = false
        } else {
          autoSum += autoScore
        }

        if (existing) {
          await tx.answer.update({
            where: { id: existing.id },
            data: { autoScore },
          })
        } else {
          await tx.answer.create({
            data: {
              attemptId: id,
              questionId: q.id,
              response: Prisma.DbNull,
              autoScore,
            },
          })
        }
      }

      // 지각 판정
      const now = new Date()
      const isLate = !!attempt.quiz.dueDate && now > attempt.quiz.dueDate

      await tx.attempt.update({
        where: { id },
        data: {
          submitted: true,
          submittedAt: now,
          endTime: now,
          isLate,
          autoScore: autoSum,
          totalScore: allAuto ? autoSum : null,
          graded: allAuto,
        },
      })
    })

    const updated = await prisma.attempt.findUnique({
      where: { id },
      include: { answers: true },
    })
    return res.status(200).json(updated)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
