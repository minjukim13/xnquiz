#!/usr/bin/env node
// keys/public.pem → lib/lti/public-jwk.json (JWKS 엔드포인트 반환용)
// private.pem 은 건드리지 않음. Vercel 환경변수 LTI_PRIVATE_KEY 로 별도 주입.
import { createPublicKey } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const PUBLIC_PEM_PATH = 'keys/public.pem'
const OUTPUT_PATH = 'lib/lti/public-jwk.json'
const KID = process.env.LTI_KID || 'xnquiz-2026-04-22'

const publicPem = readFileSync(PUBLIC_PEM_PATH, 'utf-8')
const pubKey = createPublicKey(publicPem)

const jwk = pubKey.export({ format: 'jwk' })
jwk.kid = KID
jwk.alg = 'RS256'
jwk.use = 'sig'

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify({ keys: [jwk] }, null, 2) + '\n')

console.log(`[lti-jwk] generated ${OUTPUT_PATH} with kid=${KID}`)
