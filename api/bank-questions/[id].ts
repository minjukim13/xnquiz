// PATCH  /api/bank-questions/[id] — 문제은행 문항 수정 (교수자만)
// DELETE /api/bank-questions/[id] — 문제은행 문항 삭제 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { QuestionType, BankDifficulty } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'

const VALID_TYPES: QuestionType[] = [
  'multiple_choice', 'true_false', 'multiple_answers', 'short_answer',
  'essay', 'numerical', 'formula', 'matching',
  'fill_in_multiple_blanks', 'multiple_dropdowns', 'file_upload', 'text',
]
const VALID_DIFFICULTIES: BankDifficulty[] = ['low', 'medium', 'high']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })
  if (auth.role === 'STUDENT') {
    return res.status(403).json({ error: '교수자만 접근 가능합니다' })
  }

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'PATCH')  return patchBankQuestion(req, res, auth, id)
  if (req.method === 'DELETE') return deleteBankQuestion(req, res, auth, id)

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function patchBankQuestion(req: VercelRequest, res: VercelResponse, _auth: AuthPayload, id: string) {
  const existing = await prisma.bankQuestion.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: '문항을 찾을 수 없습니다' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if ('type' in body) {
    const t = body.type as QuestionType
    if (!VALID_TYPES.includes(t)) return res.status(400).json({ error: `유효하지 않은 type: ${String(t)}` })
    data.type = t
  }

  if ('text' in body) {
    if (typeof body.text !== 'string' || !body.text.trim()) {
      return res.status(400).json({ error: 'text 는 빈 문자열일 수 없습니다' })
    }
    data.text = body.text
  }

  if ('points' in body) {
    if (typeof body.points !== 'number' || body.points < 0) {
      return res.status(400).json({ error: 'points 는 0 이상 숫자' })
    }
    data.points = body.points
  }

  if ('difficulty' in body) {
    const d = body.difficulty as BankDifficulty | '' | null | undefined
    data.difficulty = d && VALID_DIFFICULTIES.includes(d as BankDifficulty) ? d : null
  }

  if ('options'       in body) data.options       = body.options
  if ('correctAnswer' in body) data.correctAnswer = body.correctAnswer
  if ('scoringMode'   in body) data.scoringMode   = typeof body.scoringMode === 'string' ? body.scoringMode : null
  if ('rubric'        in body) data.rubric        = typeof body.rubric      === 'string' ? body.rubric      : null

  try {
    const updated = await prisma.bankQuestion.update({ where: { id }, data })
    return res.status(200).json(updated)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function deleteBankQuestion(_req: VercelRequest, res: VercelResponse, _auth: AuthPayload, id: string) {
  const existing = await prisma.bankQuestion.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: '문항을 찾을 수 없습니다' })

  try {
    await prisma.bankQuestion.delete({ where: { id } })
    return res.status(204).end()
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
