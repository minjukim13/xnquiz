// LTI 키 2개 환경에서 email-unique 충돌 버그로 같은 Canvas 사용자가 두 개의
// xnquiz User 로 쪼개진 경우 — ghost User 의 리소스를 real User 로 통합하고
// ghost User 를 삭제한다.
//
// 사용:
//   tsx scripts/merge-lti-ghost-user.ts                  # dry-run (기본)
//   tsx scripts/merge-lti-ghost-user.ts --execute        # 실제 반영
//
// 이전 대상:
// - LtiUserMap.userId: ghost → real (platform unique 충돌 없을 때만)
// - Enrollment: real 에 이미 있으면 ghost 것 삭제, 없으면 이전
// - Quiz.createdById / QuestionBank.createdById / Attempt.userId / Answer.gradedById: ghost → real 이전
// - 최종적으로 ghost User 삭제

import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma.js'

const GHOST_EMAIL = 'lti-84b54351-ca7b-4e38-9e48-08c0945d6b39@xn.lti'
const REAL_EMAIL = 'minju.kim@xinics.com'

type Plan = {
  ghost: { id: string; name: string; email: string }
  real: { id: string; name: string; email: string }
  ltiMapsToMove: Array<{ id: string; platformId: string; ltiSub: string; conflict: boolean }>
  enrollmentsToMove: Array<{ id: string; courseCode: string; role: string; conflict: boolean }>
  quizzesToMove: number
  banksToMove: number
  attemptsToMove: Array<{ id: string; quizId: string; attemptNumber: number; conflict: boolean }>
  answersGradedToMove: number
}

async function buildPlan(): Promise<Plan> {
  const ghost = await prisma.user.findUnique({ where: { email: GHOST_EMAIL } })
  const real = await prisma.user.findUnique({ where: { email: REAL_EMAIL } })
  if (!ghost) throw new Error(`ghost User 없음: ${GHOST_EMAIL}`)
  if (!real) throw new Error(`real User 없음: ${REAL_EMAIL}`)

  const ghostMaps = await prisma.ltiUserMap.findMany({ where: { userId: ghost.id } })
  const realMaps = await prisma.ltiUserMap.findMany({ where: { userId: real.id } })
  const realMapKey = new Set(realMaps.map((m) => `${m.platformId}::${m.ltiSub}`))
  const ltiMapsToMove = ghostMaps.map((m) => ({
    id: m.id,
    platformId: m.platformId,
    ltiSub: m.ltiSub,
    conflict: realMapKey.has(`${m.platformId}::${m.ltiSub}`),
  }))

  const ghostEnrs = await prisma.enrollment.findMany({ where: { userId: ghost.id } })
  const realEnrs = await prisma.enrollment.findMany({ where: { userId: real.id } })
  const realEnrKey = new Set(realEnrs.map((e) => e.courseCode))
  const enrollmentsToMove = ghostEnrs.map((e) => ({
    id: e.id,
    courseCode: e.courseCode,
    role: e.role,
    conflict: realEnrKey.has(e.courseCode),
  }))

  const [quizzesToMove, banksToMove] = await Promise.all([
    prisma.quiz.count({ where: { createdById: ghost.id } }),
    prisma.questionBank.count({ where: { createdById: ghost.id } }),
  ])

  const ghostAttempts = await prisma.attempt.findMany({ where: { userId: ghost.id } })
  const realAttempts = await prisma.attempt.findMany({ where: { userId: real.id } })
  const realAttemptKey = new Set(realAttempts.map((a) => `${a.quizId}::${a.attemptNumber}`))
  const attemptsToMove = ghostAttempts.map((a) => ({
    id: a.id,
    quizId: a.quizId,
    attemptNumber: a.attemptNumber,
    conflict: realAttemptKey.has(`${a.quizId}::${a.attemptNumber}`),
  }))

  const answersGradedToMove = await prisma.answer.count({ where: { gradedById: ghost.id } })

  return {
    ghost: { id: ghost.id, name: ghost.name, email: ghost.email },
    real: { id: real.id, name: real.name, email: real.email },
    ltiMapsToMove,
    enrollmentsToMove,
    quizzesToMove,
    banksToMove,
    attemptsToMove,
    answersGradedToMove,
  }
}

