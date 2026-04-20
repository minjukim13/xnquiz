// GET  /api/banks/[id]/questions — 문제은행 내 문항 목록 (교수자만)
// POST /api/banks/[id]/questions — 은행 문항 추가 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { QuestionType, BankDifficulty } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../../lib/auth.js'

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

  if (req.method === 'GET')  return listBankQuestions(req, res, id)
  if (req.method === 'POST') return createBankQuestion(req, res, auth, id)

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function listBankQuestions(_req: VercelRequest, res: VercelResponse, bankId: string) {
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } })
  if (!bank) return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })

  try {
    const questions = await prisma.bankQuestion.findMany({
      where: { bankId },
      orderBy: { createdAt: 'asc' },
    })
    return res.status(200).json(questions)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function createBankQuestion(req: VercelRequest, res: VercelResponse, _auth: AuthPayload, bankId: string) {
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } })
  if (!bank) return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const type = body.type as QuestionType | undefined
  const text = typeof body.text === 'string' ? body.text : ''
  const points = typeof body.points === 'number' ? body.points : 0

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `유효하지 않은 type: ${String(type)}` })
  }
  if (!text.trim()) return res.status(400).json({ error: 'text 가 필요합니다' })
  if (points < 0) return res.status(400).json({ error: 'points 는 0 이상' })

  const difficultyRaw = body.difficulty as BankDifficulty | null | undefined
  const difficulty: BankDifficulty | null =
    difficultyRaw && VALID_DIFFICULTIES.includes(difficultyRaw)
      ? difficultyRaw
      : null

  try {
    const q = await prisma.bankQuestion.create({
      data: {
        bankId,
        type,
        text,
        points,
        difficulty,
        options:       body.options       === undefined ? undefined : (body.options       as object),
        correctAnswer: body.correctAnswer === undefined ? undefined : (body.correctAnswer as object),
        scoringMode:   typeof body.scoringMode === 'string' ? body.scoringMode : undefined,
        rubric:        typeof body.rubric      === 'string' ? body.rubric      : undefined,
      },
    })

    return res.status(201).json(q)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
