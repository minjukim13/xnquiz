// GET    /api/banks/[id] — 문제은행 단건 조회 (교수자만)
// PATCH  /api/banks/[id] — 문제은행 수정 (교수자만)
// DELETE /api/banks/[id] — 문제은행 삭제 (교수자만, cascade)
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

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  if (req.method === 'GET')    return getBank(req, res, auth, id)
  if (req.method === 'PATCH')  return patchBank(req, res, auth, id)
  if (req.method === 'DELETE') return deleteBank(req, res, auth, id)

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function getBank(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  try {
    const bank = await prisma.questionBank.findUnique({
      where: { id },
      include: { course: true, _count: { select: { questions: true } } },
    })
    // 교수자별 개인화: 본인 소유가 아니면 존재 자체 숨김 (404)
    // ADMIN 은 과목 내 모든 문제모음 접근 가능 (운영자 권한)
    if (!bank || (auth.role !== 'ADMIN' && bank.createdById !== auth.userId)) {
      return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })
    }

    return res.status(200).json({
      id: bank.id,
      name: bank.name,
      courseCode: bank.courseCode,
      courseName: bank.course.name,
      course: `${bank.courseCode} ${bank.course.name}`,
      difficulty: bank.difficulty ?? '',
      questionCount: bank._count.questions,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function patchBank(req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  const existing = await prisma.questionBank.findUnique({ where: { id } })
  if (!existing || (auth.role !== 'ADMIN' && existing.createdById !== auth.userId)) {
    return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n) return res.status(400).json({ error: 'name 은 빈 문자열일 수 없습니다' })
    if (n.length > 200) return res.status(400).json({ error: 'name 은 200자 이하' })
    data.name = n
  }

  if (typeof body.courseCode === 'string') {
    const code = body.courseCode.toUpperCase()
    const course = await prisma.course.findUnique({ where: { code } })
    if (!course) return res.status(400).json({ error: `존재하지 않는 과목코드: ${code}` })
    data.courseCode = code
  }

  if ('difficulty' in body) {
    const d = body.difficulty as BankDifficulty | '' | null | undefined
    data.difficulty = d && VALID_DIFFICULTIES.includes(d as BankDifficulty) ? d : null
  }

  try {
    const updated = await prisma.questionBank.update({
      where: { id },
      data,
      include: { course: true, _count: { select: { questions: true } } },
    })
    return res.status(200).json({
      id: updated.id,
      name: updated.name,
      courseCode: updated.courseCode,
      courseName: updated.course.name,
      course: `${updated.courseCode} ${updated.course.name}`,
      difficulty: updated.difficulty ?? '',
      questionCount: updated._count.questions,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function deleteBank(_req: VercelRequest, res: VercelResponse, auth: AuthPayload, id: string) {
  const existing = await prisma.questionBank.findUnique({ where: { id } })
  if (!existing || (auth.role !== 'ADMIN' && existing.createdById !== auth.userId)) {
    return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })
  }

  try {
    await prisma.questionBank.delete({ where: { id } })
    return res.status(204).end()
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
