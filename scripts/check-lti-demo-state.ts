// PM4 시연 검증용 — LTI 과목 현재 DB 상태 덤프
// 실행: tsx scripts/check-lti-demo-state.ts
import 'dotenv/config'
import { prisma } from '../lib/prisma.js'

const COURSE_CODE = 'CANVAS_EA5D93865BBDFB742FB410DF1E727F3012D2A0D6'

async function main() {
  const line = '─'.repeat(70)

  // 1. Course
  const course = await prisma.course.findUnique({
    where: { code: COURSE_CODE },
    include: { ltiPlatform: true },
  })
  console.log(line)
  console.log('[1] Course LTI 메타')
  console.log(line)
  console.log({
    code: course?.code,
    name: course?.name,
    hasPlatform: !!course?.ltiPlatform,
    platformIssuer: course?.ltiPlatform?.issuer,
    hasNrpsUrl: !!course?.ltiNrpsUrl,
    hasLineItemsUrl: !!course?.ltiLineItemsUrl,
    lastSyncedAt: course?.ltiLastSyncedAt,
  })

  // 2. Enrollment + User
  const enrollments = await prisma.enrollment.findMany({
    where: { courseCode: COURSE_CODE },
    include: { user: { include: { ltiMappings: true } } },
    orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
  })
  const realNameCount = enrollments.filter(e => !e.user.name.startsWith('LTI ')).length
  const ltiFallbackCount = enrollments.length - realNameCount
  console.log(line)
  console.log(`[2] Enrollment ${enrollments.length}명 (실명 ${realNameCount} / 익명 ${ltiFallbackCount})`)
  console.log(line)
  for (const e of enrollments) {
    const tag = e.user.name.startsWith('LTI ') ? '  ⚠️' : '  ✓'
    console.log(`${tag} [${e.role.padEnd(10)}] ${e.user.name.padEnd(22)} ${e.user.email.padEnd(40)} sid=${e.user.studentId ?? '-'}`)
  }

  // 3. Quiz
  const quizzes = await prisma.quiz.findMany({
    where: { courseCode: COURSE_CODE },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: [{ week: 'asc' }, { session: 'asc' }],
  })
  console.log(line)
  console.log(`[3] Quiz ${quizzes.length}개`)
  console.log(line)
  for (const q of quizzes) {
    console.log(`  [${q.status}] ${q.title}`)
    console.log(`     주차=${q.week ?? '-'} 차시=${q.session ?? '-'} 문항=${q._count.questions} 응시=${q._count.attempts} 제한시간=${q.timeLimit ?? '무제한'}분`)
    console.log(`     공개=${q.visible} 성적공개=${q.scoreRevealEnabled} AGS lineitem=${q.ltiLineItemUrl ? 'YES' : 'NO'}`)
  }

  // 4. Bank
  const banks = await prisma.questionBank.findMany({
    where: { courseCode: COURSE_CODE },
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(line)
  console.log(`[4] QuestionBank ${banks.length}개`)
  console.log(line)
  for (const b of banks) {
    console.log(`  ${b.name} (${b._count.questions}문항) — 소유자: ${b.createdBy.name}`)
  }

  // 5. Attempt
  const attempts = await prisma.attempt.findMany({
    where: { quiz: { courseCode: COURSE_CODE } },
    include: {
      user: { select: { name: true, email: true } },
      quiz: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  console.log(line)
  console.log(`[5] Attempt ${attempts.length}건`)
  console.log(line)
  for (const a of attempts) {
    console.log(`  ${a.user.name.padEnd(20)} → ${a.quiz.title.padEnd(30)} submitted=${a.submitted} score=${a.totalScore ?? a.autoScore ?? '-'}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
