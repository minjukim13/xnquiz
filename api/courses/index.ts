// GET /api/courses — 과목 목록 + 수강생 수
// 학생: 본인 수강 과목만. 교수자/운영자: 전체.
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

  try {
    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' } })

    // 학생은 본인 수강 과목만 노출
    let filtered = courses
    if (auth.role === 'STUDENT') {
      const enrolled = await prisma.enrollment.findMany({
        where: { userId: auth.userId },
        select: { courseCode: true },
      })
      const codes = new Set(enrolled.map(e => e.courseCode))
      filtered = courses.filter(c => codes.has(c.code))
    }

    const result = await Promise.all(filtered.map(async (c) => {
      const studentCount = await prisma.enrollment.count({
        where: { courseCode: c.code, role: 'STUDENT' },
      })
      return {
        code: c.code,
        name: c.name,
        label: `${c.code} ${c.name}`,
        studentCount,
      }
    }))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
