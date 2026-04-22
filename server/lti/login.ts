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

  const authUrl = new URL(platform.authLoginUrl)
  authUrl.searchParams.set('scope', 'openid')
  authUrl.searchParams.set('response_type', 'id_token')
  authUrl.searchParams.set('response_mode', 'form_post')
  authUrl.searchParams.set('prompt', 'none')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', targetLinkUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('nonce', nonce)
  authUrl.searchParams.set('login_hint', loginHint)
  if (ltiMessageHint) authUrl.searchParams.set('lti_message_hint', ltiMessageHint)

  res.setHeader('Location', authUrl.toString())
  return res.status(302).end()
}
