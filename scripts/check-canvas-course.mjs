import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const courses = await prisma.course.findMany({
  where: { code: { startsWith: 'CANVAS_' } },
  select: { code: true, name: true, ltiContextId: true },
})
console.log('All CANVAS_* courses:')
console.table(courses)

await prisma.$disconnect()
