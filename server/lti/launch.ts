// POST /api/lti/launch — LTI 1.3 Launch
// Canvas 가 id_token (JWT) + state 를 form_post 로 전달
// 1) state 검증  2) JWT 서명 검증  3) User 매핑  4) 세션쿠키  5) SPA redirect
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicKey } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'
import { syncRosterFromNrps } from '../../lib/lti/nrps.js'

// LTI 1.3 roles 는 context(과목)/institution(기관)/system 레벨이 섞여 들어옴.
// xnquiz 화면 분기는 "이 과목에서의 역할"이 우선 — 기관 Admin 이어도 과목에서 Learner 면 학생 화면으로 보여야 함.
const CTX_ROLE_INSTRUCTOR = 'membership#Instructor'
const CTX_ROLE_TEACHER = 'membership#Teacher'
const CTX_ROLE_TA = 'membership#TeachingAssistant'
const CTX_ROLE_LEARNER = 'membership#Learner'
const INST_ROLE_ADMIN = 'institution/person#Administrator'

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
  // 1) 과목(context) 역할 우선
  if (str.some((r) => r.includes(CTX_ROLE_LEARNER))) return 'STUDENT'
  if (str.some((r) => r.includes(CTX_ROLE_INSTRUCTOR) || r.includes(CTX_ROLE_TEACHER) || r.includes(CTX_ROLE_TA)))
    return 'PROFESSOR'
  // 2) 과목 역할 없으면 기관 관리자 여부 확인
  if (str.some((r) => r.includes(INST_ROLE_ADMIN))) return 'ADMIN'
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

  // Canvas 가 실제 name/email 을 보냈는지 구분 — fallback 으로 User 를 덮어씌우면 안 되므로
  // 표준 claims.name 은 Canvas 가 계정/시점에 따라 들쭉날쭉 보내므로 custom variable substitution 을 우선.
  // Canvas Dev Key 의 "사용자 정의 필드" 에 아래 3줄 등록 전제:
  //   canvas_user_full_name=$Person.name.full
  //   canvas_user_email=$Person.email.primary
  //   canvas_user_login_id=$Canvas.user.loginId
  const customClaim = claims['https://purl.imsglobal.org/spec/lti/claim/custom']
  const custom = (customClaim && typeof customClaim === 'object') ? customClaim as Record<string, unknown> : {}
  const customName = typeof custom.canvas_user_full_name === 'string' && custom.canvas_user_full_name.trim()
    ? custom.canvas_user_full_name.trim() : null
  const customEmail = typeof custom.canvas_user_email === 'string' && custom.canvas_user_email.trim()
    ? custom.canvas_user_email.trim() : null
  const customLoginId = typeof custom.canvas_user_login_id === 'string' && custom.canvas_user_login_id.trim()
    ? custom.canvas_user_login_id.trim() : null

  const claimName = customName
    ?? (typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : null)
  const claimEmail = customEmail
    ?? (typeof claims.email === 'string' && claims.email.trim() ? claims.email.trim() : null)
  const email = claimEmail ?? `lti-${sub}@xn.lti`
  const name = claimName ?? `LTI User ${sub.slice(0, 8)}`
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
    // Canvas 가 실제 값을 보낸 경우에만 User 테이블도 최신화 (NRPS 가 익명화돼서 저장된 fallback 을 실값으로 교체)
    // 이메일 unique 충돌 시 name 만이라도 업데이트
    const hasIdentityClaim = !!(claimName || claimEmail || customLoginId)
    if (hasIdentityClaim) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(claimName ? { name: claimName } : {}),
            ...(claimEmail ? { email: claimEmail } : {}),
            ...(customLoginId ? { studentId: customLoginId } : {}),
          },
        })
      } catch {
        // email 또는 studentId unique 충돌 시 개별 필드만이라도 재시도
        if (claimName) {
          await prisma.user.update({ where: { id: userId }, data: { name: claimName } }).catch(() => {})
        }
        if (customLoginId) {
          await prisma.user.update({ where: { id: userId }, data: { studentId: customLoginId } }).catch(() => {})
        }
      }
      // LTI 키 2개(퀴즈/문제모음)로 같은 Canvas sub 이 다른 platform 에 등록된 경우,
      // Canvas 가 한쪽 launch 에만 name/email 을 보내줘 익명/실명이 섞인다.
      // 실명이 들어온 launch 를 기준으로 동일 sub 의 다른 platform User 도 일괄 동기화.
      const siblings = await prisma.ltiUserMap.findMany({
        where: { ltiSub: sub, platformId: { not: platform.id } },
      })
      for (const s of siblings) {
        if (s.userId === userId) continue
        await prisma.user.update({
          where: { id: s.userId },
          data: {
            ...(claimName ? { name: claimName } : {}),
            ...(claimEmail ? { email: claimEmail } : {}),
          },
        }).catch(async () => {
          if (claimName) {
            await prisma.user.update({ where: { id: s.userId }, data: { name: claimName } }).catch(() => {})
          }
        })
      }
    }
    if (!hasIdentityClaim) {
      // 반대 케이스: 이번 launch 는 익명으로 왔지만 동일 sub 의 다른 platform User 에 실명이 이미 있으면
      // 그 실명을 복사해서 채점 대시보드 표기 일관성 유지
      const sibling = await prisma.ltiUserMap.findFirst({
        where: {
          ltiSub: sub,
          platformId: { not: platform.id },
          user: { NOT: { name: { startsWith: 'LTI ' } } },
        },
        include: { user: true },
      })
      if (sibling?.user) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: sibling.user.name,
            email: sibling.user.email,
          },
        }).catch(async () => {
          await prisma.user.update({
            where: { id: userId },
            data: { name: sibling.user.name },
          }).catch(() => {})
        })
      }
    }
  } else {
    // LTI 키 2개(퀴즈/문제모음) 환경에서 같은 Canvas 사용자가 두 번째 키로 처음 들어오면
    // platform+sub 매핑은 없지만 email 은 이미 첫 키에서 만든 User 가 선점하고 있음.
    // email unique 충돌을 피하려고, 동일 sub 의 sibling User → 동일 email User 순서로 재사용.
    const siblingMap = await prisma.ltiUserMap.findFirst({
      where: { ltiSub: sub, platformId: { not: platform.id } },
    })
    let user = siblingMap
      ? await prisma.user.findUnique({ where: { id: siblingMap.userId } })
      : null
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } })
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'LTI_NO_PASSWORD',
          name,
          role,
        },
      })
    }
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
  const nrpsClaim = claims['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice']
  const agsClaim = claims['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint']
  const deploymentIdClaim = claims['https://purl.imsglobal.org/spec/lti/claim/deployment_id']
  let canvasCourseCode: string | null = null
  let nrpsUrl: string | null = null
  let agsLineItemsUrl: string | null = null
  let deploymentId: string | null = null

  if (typeof deploymentIdClaim === 'string' && deploymentIdClaim) {
    deploymentId = deploymentIdClaim
  }
  if (nrpsClaim && typeof nrpsClaim === 'object') {
    const nrps = nrpsClaim as { context_memberships_url?: unknown }
    if (typeof nrps.context_memberships_url === 'string') {
      nrpsUrl = nrps.context_memberships_url
    }
  }
  if (agsClaim && typeof agsClaim === 'object') {
    const ags = agsClaim as { lineitems?: unknown }
    if (typeof ags.lineitems === 'string') {
      agsLineItemsUrl = ags.lineitems
    }
  }

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
        update: {
          name: courseName,
          ltiPlatformId: platform.id,
          ltiContextId: ctx.id,
          ltiDeploymentId: deploymentId,
          ltiNrpsUrl: nrpsUrl,
          ltiLineItemsUrl: agsLineItemsUrl,
        },
        create: {
          code,
          name: courseName,
          ltiPlatformId: platform.id,
          ltiContextId: ctx.id,
          ltiDeploymentId: deploymentId,
          ltiNrpsUrl: nrpsUrl,
          ltiLineItemsUrl: agsLineItemsUrl,
        },
      })
      canvasCourseCode = code
    }
  }

  // 교수자/운영자 launch 시 NRPS 자동 동기화 (실패해도 launch 는 계속)
  // 운영자(ADMIN)는 교수자가 가진 모든 권한을 포함 — 동기화 트리거도 동일
  // POC 단계: 블로킹 동기식 — 수강생 수 많아지면 비동기 전환 검토
  if ((role === 'PROFESSOR' || role === 'ADMIN') && canvasCourseCode && nrpsUrl) {
    try {
      const syncResult = await syncRosterFromNrps({
        courseCode: canvasCourseCode,
        nrpsUrl,
        platformId: platform.id,
        clientId: platform.clientId,
        tokenEndpoint: platform.authTokenUrl,
      })
      console.log('[lti:launch] NRPS sync ok', { courseCode: canvasCourseCode, ...syncResult })
    } catch (err) {
      console.error('[lti:launch] NRPS sync failed', { courseCode: canvasCourseCode, err: String(err) })
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
