// Prisma 클라이언트 싱글턴
// Prisma 7 + Neon 어댑터 — Vercel Serverless 환경 최적화
// 핫-리로드 시 connection pool 폭증 방지
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('[prisma] DATABASE_URL is not set')
  }

  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalThis.__prisma__ ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma
}

export default prisma
