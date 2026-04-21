// POST /api/questions/[id]/regrade — 문항 재채점 (교수자/운영자)
//
// body: {
//   option: 'full_points' | 'new_answer_only' | 'award_both' | 'no_regrade',
//   oldCorrectAnswer?: unknown   // award_both 일 때 이전 정답 (생략 시 new_answer_only 와 동일)
// }
//
// 처리:
//   1) 수동채점된 답안(manualScore != null) 은 보존 — skip
//   2) 옵션별 newScore 계산
//        - full_points     : question.points 만점 부여
//        - new_answer_only : 현재 정답 기준 자동채점 (null=수동채점 대기 → skip)
//        - award_both      : 이전 정답 / 새 정답 중 높은 점수
//        - no_regrade      : 즉시 0 반환
//   3) 영향 받은 Attempt 합계 재계산 — 미채점(autoScore=null && manualScore=null) 답안 있으면 graded=false
//   4) { changedAnswers, changedAttempts, regradedStudents }
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest } from '../../../lib/auth.js'
import { autoGradeAnswer } from '../../../lib/grader.js'

type RegradeOption = 'full_points' | 'new_answer_only' | 'award_both' | 'no_regrade'
const VALID_OPTIONS: RegradeOption[] = ['full_points', 'new_answer_only', 'award_both', 'no_regrade']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 재채점 가능합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const option = body.option as RegradeOption | undefined
  if (!option || !VALID_OPTIONS.includes(option)) {
    return res.status(400).json({ error: `option 은 ${VALID_OPTIONS.join('|')} 중 하나여야 합니다` })
  }

  if (option === 'no_regrade') {
    return res.status(200).json({ changedAnswers: 0, changedAttempts: 0, regradedStudents: 0 })
  }

  const question = await prisma.question.findUnique({ where: { id } })
  if (!question) return res.status(404).json({ error: '문항을 찾을 수 없습니다' })

  try {
    // 수동채점되지 않은 답안만 — 같은 quiz 의 attempt 안에 있는 것
    const answers = await prisma.answer.findMany({
      where: { questionId: id, manualScore: null },
      include: { attempt: { select: { id: true, userId: true, quizId: true } } },
    })

    let changedAnswers = 0
    const affectedAttemptIds = new Set<string>()
    const affectedUserIds = new Set<string>()

    await prisma.$transaction(async (tx) => {
      for (const ans of answers) {
        if (ans.attempt.quizId !== question.quizId) continue

        const currentScore = ans.autoScore ?? 0
        let newScore: number | null

        if (option === 'full_points') {
          newScore = question.points
        } else if (option === 'award_both') {
          const newPts = autoGradeAnswer(
            { type: question.type, points: question.points, correctAnswer: question.correctAnswer, scoringMode: null },
            ans.response,
          )
          const oldCorrect = body.oldCorrectAnswer
          const oldPts = oldCorrect === undefined
            ? null
            : autoGradeAnswer(
                { type: question.type, points: question.points, correctAnswer: oldCorrect, scoringMode: null },
                ans.response,
              )
          const candidates = [newPts, oldPts].filter((p): p is number => p !== null)
          if (candidates.length === 0) continue
          newScore = Math.max(...candidates)
        } else {
          // new_answer_only
          newScore = autoGradeAnswer(
            { type: question.type, points: question.points, correctAnswer: question.correctAnswer, scoringMode: null },
            ans.response,
          )
          if (newScore === null) continue
        }

        if (newScore !== currentScore) {
          await tx.answer.update({
            where: { id: ans.id },
            data: { autoScore: newScore },
          })
          changedAnswers++
          affectedAttemptIds.add(ans.attemptId)
          affectedUserIds.add(ans.attempt.userId)
        }
      }

      // 영향 받은 Attempt 합계 재계산
      for (const attemptId of affectedAttemptIds) {
        const all = await tx.answer.findMany({ where: { attemptId } })
        const autoSum = all.reduce((acc, a) => acc + (a.autoScore ?? 0), 0)
        const manualSum = all.reduce((acc, a) => acc + (a.manualScore ?? 0), 0)
        const hasUngraded = all.some(a => a.autoScore === null && a.manualScore === null)
        await tx.attempt.update({
          where: { id: attemptId },
          data: {
            autoScore: autoSum,
            manualScore: manualSum,
            totalScore: hasUngraded ? null : autoSum + manualSum,
            graded: !hasUngraded,
          },
        })
      }
    })

    return res.status(200).json({
      changedAnswers,
      changedAttempts: affectedAttemptIds.size,
      regradedStudents: affectedUserIds.size,
    })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
