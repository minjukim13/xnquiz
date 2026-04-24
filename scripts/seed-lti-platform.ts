// LtiPlatform 시드 스크립트 — Canvas Developer Key 발급 후 DB 에 플랫폼 정보 등록
//
// 사용:
//   tsx scripts/seed-lti-platform.ts <issuer> <clientId>
//   예) tsx scripts/seed-lti-platform.ts https://cnvs-dev.xinics.kr 10000000000001
//
// 환경변수 대체:
//   LTI_ISSUER, LTI_CLIENT_ID, LTI_AUTH_LOGIN_URL, LTI_AUTH_TOKEN_URL, LTI_JWKS_URL
//
// 전제: .env 에 DATABASE_URL 설정 (Vercel 에서는 `vercel env pull .env.local` 로 가져오기)
import 'dotenv/config'
import { prisma } from '../lib/prisma.js'

const issuer = process.env.LTI_ISSUER ?? process.argv[2]
const clientId = process.env.LTI_CLIENT_ID ?? process.argv[3]

if (!issuer || !clientId) {
  console.error('Usage: tsx scripts/seed-lti-platform.ts <issuer> <clientId>')
  console.error('예: tsx scripts/seed-lti-platform.ts https://cnvs-dev.xinics.kr 10000000000001')
  process.exit(1)
}

// Canvas 기본 엔드포인트 (issuer 기반 추측)
const authLoginUrl = process.env.LTI_AUTH_LOGIN_URL ?? `${issuer}/api/lti/authorize_redirect`
const authTokenUrl = process.env.LTI_AUTH_TOKEN_URL ?? `${issuer}/login/oauth2/token`
const jwksUrl = process.env.LTI_JWKS_URL ?? `${issuer}/api/lti/security/jwks`

const platform = await prisma.ltiPlatform.upsert({
  where: { issuer_clientId: { issuer, clientId } },
  update: { authLoginUrl, authTokenUrl, jwksUrl },
  create: { issuer, clientId, authLoginUrl, authTokenUrl, jwksUrl },
})

console.log('[seed-lti-platform] upserted:')
console.log({
  id: platform.id,
  issuer: platform.issuer,
  clientId: platform.clientId,
  authLoginUrl: platform.authLoginUrl,
  jwksUrl: platform.jwksUrl,
})

await prisma.$disconnect()
