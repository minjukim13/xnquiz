// GET /api/students?courseCode=CS301 — 학생 목록 (교수자/운영자만)
// courseCode 있으면 해당 과목 수강 학생만, 없으면 전체.
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
  if (auth.role !== 'PROFESSOR' && auth.role !== 'ADMIN' && auth.role !== 'TA') {
    return res.status(403).json({ error: '교수자만 접근 가능합니다' })
  }

  const courseCode = (req.query.courseCode as string | undefined)?.toUpperCase()

  try {
    let rows: Array<{
      id: string; name: string; email: string;
      studentId: string | null; department: string | null; year: string | null;
    }>

    if (courseCode) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseCode, role: 'STUDENT' },
        include: { user: true },
        orderBy: { user: { name: 'asc' } },
      })
      rows = enrollments.map(e => ({
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
        studentId: e.user.studentId,
        department: e.user.department,
        year: e.user.year,
      }))
    } else {
      const users = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        orderBy: { name: 'asc' },
      })
      rows = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        studentId: u.studentId,
        department: u.department,
        year: u.year,
      }))
    }

    return res.status(200).json(rows)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
