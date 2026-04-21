// GET /api/auth/me
// Authorization: Bearer <token>
//
// 현재 토큰의 사용자 정보 반환. 앱 시작 시 "로그인 상태 확인" 용도.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest } from '../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) {
    return res.status(401).json({ error: '인증이 필요합니다' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
      },
    })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
