// POST /api/auth/dev-login  { email?: string; userId?: string }
// GET  /api/auth/dev-login?email=prof@xn.test
//
// 개발/프로토타입 전용 — NODE_ENV !== 'production' 에서만 동작.
// 비밀번호 검증 없이 JWT 발급. Canvas SSO 연동 전까지 RoleToggle 에서 호출.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { signToken } from '../../lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not Found' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const email = (req.method === 'GET' ? req.query.email : req.body?.email) as string | undefined
  const userId = (req.method === 'GET' ? req.query.userId : req.body?.userId) as string | undefined

  if (!email && !userId) {
    return res.status(400).json({ error: 'email 또는 userId 가 필요합니다' })
  }

  try {
    const user = await prisma.user.findFirst({
      where: email ? { email } : { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email })

    return res.status(200).json({
      token,
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
