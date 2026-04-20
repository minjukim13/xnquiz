// GET /api/banks/[id]/questions — 문제은행 내 문항 목록 (교수자만)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../lib/prisma.js'
import { getAuthFromRequest } from '../../../lib/auth.js'

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

  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'id 필요' })

  try {
    const bank = await prisma.questionBank.findUnique({ where: { id } })
    if (!bank) return res.status(404).json({ error: '문제은행을 찾을 수 없습니다' })

    const questions = await prisma.bankQuestion.findMany({
      where: { bankId: id },
      orderBy: { createdAt: 'asc' },
    })

    return res.status(200).json(questions)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
