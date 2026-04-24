#!/usr/bin/env node
// Vercel 빌드 진입점: DATABASE_URL 이 있으면 prisma migrate deploy, 없으면 skip 후 vite build
// Production(mock 모드, DB 미등록) 에서는 migrate 를 건너뛰어 빌드 실패 방지
import { spawnSync } from 'node:child_process'

const hasDb = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0

if (hasDb) {
  console.log('[vercel-build] DATABASE_URL detected → prisma migrate deploy')
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error('[vercel-build] prisma migrate deploy failed')
    process.exit(r.status ?? 1)
  }
} else {
  console.log('[vercel-build] DATABASE_URL not set → skip migrate (mock 모드로 판단)')
}

console.log('[vercel-build] vite build')
const v = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: true })
process.exit(v.status ?? 0)