function printPlan(p: Plan) {
  const line = '─'.repeat(70)
  console.log(line)
  console.log('MERGE PLAN')
  console.log(line)
  console.log(`  ghost: ${p.ghost.name} <${p.ghost.email}> (id=${p.ghost.id})`)
  console.log(`  real : ${p.real.name} <${p.real.email}> (id=${p.real.id})`)
  console.log('')
  console.log(`[LtiUserMap] 이전 후보 ${p.ltiMapsToMove.length}건`)
  for (const m of p.ltiMapsToMove) {
    console.log(
      `  - platform=${m.platformId} sub=${m.ltiSub} ` +
        (m.conflict ? '→ 충돌(real 쪽에 이미 존재) → ghost 건 삭제' : '→ userId 변경 (ghost → real)'),
    )
  }
  console.log(`\n[Enrollment] 이전 후보 ${p.enrollmentsToMove.length}건`)
  for (const e of p.enrollmentsToMove) {
    console.log(
      `  - course=${e.courseCode} role=${e.role} ` +
        (e.conflict ? '→ 충돌(real 쪽에 이미 존재) → ghost 건 삭제' : '→ userId 변경 (ghost → real)'),
    )
  }
  console.log(`\n[Quiz.createdById] 이전: ${p.quizzesToMove}건`)
  console.log(`[QuestionBank.createdById] 이전: ${p.banksToMove}건`)
  console.log(`\n[Attempt] 이전 후보 ${p.attemptsToMove.length}건`)
  for (const a of p.attemptsToMove) {
    console.log(
      `  - quizId=${a.quizId} attempt#${a.attemptNumber} ` +
        (a.conflict ? '→ 충돌 → ghost 건 삭제' : '→ userId 변경'),
    )
  }
  console.log(`\n[Answer.gradedById] 이전: ${p.answersGradedToMove}건`)
  console.log(`\n[User] ghost 삭제: 1건 (${p.ghost.id})`)
  console.log(line)
}

async function execute(p: Plan) {
  await prisma.$transaction(async (tx) => {
    // 1. LtiUserMap
    for (const m of p.ltiMapsToMove) {
      if (m.conflict) {
        await tx.ltiUserMap.delete({ where: { id: m.id } })
      } else {
        await tx.ltiUserMap.update({ where: { id: m.id }, data: { userId: p.real.id } })
      }
    }

    // 2. Enrollment
    for (const e of p.enrollmentsToMove) {
      if (e.conflict) {
        await tx.enrollment.delete({ where: { id: e.id } })
      } else {
        await tx.enrollment.update({ where: { id: e.id }, data: { userId: p.real.id } })
      }
    }

    // 3. Quiz.createdById
    if (p.quizzesToMove > 0) {
      await tx.quiz.updateMany({
        where: { createdById: p.ghost.id },
        data: { createdById: p.real.id },
      })
    }

    // 4. QuestionBank.createdById
    if (p.banksToMove > 0) {
      await tx.questionBank.updateMany({
        where: { createdById: p.ghost.id },
        data: { createdById: p.real.id },
      })
    }

    // 5. Attempt
    for (const a of p.attemptsToMove) {
      if (a.conflict) {
        await tx.attempt.delete({ where: { id: a.id } })
      } else {
        await tx.attempt.update({ where: { id: a.id }, data: { userId: p.real.id } })
      }
    }

    // 6. Answer.gradedById
    if (p.answersGradedToMove > 0) {
      await tx.answer.updateMany({
        where: { gradedById: p.ghost.id },
        data: { gradedById: p.real.id },
      })
    }

    // 7. Ghost User 삭제
    await tx.user.delete({ where: { id: p.ghost.id } })
  })
}

async function main() {
  const shouldExecute = process.argv.includes('--execute')
  const plan = await buildPlan()
  printPlan(plan)

  if (!shouldExecute) {
    console.log('\n(dry-run) 실제 반영하려면 --execute 옵션을 붙여 재실행하세요.')
    return
  }

  console.log('\n[execute] 트랜잭션 실행...')
  await execute(plan)
  console.log('[execute] 완료')

  const remaining = await prisma.user.findUnique({ where: { id: plan.ghost.id } })
  console.log(`[verify] ghost User 존재 여부: ${remaining ? 'STILL EXISTS (실패)' : '삭제됨'}`)
}

main()
  .catch((e) => {
    console.error('[merge-lti-ghost-user] 실패:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
