// Prisma 7 — 프로젝트 설정
// 마이그레이션 및 introspection 시 이 파일의 datasource.url 이 사용됨
// 런타임(PrismaClient)에서는 lib/prisma.ts 의 어댑터가 대신 접속
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
