// GET/POST /api/lti/login — LTI 1.3 OIDC Initiation
// Canvas 가 처음 호출하는 엔드포인트. state/nonce 발급 후 Canvas auth endpoint 로 redirect
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

function param(req: VercelRequest, key: string): string | undefined {
  const q = req.query?.[key]
  if (typeof q === 'string') return q
  const b = (req.body as Record<string, unknown> | undefined)?.[key]
  if (typeof b === 'string') return b
  return undefined
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const iss = param(req, 'iss')
  const clientId = param(req, 'client_id')
  const loginHint = param(req, 'login_hint')
  const targetLinkUri = param(req, 'target_link_uri')
  const ltiMessageHint = param(req, 'lti_message_hint')

  if (!iss || !clientId || !loginHint || !targetLinkUri) {
    return res.status(400).json({
      error: 'Missing required LTI OIDC params',
      required: ['iss', 'client_id', 'login_hint', 'target_link_uri'],
      received: { iss, clientId, loginHint, targetLinkUri },
    })
  }

  const platform = await prisma.ltiPlatform.findUnique({
    where: { issuer_clientId: { issuer: iss, clientId } },
  })
  if (!platform) {
    return res.status(404).json({
      error: 'Unknown LTI platform — register via seed-lti-platform script',
      issuer: iss,
      clientId,
    })
  }

  const state = crypto.randomBytes(32).toString('base64url')
  const nonce = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await prisma.ltiSession.create({
    data: {
      state,
      nonce,
      platformIssuer: iss,
      clientId,
      loginHint,
      ltiMessageHint: ltiMessageHint ?? null,
      targetLinkUri,
      expiresAt,
    },
  })

  // redirect_uri 는 Canvas Dev Key 에 등록된 URL 과 정확 매칭 필수 → 쿼리/해시 제거.
  // 퀴즈 식별 같은 파라미터는 target_link_uri 에 남아 있고 id_token 클레임으로 전달됨.
  const redirectUri = (() => {
    try {
      const u = new URL(targetLinkUri)
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch {
      return targetLinkUri
    }
  })()

  const authUrl = new URL(platform.authLoginUrl)
  authUrl.searchParams.set('scope', 'openid')
  authUrl.searchParams.set('response_type', 'id_token')
  authUrl.searchParams.set('response_mode', 'form_post')
  authUrl.searchParams.set('prompt', 'none')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('nonce', nonce)
  authUrl.searchParams.set('login_hint', loginHint)
  if (ltiMessageHint) authUrl.searchParams.set('lti_message_hint', ltiMessageHint)

  res.setHeader('Location', authUrl.toString())
  return res.status(302).end()
}
