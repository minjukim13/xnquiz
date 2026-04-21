// GET  /api/quizzes/[id]/questions — 퀴즈 내 문항 목록
// POST /api/quizzes/[id]/questions — 문항 추가 (교수자/운영자)
// PUT  /api/quizzes/[id]/questions — 문항 배치 UPSERT (교수자/운영자)
//   기존 문항은 UPDATE (Answer FK 보존), 입력에 없는 기존 문항만 DELETE
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { QuestionType, AutoGradeMode } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../../lib/auth.js'

const VALID_TYPES: QuestionType[] = [
  'multiple_choice', 'true_false', 'multiple_answers', 'short_answer',
  'essay', 'numerical', 'formula', 'matching',
  'fill_in_multiple_blanks', 'multiple_dropdowns', 'file_upload', 'text',
]

function defaultAutoGrade(type: QuestionType): AutoGradeMode {
  if (type === 'essay' || type === 'file_upload') return 'MANUAL'
  if (type === 'short_answer') return 'PARTIAL'
  if (type === 'text') return 'NONE'
  return 'AUTO'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'GET')  return listQuestions(req, res, auth, id)
  if (req.method === 'POST') return createQuestion(req, res, auth, id)
  if (req.method === 'PUT')  return upsertQuestions(req, res, auth, id)

  res.setHeader('Allow', 'GET, POST, PUT')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

// ── GET: 문항 목록 (학생은 정답 숨김) ───────────────────────────
async function listQuestions(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { courseCode: true, visible: true },
    })
    if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

    if (auth.role === 'STUDENT') {
      if (!quiz.visible) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })
      const enr = await prisma.enrollment.findUnique({
        where: { userId_courseCode: { userId: auth.userId, courseCode: quiz.courseCode } },
      })
      if (!enr) return res.status(403).json({ error: '수강하지 않은 과목입니다' })
    }

    const questions = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { order: 'asc' },
    })

    const isStudent = auth.role === 'STUDENT'
    const body = questions.map(q => {
      if (!isStudent) return q
      const { correctAnswer, rubric, correctComment, incorrectComment, neutralComment, ...rest } = q
      return rest
    })

    return res.status(200).json(body)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── POST: 문항 추가 (교수자/운영자) ─────────────────────────────
async function createQuestion(req: VercelRequest, res: VercelResponse, auth: AuthPayload, quizId: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 추가 가능합니다' })

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const type = body.type as QuestionType | undefined
  const text = typeof body.text === 'string' ? body.text : ''
  const points = typeof body.points === 'number' ? body.points : 0

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `유효하지 않은 type: ${String(type)}` })
  }
  if (!text.trim()) return res.status(400).json({ error: 'text 가 필요합니다' })
  if (points < 0) return res.status(400).json({ error: 'points 는 0 이상이어야 합니다' })

  // order 자동 부여 (기존 최대 + 1)
  const last = await prisma.question.findFirst({
    where: { quizId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  const nextOrder = (last?.order ?? 0) + 1

  // autoGrade 기본값 타입별 추론
  const autoGrade: AutoGradeMode =
    (body.autoGrade as AutoGradeMode | undefined) ?? defaultAutoGrade(type)

  try {
    const question = await prisma.question.create({
      data: {
        quizId,
        order: nextOrder,
        type,
        text,
        points,
        autoGrade,
        correctAnswer: body.correctAnswer === undefined ? undefined : (body.correctAnswer as object),
        choices:       body.choices       === undefined ? undefined : (body.choices as object),
        rubric:           typeof body.rubric           === 'string' ? body.rubric           : undefined,
        correctComment:   typeof body.correctComment   === 'string' ? body.correctComment   : undefined,
        incorrectComment: typeof body.incorrectComment === 'string' ? body.incorrectComment : undefined,
        neutralComment:   typeof body.neutralComment   === 'string' ? body.neutralComment   : undefined,
        allowedFileTypes: body.allowedFileTypes === undefined ? undefined : (body.allowedFileTypes as object),
        maxFileSize:      typeof body.maxFileSize      === 'string' ? body.maxFileSize      : undefined,
      },
    })

    return res.status(201).json(question)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ── PUT: 배치 UPSERT ───────────────────────────────────────────
// body: [{ id?, type, text, points, correctAnswer?, choices?, ... }, ...]
//
// id 매칭:
//   - id 가 DB 에 (해당 quizId 로) 존재 → UPDATE  (Answer FK 보존)
//   - id 없거나 DB 에 없는 (mock-shape 포함) → CREATE (새 cuid)
// 입력에 빠진 기존 question → DELETE (Answer cascade)
// order 는 입력 배열 인덱스 + 1 로 일괄 재부여
async function upsertQuestions(req: VercelRequest, res: VercelResponse, auth: AuthPayload, quizId: string) {
  if (auth.role === 'STUDENT') return res.status(403).json({ error: '교수자만 수정 가능합니다' })

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다' })

  const items = Array.isArray(req.body) ? req.body : []

  // 입력 검증
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Record<string, unknown>
    const t = it.type as QuestionType | undefined
    if (!t || !VALID_TYPES.includes(t)) {
      return res.status(400).json({ error: `[${i}] 유효하지 않은 type: ${String(t)}` })
    }
    if (typeof it.text !== 'string' || !it.text.trim()) {
      return res.status(400).json({ error: `[${i}] text 가 필요합니다` })
    }
    if (typeof it.points !== 'number' || it.points < 0) {
      return res.status(400).json({ error: `[${i}] points 는 0 이상 숫자` })
    }
  }

  try {
    // 현재 DB 의 question id 집합
    const existing = await prisma.question.findMany({ where: { quizId }, select: { id: true } })
    const existingIds = new Set(existing.map(e => e.id))

    // 입력 항목 중 기존 id 와 매칭되는 것
    const keepIds = new Set<string>()
    for (const it of items as Record<string, unknown>[]) {
      if (typeof it.id === 'string' && existingIds.has(it.id)) keepIds.add(it.id)
    }
    const toDelete = existing.filter(e => !keepIds.has(e.id)).map(e => e.id)

    const result = await prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.question.deleteMany({ where: { id: { in: toDelete } } })
      }

      const out = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i] as Record<string, unknown>
        const type = it.type as QuestionType
        const data = {
          order: i + 1,
          type,
          text: it.text as string,
          points: it.points as number,
          autoGrade: (it.autoGrade as AutoGradeMode | undefined) ?? defaultAutoGrade(type),
          correctAnswer: it.correctAnswer === undefined ? undefined : (it.correctAnswer as object),
          choices:       it.choices       === undefined ? undefined : (it.choices as object),
          rubric:           typeof it.rubric           === 'string' ? it.rubric           : undefined,
          correctComment:   typeof it.correctComment   === 'string' ? it.correctComment   : undefined,
          incorrectComment: typeof it.incorrectComment === 'string' ? it.incorrectComment : undefined,
          neutralComment:   typeof it.neutralComment   === 'string' ? it.neutralComment   : undefined,
          allowedFileTypes: it.allowedFileTypes === undefined ? undefined : (it.allowedFileTypes as object),
          maxFileSize:      typeof it.maxFileSize      === 'string' ? it.maxFileSize      : undefined,
        }

        if (typeof it.id === 'string' && existingIds.has(it.id)) {
          const updated = await tx.question.update({ where: { id: it.id }, data })
          out.push(updated)
        } else {
          const created = await tx.question.create({ data: { ...data, quizId } })
          out.push(created)
        }
      }
      return out
    })

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
