// DB 전체 스키마 초기화 — 모든 테이블 + _prisma_migrations 까지 삭제
// 사용: npx tsx scripts/reset-db.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
})

async function main() {
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE')
  await prisma.$executeRawUnsafe('CREATE SCHEMA public')
  console.log('[reset-db] public schema dropped & recreated')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
