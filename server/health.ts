// GET /api/health — DB 연결 확인용 헬스체크
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
    })
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
