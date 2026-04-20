// GET /api/banks?courseCode=CS301 — 문제은행 목록 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest } from '../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })
  if (auth.role === 'STUDENT') {
    return res.status(403).json({ error: '교수자만 접근 가능합니다' })
  }

  const courseCode = (req.query.courseCode as string | undefined)?.toUpperCase()

  try {
    const banks = await prisma.questionBank.findMany({
      where: courseCode ? { courseCode } : undefined,
      include: {
        course: true,
        _count: { select: { questions: true } },
      },
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
