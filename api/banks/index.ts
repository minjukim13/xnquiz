// GET  /api/banks?courseCode=CS301 — 문제은행 목록 (교수자만)
// POST /api/banks                   — 문제은행 생성 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { BankDifficulty } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest, type AuthPayload } from '../../lib/auth.js'

const VALID_DIFFICULTIES: BankDifficulty[] = ['low', 'medium', 'high']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })
  if (auth.role === 'STUDENT') {
    return res.status(403).json({ error: '교수자만 접근 가능합니다' })
  }

  if (req.method === 'GET')  return listBanks(req, res)
  if (req.method === 'POST') return createBank(req, res, auth)

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function listBanks(req: VercelRequest, res: VercelResponse) {
  const courseCode = (req.query.courseCode as string | undefined)?.toUpperCase()

  try {
    const banks = await prisma.questionBank.findMany({
      where: courseCode ? { courseCode } : undefined,
      include: { course: true, _count: { select: { questions: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    const result = banks.map(b => ({
      id: b.id,
      name: b.name,
      courseCode: b.courseCode,
      courseName: b.course.name,
      course: `${b.courseCode} ${b.course.name}`,
      difficulty: b.difficulty ?? '',
      questionCount: b._count.questions,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function createBank(req: VercelRequest, res: VercelResponse, auth: AuthPayload) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const courseCodeRaw = typeof body.courseCode === 'string' ? body.courseCode : ''
  const difficultyRaw = body.difficulty as BankDifficulty | '' | null | undefined

  if (!name) return res.status(400).json({ error: 'name 이 필요합니다' })
  if (name.length > 200) return res.status(400).json({ error: 'name 은 200자 이하' })
  if (!courseCodeRaw) return res.status(400).json({ error: 'courseCode 가 필요합니다' })

  const code = courseCodeRaw.toUpperCase()
  const course = await prisma.course.findUnique({ where: { code } })
  if (!course) return res.status(400).json({ error: `존재하지 않는 과목코드: ${code}` })

  const difficulty: BankDifficulty | null =
    difficultyRaw && VALID_DIFFICULTIES.includes(difficultyRaw as BankDifficulty)
      ? (difficultyRaw as BankDifficulty)
      : null

  try {
    const bank = await prisma.questionBank.create({
      data: { name, courseCode: code, difficulty, createdById: auth.userId },
      include: { course: true },
    })

    return res.status(201).json({
      id: bank.id,
      name: bank.name,
      courseCode: bank.courseCode,
      courseName: bank.course.name,
      course: `${bank.courseCode} ${bank.course.name}`,
      difficulty: bank.difficulty ?? '',
      questionCount: 0,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
