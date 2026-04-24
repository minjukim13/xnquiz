// Canvas OAuth2 client_credentials + JWT assertion
// LTI Advantage Service(NRPS/AGS) 호출 전 Canvas access_token 발급용
//
// Canvas 공식: https://canvas.instructure.com/doc/api/file.oauth.html#accessing-lti-advantage-services
// 흐름:
//   1) 우리 RSA 개인키로 JWT 서명 (iss=sub=clientId, aud=Canvas token endpoint)
//   2) POST Canvas token endpoint (application/x-www-form-urlencoded)
//      - grant_type=client_credentials
//      - client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
//      - client_assertion=<signed_JWT>
//      - scope=<LTI Advantage scope>
//   3) access_token 반환 (Bearer 토큰, 보통 1시간 유효)

import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const NRPS_SCOPE = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly'

// AGS scopes — Canvas Gradebook lineitem 관리 + 점수 전송용
export const AGS_SCOPE_LINEITEM = 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem'
export const AGS_SCOPE_LINEITEM_READONLY = 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
export const AGS_SCOPE_SCORE = 'https://purl.imsglobal.org/spec/lti-ags/scope/score'
export const AGS_SCOPE_RESULT_READONLY = 'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'

const KID = process.env.LTI_KID || 'xnquiz-2026-04-22'

// 메모리 캐시 — (clientId, scope) 별 token 재사용 (만료 30초 여유)
type CachedToken = { token: string; expiresAt: number }
const tokenCache = new Map<string, CachedToken>()

function loadPrivateKey(): string {
  const envKey = process.env.LTI_PRIVATE_KEY
  if (envKey) {
    // Vercel 환경변수는 개행문자가 \n 문자열로 인코딩될 수 있음
    return envKey.includes('BEGIN PRIVATE KEY') ? envKey.replace(/\\n/g, '\n') : envKey
  }
  // 로컬 개발 fallback — keys/private.pem
  const localPath = path.resolve(process.cwd(), 'keys', 'private.pem')
  return readFileSync(localPath, 'utf-8')
}

function signClientAssertion(clientId: string, tokenEndpoint: string): string {
  const privateKey = loadPrivateKey()
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      iss: clientId,
      sub: clientId,
      aud: tokenEndpoint,
      iat: now,
      exp: now + 300, // 5분
      jti: crypto.randomBytes(16).toString('hex'),
    },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: KID,
    },
  )
}

export type CanvasTokenParams = {
  clientId: string
  tokenEndpoint: string // platform.authTokenUrl
  scope: string // 예: NRPS_SCOPE
}

/**
 * Canvas access_token 을 받아온다. 캐시된 유효 토큰이 있으면 재사용.
 */
export async function getCanvasAccessToken(params: CanvasTokenParams): Promise<string> {
  const { clientId, tokenEndpoint, scope } = params
  const cacheKey = `${clientId}::${scope}`

  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token
  }

  const assertion = signClientAssertion(clientId, tokenEndpoint)
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
    scope,
  })

  const resp = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Canvas token request failed (${resp.status}): ${text}`)
  }

  const data = (await resp.json()) as {
    access_token: string
    token_type?: string
    expires_in?: number
  }

  if (!data.access_token) {
    throw new Error('Canvas token response missing access_token')
  }

  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + expiresInSec * 1000,
  })

  return data.access_token
}
