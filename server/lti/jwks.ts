// GET /api/lti/jwks — LTI 1.3 공개키 JWKS
// Canvas 가 xnquiz 의 id_token 서명을 검증할 때 fetch 함 (주기적 캐시됨)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import publicJwks from '../../lib/lti/public-jwk.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json(publicJwks)
}
