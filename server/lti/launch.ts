// POST /api/lti/launch — LTI 1.3 Launch
// Canvas 가 id_token (JWT) + state 를 form_post 로 전달
// 1) state 검증  2) JWT 서명 검증  3) User 매핑  4) 세션쿠키  5) SPA redirect
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicKey } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'

const LTI_ROLE_INSTRUCTOR = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
const LTI_ROLE_ADMIN = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator'

type CanvasJwk = { kty: string; kid: string; n: string; e: string; alg?: string }

async function fetchCanvasPublicKey(jwksUrl: string, kid: string): Promise<string> {
  const resp = await fetch(jwksUrl)
  if (!resp.ok) throw new Error(`JWKS fetch failed: ${resp.status}`)
  const data = (await resp.json()) as { keys: CanvasJwk[] }
  const jwk = data.keys.find((k) => k.kid === kid)
  if (!jwk) throw new Error(`No matching kid in JWKS: ${kid}`)
  // JsonWebKey 타입은 DOM lib 에만 있어서 server tsconfig(ES2022)에 없음. 런타임은 정상.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyObj = createPublicKey({ key: jwk as any, format: 'jwk' })
  return keyObj.export({ format: 'pem', type: 'spki' }).toString()
}

function mapRole(roles: unknown): 'PROFESSOR' | 'STUDENT' | 'ADMIN' {
  if (!Array.isArray(roles)) return 'STUDENT'
  const str = roles.map(String)
  if (str.some((r) => r.includes(LTI_ROLE_ADMIN))) return 'ADMIN'
  if (str.some((r) => r.includes(LTI_ROLE_INSTRUCTOR) || r.endsWith('Instructor') || r.endsWith('Teacher')))
    return 'PROFESSOR'
  return 'STUDENT'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const idToken = typeof body.id_token === 'string' ? body.id_token : undefined
  const state = typeof body.state === 'string' ? body.state : undefined

  if (!idToken || !state) {
    return res.status(400).json({ error: 'Missing id_token or state' })
  }

  const session = await prisma.ltiSession.findUnique({ where: { state } })
  if (!session) return res.status(400).json({ error: 'Unknown or expired state' })
  if (session.expiresAt < new Date()) {
    await prisma.ltiSession.delete({ where: { state } })
    return res.status(400).json({ error: 'Expired state' })
  }

  const platform = await prisma.ltiPlatform.findUnique({
    where: { issuer_clientId: { issuer: session.platformIssuer, clientId: session.clientId } },
  })
  if (!platform) return res.status(500).json({ error: 'Platform record missing' })

  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || typeof decoded === 'string') return res.status(400).json({ error: 'Invalid id_token' })
  const kid = decoded.header.kid
  if (!kid) return res.status(400).json({ error: 'id_token header missing kid' })

  let pem: string
  try {
    pem = await fetchCanvasPublicKey(platform.jwksUrl, kid)
  } catch (err) {
    return res.status(502).json({ error: 'Canvas JWKS fetch failed', detail: String(err) })
  }

  let claims: Record<string, unknown>
  try {
    claims = jwt.verify(idToken, pem, {
      algorithms: ['RS256'],
      issuer: platform.issuer,
      audience: platform.clientId,
    }) as Record<string, unknown>
  } catch (err) {
    return res.status(401).json({ error: 'JWT verification failed', detail: String(err) })
  }

  if (claims.nonce !== session.nonce) {
    return res.status(401).json({ error: 'Nonce mismatch' })
  }

  const sub = String(claims.sub ?? '')
  if (!sub) return res.status(400).json({ error: 'id_token missing sub' })

  const email = typeof claims.email === 'string' ? claims.email : `lti-${sub}@xn.lti`
  const name = typeof claims.name === 'string' ? claims.name : `LTI User ${sub.slice(0, 8)}`
  const ltiRoles = claims['https://purl.imsglobal.org/spec/lti/claim/roles']
  const role = mapRole(ltiRoles)

  // User 매핑: platformId + sub 기반 lookup → 없으면 생성
  const existingMap = await prisma.ltiUserMap.findUnique({
    where: { platformId_ltiSub: { platformId: platform.id, ltiSub: sub } },
    include: { user: true },
  })

  let userId: string
  if (existingMap) {
    userId = existingMap.userId
    await prisma.ltiUserMap.update({
      where: { id: existingMap.id },
      data: {
        email,
        name,
        roles: JSON.stringify(ltiRoles ?? []),
        lastLaunchAt: new Date(),
      },
    })
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'LTI_NO_PASSWORD',
        name,
        role,
      },
    })
    await prisma.ltiUserMap.create({
      data: {
        platformId: platform.id,
        ltiSub: sub,
        userId: user.id,
        email,
        name,
        roles: JSON.stringify(ltiRoles ?? []),
        lastLaunchAt: new Date(),
      },
    })
    userId = user.id
  }

  // Canvas 과목(context) 정보 추출 → Course 레코드 upsert
  // 앞으로 퀴즈 목록/생성이 canvas_{id} courseCode 로 격리됨
  const ctxClaim = claims['https://purl.imsglobal.org/spec/lti/claim/context']
  let canvasCourseCode: string | null = null
  if (ctxClaim && typeof ctxClaim === 'object' && ctxClaim !== null) {
    const ctx = ctxClaim as { id?: unknown; label?: unknown; title?: unknown }
    if (typeof ctx.id === 'string' && ctx.id) {
      const code = `CANVAS_${ctx.id}`.toUpperCase()
      const courseName =
        (typeof ctx.title === 'string' && ctx.title) ||
        (typeof ctx.label === 'string' && ctx.label) ||
        `Canvas Course ${ctx.id}`
      await prisma.course.upsert({
        where: { code },
        update: { name: courseName },
        create: { code, name: courseName },
      })
      canvasCourseCode = code
    }
  }

  // state 재사용 방지
  await prisma.ltiSession.delete({ where: { state } })

  // 세션 쿠키 발급 (기존 dev-login 과 동일 포맷)
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET not configured' })

  const sessionToken = jwt.sign(
    { userId, role, source: 'lti' },
    jwtSecret,
    { expiresIn: '1h' },
  )

  res.setHeader('Set-Cookie', [
    `xnq_session=${sessionToken}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=None`,
  ])

  // LTI 키를 2개 운영: target_link_uri 의 ?section 으로 진입 메뉴 구분
  // section=banks → 문제은행 탭으로 진입. 그 외 (quizzes/미지정) → 퀴즈(기본)
  const targetLinkClaim = claims['https://purl.imsglobal.org/spec/lti/claim/target_link_uri']
  let section: string | null = null
  if (typeof targetLinkClaim === 'string') {
    try { section = new URL(targetLinkClaim).searchParams.get('section') } catch { /* ignore */ }
  }

  // 기존 SPA 가 localStorage Bearer 방식이라 URL 해시로도 토큰 전달 (POC 호환용)
  // Phase B 에서 API 미들웨어가 쿠키를 읽게 되면 해시 전달은 폐기
  const publicUrl = process.env.XNQUIZ_PUBLIC_URL || `https://${req.headers.host}`
  const hashParams: Record<string, string> = { token: sessionToken, role, lti: '1' }
  if (section) hashParams.section = section
  if (canvasCourseCode) hashParams.courseCode = canvasCourseCode
  const hashPayload = new URLSearchParams(hashParams).toString()

  const redirectPath = section === 'banks' ? '/question-banks' : '/'
  res.setHeader('Location', `${publicUrl}${redirectPath}?lti=1#${hashPayload}`)
  return res.status(302).end()
}
