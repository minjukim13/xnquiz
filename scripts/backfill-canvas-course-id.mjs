// 기존 Canvas Course 레코드의 ltiCanvasCourseId 백필.
// ltiNrpsUrl 경로에서 숫자 course.id 추출.
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const courses = await prisma.course.findMany({
  where: {
    code: { startsWith: 'CANVAS_' },
    ltiCanvasCourseId: null,
    ltiNrpsUrl: { not: null },
  },
  select: { code: true, ltiNrpsUrl: true, name: true },
})
console.log(`대상 ${courses.length}건:`)

for (const c of courses) {
  const m = c.ltiNrpsUrl?.match(/\/courses\/(\d+)\//)
  if (!m) {
    console.log(`  [skip] ${c.code} (${c.name}) — NRPS URL 에서 id 추출 실패: ${c.ltiNrpsUrl}`)
    continue
  }
  const canvasId = parseInt(m[1], 10)
  await prisma.course.update({
    where: { code: c.code },
    data: { ltiCanvasCourseId: canvasId },
  })
  console.log(`  [ok]   ${c.code} (${c.name}) → ltiCanvasCourseId=${canvasId}`)
}

await prisma.$disconnect()
