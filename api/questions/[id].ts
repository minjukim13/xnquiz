// PATCH  /api/questions/[id] — 문항 수정 (교수자/운영자)
// DELETE /api/questions/[id] — 문항 삭제 (교수자/운영자)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { QuestionType, AutoGradeMode } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'

const VALID_TYPES: QuestionType[] = [
  'multiple_choice', 'true_false', 'multiple_answers', 'short_answer',
  'essay', 'numerical', 'formula', 'matching',
  'fill_in_multiple_blanks', 'multiple_dropdowns', 'file_upload', 'text',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'PATCH')  return patchQuestion(req, res, auth, id)
  if (req.method === 'DELETE') return deleteQuestion(req, res, auth, id)

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function patchQuestion(req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 수정 가능합니다' })

  const existing = await prisma.question.findUnique({ where: { id } })
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
      return res.status(400).json({ error: 'points 는 0 이상 숫자여야 합니다' })
    }
    data.points = body.points
  }

  if ('order' in body) data.order = body.order
  if ('autoGrade' in body) data.autoGrade = body.autoGrade as AutoGradeMode
  if ('correctAnswer' in body) data.correctAnswer = body.correctAnswer
  if ('choices' in body) data.choices = body.choices
  if ('rubric' in body) data.rubric = body.rubric
  if ('correctComment'   in body) data.correctComment   = body.correctComment
  if ('incorrectComment' in body) data.incorrectComment = body.incorrectComment
  if ('neutralComment'   in body) data.neutralComment   = body.neutralComment
  if ('allowedFileTypes' in body) data.allowedFileTypes = body.allowedFileTypes
  if ('maxFileSize'      in body) data.maxFileSize      = body.maxFileSize

  try {
    const updated = await prisma.question.update({ where: { id }, data })
    return res.status(200).json(updated)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function deleteQuestion(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 삭제 가능합니다' })

  const existing = await prisma.question.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: '문항을 찾을 수 없습니다' })

  try {
    await prisma.question.delete({ where: { id } })
    return res.status(204).end()
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
