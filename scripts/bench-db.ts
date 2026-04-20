import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  for (let i = 1; i <= 5; i++) {
    const s = Date.now()
    await p.user.count()
    console.log(`[${i}] user.count() → ${Date.now() - s}ms`)
  }
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
