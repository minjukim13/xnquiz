// PUT /api/attempts/[id]/answers — 학생이 풀이 중 답안 저장
// body: { answers: [{ questionId, response }] }
// 본인 attempt + submitted=false 인 경우에만 저장 가능.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest } from '../../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  const attempt = await prisma.attempt.findUnique({ where: { id } })
  if (!attempt) return res.status(404).json({ error: '응시 기록을 찾을 수 없습니다' })

  // 본인 attempt 만 허용
  if (attempt.userId !== auth.userId) {
    return res.status(403).json({ error: '본인 응시가 아닙니다' })
  }

  if (attempt.submitted) {
    return res.status(409).json({ error: '이미 제출된 응시입니다' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const answers = Array.isArray(body.answers) ? body.answers : []
  if (answers.length === 0) {
    return res.status(400).json({ error: 'answers 배열이 필요합니다' })
  }

  // 해당 퀴즈의 문항만 저장 가능
  const questions = await prisma.question.findMany({
    where: { quizId: attempt.quizId },
    select: { id: true },
  })
  const validIds = new Set(questions.map(q => q.id))

  try {
    await prisma.$transaction(answers.map((a) => {
      const { questionId, response } = a as Record<string, unknown>
      if (typeof questionId !== 'string' || !validIds.has(questionId)) {
        throw new Error(`유효하지 않은 questionId: ${String(questionId)}`)
      }
      const value = response === undefined || response === null
        ? Prisma.DbNull
        : (response as Prisma.InputJsonValue)
      return prisma.answer.upsert({
        where: { attemptId_questionId: { attemptId: id, questionId } },
        create: { attemptId: id, questionId, response: value },
        update: { response: value },
      })
    }))

    return res.status(200).json({ saved: answers.length })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
