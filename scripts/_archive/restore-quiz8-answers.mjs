// quiz 8 답안 복구 스크립트 (1회성)
//
// 배경: setQuizQuestions 가 DELETE→CREATE 방식이던 시절 사용자가 quiz 8 을 저장하면서
//       모든 question 이 새 cuid 로 재생성됨 → Answer 가 cascade 로 통째 삭제됨.
//       Attempt(45건) 는 살아있으므로 답안만 시드 로직 그대로 재생성.
//
// 매핑: 시드의 mock id (q8_1~q8_10) ↔ 현재 DB question (order 기준)
//
// 실행:
//   DATABASE_URL='...' node scripts/restore-quiz8-answers.mjs
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// seed.ts 와 동일한 로직 (재현성 보장)
function seedHash(a, b) {
  // seed.ts 와 동일
  return ((a * 2654435761 + b * 2246822519) >>> 0) % 100
}
function randomManualScore(maxPoints, i, j) {
  const ratios = [0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
  return Math.round(maxPoints * ratios[seedHash(i, j) % ratios.length] * 2) / 2
}

// seed.ts Q8_QUESTIONS 와 동일 (order, points, autoGrade)
const Q8_MOCK = [
  { mockId: 'q8_1',  order: 1,  points: 3,  autoGrade: true  },
  { mockId: 'q8_2',  order: 2,  points: 3,  autoGrade: true  },
  { mockId: 'q8_3',  order: 3,  points: 2,  autoGrade: true  },
  { mockId: 'q8_4',  order: 4,  points: 3,  autoGrade: true  },
  { mockId: 'q8_5',  order: 5,  points: 3,  autoGrade: true  },
  { mockId: 'q8_6',  order: 6,  points: 2,  autoGrade: true  },
  { mockId: 'q8_7',  order: 7,  points: 4,  autoGrade: true  },
  { mockId: 'q8_8',  order: 8,  points: 5,  autoGrade: true  },
  { mockId: 'q8_9',  order: 9,  points: 10, autoGrade: false },
  { mockId: 'q8_10', order: 10, points: 15, autoGrade: false },
]

const AUTO_RATE = {
  q8_1: 90, q8_2: 80, q8_3: 85, q8_4: 65,
  q8_5: 60, q8_6: 55, q8_7: 45, q8_8: 38,
}

// seed.ts ANSWER_POOL 중 q8_* 만 (응답값)
const ANSWER_POOL = {
  q8_1:  ['원자값으로만 구성된 도메인', '부분 함수적 종속 제거', 'BCNF 만족'],
  q8_2:  ['정수 0과 동일한 값이다', '값이 존재하지 않음을 의미한다'],
  q8_3:  ['참', '거짓'],
  q8_4:  ['부분 함수 종속', '이행적 함수 종속', '완전 함수 종속'],
  q8_5:  ['식별 관계(Identifying Relationship)', '기본키', '다중값 속성'],
  q8_6:  ['참', '거짓'],
  q8_7:  ['이행적 함수 종속', '부분 함수 종속'],
  q8_8:  ['분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다'],
  q8_9:  ['삽입 이상, 삭제 이상, 갱신 이상'],
  q8_10: [
    '1NF 원자값, 2NF 부분 종속 제거, 3NF 이행 종속 제거, BCNF 모든 결정자가 후보키.',
    '정규화 각 단계: 1NF~BCNF 를 예시와 함께 설명.',
  ],
}

async function main() {
  // 1. 현재 quiz 8 question 들 (order 정렬) → mockId → cuid 매핑
  const dbQuestions = await prisma.question.findMany({
    where: { quizId: '8' },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  })

  if (dbQuestions.length !== Q8_MOCK.length) {
    throw new Error(`question 수 불일치: DB=${dbQuestions.length}, mock=${Q8_MOCK.length}. 직접 확인 필요`)
  }

  const idMap = new Map() // mockId → cuid
  for (let i = 0; i < Q8_MOCK.length; i++) {
    if (dbQuestions[i].order !== Q8_MOCK[i].order) {
      throw new Error(`order 불일치: idx=${i}, db=${dbQuestions[i].order}, mock=${Q8_MOCK[i].order}`)
    }
    idMap.set(Q8_MOCK[i].mockId, dbQuestions[i].id)
  }
  console.log('  ↳ mock→cuid 매핑 완료')

  // 2. quiz 8 의 모든 attempt
  const attempts = await prisma.attempt.findMany({
    where: { quizId: '8' },
    select: { id: true, userId: true, submitted: true, graded: true },
  })
  console.log(`  ↳ attempt ${attempts.length} 건`)

  // 3. 기존 잔여 답안 0 인지 확인 (안전장치)
  const existingAnswers = await prisma.answer.count({ where: { attempt: { quizId: '8' } } })
  if (existingAnswers > 0) {
    throw new Error(`이미 답안이 ${existingAnswers}건 존재. 중복 생성 방지 차원에서 중단. 직접 확인 필요`)
  }

  let created = 0
  for (const att of attempts) {
    if (!att.submitted) continue // 미제출 attempt 는 답안 없음

    // userId 'sN' → i = N - 1 (시드 로직과 동일)
    const m = att.userId.match(/^s(\d+)$/)
    if (!m) {
      console.warn(`  · 알 수 없는 userId: ${att.userId} — 스킵`)
      continue
    }
    const i = parseInt(m[1], 10) - 1
    const isGraded = att.graded

    // 자동/수동 점수 재계산 (시드와 동일)
    const autoScores = {}
    const manualScoresEst = {}
    for (const q of Q8_MOCK) {
      if (q.autoGrade) {
        const rate = AUTO_RATE[q.mockId] ?? 70
        const isCorrect = seedHash(i, q.order) < rate
        autoScores[q.mockId] = isCorrect ? q.points : 0
      } else if (isGraded) {
        manualScoresEst[q.mockId] = randomManualScore(q.points, i, q.order)
      }
    }

    // Answer 10 개 생성
    for (const q of Q8_MOCK) {
      const pool = ANSWER_POOL[q.mockId] ?? ['답안']
      const response = pool[(i + q.order) % pool.length]
      const auto = autoScores[q.mockId] ?? null
      const manual = isGraded ? (manualScoresEst[q.mockId] ?? null) : null
      await prisma.answer.create({
        data: {
          attemptId: att.id,
          questionId: idMap.get(q.mockId),
          response,
          autoScore: auto,
          manualScore: manual,
          gradedById: isGraded ? 'prof1' : null,
          gradedAt: isGraded ? new Date('2026-04-05T14:00:00+09:00') : null,
        },
      })
      created++
    }
  }

  console.log(`✓ 답안 ${created} 건 생성 완료`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('✗ 복구 실패:', err)
  await prisma.$disconnect()
  process.exit(1)
})
