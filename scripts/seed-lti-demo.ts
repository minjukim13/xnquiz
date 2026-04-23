// 시연용 LTI 데모 시드
// - Canvas 테스트 과목(CANVAS_EA5D...) 에 퀴즈 3개 + 문제모음 2개 추가
// - 기존 "1학기 중간고사" 는 유지
// - 이미 같은 제목이 있으면 해당 항목 스킵 (재실행 안전)
// - 교수자 소유자: minju.kim@xinics.com (ADMIN/PROFESSOR)
// - CANVAS_API_TOKEN 이 env 에 있으면 각 퀴즈를 Canvas Assignment(external_tool) 로 자동 등록
//   → Canvas "과제 및 평가", "학습 활동 현황" 메뉴에 노출됨
//
// 사용: tsx scripts/seed-lti-demo.ts

import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
// tsx(Node) 는 Vite 와 달리 .env.local 을 자동 로드하지 않음 — 명시적으로 추가 로드
dotenvConfig({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma.js'
import type { QuestionType, AutoGradeMode, BankDifficulty } from '@prisma/client'
import {
  ensureExternalToolAssignment,
  listExternalTools,
  pickMatchingTool,
} from '../lib/lti/canvas-rest.js'

const COURSE_CODE = 'CANVAS_EA5D93865BBDFB742FB410DF1E727F3012D2A0D6'
const OWNER_EMAIL = 'minju.kim@xinics.com'

type QuestionSeed = {
  type: QuestionType
  text: string
  points: number
  autoGrade: AutoGradeMode
  correctAnswer?: unknown
  choices?: unknown
  rubric?: string
  correctComment?: string
  incorrectComment?: string
}

type QuizSeed = {
  title: string
  description: string
  week: number
  session: number
  timeLimit: number | null
  questions: QuestionSeed[]
}

type BankQuestionSeed = {
  type: QuestionType
  text: string
  points: number
  difficulty: BankDifficulty | null
  options?: unknown
  correctAnswer?: unknown
  scoringMode?: string
  rubric?: string
}

type BankSeed = {
  name: string
  difficulty: BankDifficulty | null
  questions: BankQuestionSeed[]
}

// ───────────────────────────── 퀴즈 3개 ─────────────────────────────

const QUIZZES: QuizSeed[] = [
  {
    title: '프로그래밍 기초 쪽지시험',
    description: '프로그래밍 언어의 기본 개념과 문법에 대한 이해도를 점검합니다.',
    week: 2,
    session: 1,
    timeLimit: 30,
    questions: [
      {
        type: 'multiple_choice',
        text: '다음 중 변수를 선언할 때 사용할 수 없는 이름은 무엇입니까?',
        points: 4,
        autoGrade: 'AUTO',
        choices: ['userName', 'user_age', '2ndValue', 'totalCount'],
        correctAnswer: '2ndValue',
        correctComment: '숫자로 시작하는 변수명은 대부분의 언어에서 허용되지 않습니다.',
        incorrectComment: '변수명은 문자 또는 언더스코어(_)로 시작해야 합니다.',
      },
      {
        type: 'multiple_choice',
        text: '반복문 중 특정 조건에서 반복을 즉시 종료시키는 키워드는?',
        points: 4,
        autoGrade: 'AUTO',
        choices: ['continue', 'break', 'return', 'exit'],
        correctAnswer: 'break',
      },
      {
        type: 'multiple_answers',
        text: '다음 중 원시(primitive) 자료형에 해당하는 것을 모두 고르시오.',
        points: 4,
        autoGrade: 'PARTIAL',
        choices: ['int', 'String', 'boolean', 'Array', 'double'],
        correctAnswer: [0, 2, 4],
      },
      {
        type: 'short_answer',
        text: '객체지향 프로그래밍의 4대 특징 중, 내부 구현을 숨기고 외부에서는 정해진 인터페이스로만 접근하게 하는 개념을 무엇이라 하는가?',
        points: 4,
        autoGrade: 'AUTO',
        correctAnswer: ['캡슐화', 'encapsulation', 'Encapsulation'],
      },
      {
        type: 'true_false',
        text: 'Python 은 들여쓰기(indentation)로 코드 블록을 구분한다.',
        points: 4,
        autoGrade: 'AUTO',
        choices: ['참', '거짓'],
        correctAnswer: '참',
      },
    ],
  },
  {
    title: '자료구조 중간평가',
    description: '스택, 큐, 트리 등 기본 자료구조의 동작 원리를 확인합니다.',
    week: 3,
    session: 1,
    timeLimit: 20,
    questions: [
      {
        type: 'multiple_choice',
        text: '후입선출(LIFO) 구조를 갖는 자료구조는?',
        points: 4,
        autoGrade: 'AUTO',
        choices: ['큐(Queue)', '스택(Stack)', '연결 리스트', '해시 테이블'],
        correctAnswer: '스택(Stack)',
      },
      {
        type: 'multiple_choice',
        text: '이진 탐색 트리에서 원소 검색의 평균 시간 복잡도는?',
        points: 4,
        autoGrade: 'AUTO',
        choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
      },
      {
        type: 'true_false',
        text: '큐(Queue)는 가장 먼저 들어간 원소가 가장 먼저 나오는 구조이다.',
        points: 3,
        autoGrade: 'AUTO',
        choices: ['참', '거짓'],
        correctAnswer: '참',
      },
      {
        type: 'numerical',
        text: '원소가 1024개인 정렬된 배열에서 이진 탐색으로 최악의 경우 몇 번 비교해야 원소를 찾을 수 있는가?',
        points: 4,
        autoGrade: 'AUTO',
        correctAnswer: { value: 10, tolerance: 0 },
      },
    ],
  },
  {
    title: '데이터베이스 기말고사',
    description: '관계형 데이터베이스의 기본 개념과 SQL 문법을 종합적으로 평가합니다.',
    week: 4,
    session: 1,
    timeLimit: 60,
    questions: [
      {
        type: 'multiple_choice',
        text: 'SQL 에서 데이터를 조회할 때 사용하는 기본 명령어는?',
        points: 5,
        autoGrade: 'AUTO',
        choices: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],
        correctAnswer: 'SELECT',
      },
      {
        type: 'multiple_choice',
        text: '정규화의 주된 목적으로 가장 적절한 것은?',
        points: 5,
        autoGrade: 'AUTO',
        choices: [
          '쿼리 속도를 높이기 위해',
          '데이터 중복을 줄이고 무결성을 유지하기 위해',
          '저장 공간을 절약하기 위해',
          '테이블 개수를 줄이기 위해',
        ],
        correctAnswer: '데이터 중복을 줄이고 무결성을 유지하기 위해',
      },
      {
        type: 'multiple_answers',
        text: '다음 중 SQL 의 DDL(데이터 정의어)에 해당하는 명령어를 모두 고르시오.',
        points: 5,
        autoGrade: 'PARTIAL',
        choices: ['CREATE', 'SELECT', 'ALTER', 'INSERT', 'DROP'],
        correctAnswer: [0, 2, 4],
      },
      {
        type: 'short_answer',
        text: '두 테이블을 조건에 맞게 결합할 때 사용하는 SQL 키워드는? (영문 대문자, 한 단어)',
        points: 5,
        autoGrade: 'AUTO',
        correctAnswer: ['JOIN'],
      },
      {
        type: 'essay',
        text: '트랜잭션의 ACID 속성 4가지를 나열하고, 각각이 의미하는 바를 2~3문장으로 서술하시오.',
        points: 10,
        autoGrade: 'MANUAL',
        rubric:
          '1) 4가지 속성(원자성/일관성/고립성/지속성) 모두 언급: 4점\n2) 각 속성의 정의 정확성: 각 1.5점 (총 6점)\n3) 누락/오류 시 해당 항목 감점',
      },
    ],
  },
]

// ───────────────────────────── 문제모음 2개 ─────────────────────────────

const BANKS: BankSeed[] = [
  {
    name: '프로그래밍 기초 문제모음',
    difficulty: null,
    questions: [
      {
        type: 'multiple_choice',
        text: '다음 중 반복문이 아닌 것은?',
        points: 3,
        difficulty: 'low',
        options: ['for', 'while', 'do-while', 'switch'],
        correctAnswer: 'switch',
      },
      {
        type: 'multiple_choice',
        text: '조건식이 false 일 때 실행되는 블록을 지정하는 키워드는?',
        points: 3,
        difficulty: 'low',
        options: ['then', 'else', 'otherwise', 'elif'],
        correctAnswer: 'else',
      },
      {
        type: 'true_false',
        text: '함수는 인자를 반드시 받아야 한다.',
        points: 2,
        difficulty: 'low',
        options: ['참', '거짓'],
        correctAnswer: '거짓',
      },
      {
        type: 'short_answer',
        text: '프로그램 실행 중 발생하는 오류를 처리하는 구문을 영어로 쓰시오. (두 단어)',
        points: 4,
        difficulty: 'medium',
        correctAnswer: ['try catch', 'try-catch', 'try/catch'],
      },
      {
        type: 'multiple_choice',
        text: '다음 중 재귀 함수의 필수 조건은?',
        points: 4,
        difficulty: 'medium',
        options: ['반복문 포함', '종료 조건 존재', '전역 변수 사용', '파라미터 2개 이상'],
        correctAnswer: '종료 조건 존재',
      },
      {
        type: 'multiple_answers',
        text: '다음 중 정적 타입 언어를 모두 고르시오.',
        points: 5,
        difficulty: 'medium',
        options: ['Python', 'Java', 'JavaScript', 'C++', 'Ruby'],
        correctAnswer: [1, 3],
        scoringMode: 'partial',
      },
      {
        type: 'short_answer',
        text: '변수의 유효 범위를 결정하는 규칙을 일컫는 용어는?',
        points: 5,
        difficulty: 'high',
        correctAnswer: ['스코프', 'scope', 'Scope'],
      },
      {
        type: 'essay',
        text: '동기(synchronous)와 비동기(asynchronous) 처리의 차이를 예시를 들어 설명하시오.',
        points: 10,
        difficulty: 'high',
        rubric: '1) 정의 비교: 4점\n2) 구체적 예시 제시: 4점\n3) 장단점 언급: 2점',
      },
    ],
  },
  {
    name: '자료구조 문제모음',
    difficulty: null,
    questions: [
      {
        type: 'multiple_choice',
        text: '선형 구조에 해당하는 자료구조는?',
        points: 3,
        difficulty: 'low',
        options: ['트리', '그래프', '배열', '힙'],
        correctAnswer: '배열',
      },
      {
        type: 'true_false',
        text: '해시 테이블은 검색 시간 복잡도가 평균 O(1) 이다.',
        points: 3,
        difficulty: 'low',
        options: ['참', '거짓'],
        correctAnswer: '참',
      },
      {
        type: 'multiple_choice',
        text: '다음 중 힙(Heap) 의 활용 예로 가장 적절한 것은?',
        points: 4,
        difficulty: 'medium',
        options: ['우선순위 큐', '정적 배열', '단순 스택', '단순 큐'],
        correctAnswer: '우선순위 큐',
      },
      {
        type: 'multiple_answers',
        text: '다음 중 비선형 자료구조에 해당하는 것을 모두 고르시오.',
        points: 5,
        difficulty: 'medium',
        options: ['배열', '트리', '큐', '그래프', '연결 리스트'],
        correctAnswer: [1, 3],
        scoringMode: 'partial',
      },
      {
        type: 'numerical',
        text: '노드가 31개인 완전 이진 트리의 높이는? (루트의 높이=0 기준)',
        points: 5,
        difficulty: 'high',
        correctAnswer: { value: 4, tolerance: 0 },
      },
      {
        type: 'essay',
        text: '배열과 연결 리스트의 장단점을 각각 2가지 이상 비교하시오.',
        points: 10,
        difficulty: 'high',
        rubric: '1) 배열 장단점: 5점\n2) 연결 리스트 장단점: 5점',
      },
    ],
  },
]

// ───────────────────────────── 실행부 ─────────────────────────────

async function main() {
  const course = await prisma.course.findUnique({
    where: { code: COURSE_CODE },
    include: { ltiPlatform: true },
  })
  if (!course) throw new Error(`과목 없음: ${COURSE_CODE} — Canvas 교수자 launch 먼저 필요`)

  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })
  if (!owner) throw new Error(`교수자 User 없음: ${OWNER_EMAIL}`)

  console.log(`[seed-lti-demo] 대상 과목=${course.code}, 소유자=${owner.name} (${owner.id})`)

  // Canvas REST API 연동 가능 여부 판단
  // Canvas REST 는 숫자 course_id 를 요구함 (LTI opaque context_id 로는 404).
  // 브라우저 URL 의 /courses/<숫자>/ 에서 확인해 CANVAS_COURSE_ID env 로 주입.
  const canvasApiToken = process.env.CANVAS_API_TOKEN
  const publicUrl = process.env.XNQUIZ_PUBLIC_URL
  const canvasCourseId = process.env.CANVAS_COURSE_ID
  const canvasBaseUrl = course.ltiPlatform?.issuer

  const canSyncCanvas = !!(canvasApiToken && publicUrl && canvasCourseId && canvasBaseUrl)
  if (!canSyncCanvas) {
    console.log('[canvas-sync] SKIP — 다음 env/DB 값 중 누락 있음:')
    console.log(`   CANVAS_API_TOKEN=${canvasApiToken ? 'OK' : 'MISSING'}`)
    console.log(`   XNQUIZ_PUBLIC_URL=${publicUrl ? 'OK' : 'MISSING'}`)
    console.log(`   CANVAS_COURSE_ID=${canvasCourseId ? 'OK' : 'MISSING (브라우저 URL /courses/<숫자>/ 의 숫자)'}`)
    console.log(`   LtiPlatform.issuer=${canvasBaseUrl ? 'OK' : 'MISSING'}`)
    console.log('   → 퀴즈는 xnquiz DB 에만 생성되고 Canvas UI 에는 노출 안 됨')
  } else {
    console.log(`[canvas-sync] ENABLED — Canvas course_id=${canvasCourseId}, base=${canvasBaseUrl}`)
    console.log(`[canvas-sync]   XNQUIZ_PUBLIC_URL=${publicUrl}`)
  }

  // env 포맷 사전 검증
  if (canSyncCanvas && publicUrl) {
    if (!/^https?:\/\//.test(publicUrl)) {
      console.error(`[canvas-sync] ERROR: XNQUIZ_PUBLIC_URL 에 http(s):// 접두어 없음. 현재값="${publicUrl}"`)
      console.error('   .env.local 을 "https://..." 형식으로 고친 뒤 재실행')
      process.exit(1)
    }
    try { new URL(publicUrl) } catch {
      console.error(`[canvas-sync] ERROR: XNQUIZ_PUBLIC_URL 이 유효한 URL 이 아님. 현재값="${publicUrl}"`)
      process.exit(1)
    }
  }

  // 과목에 설치된 External Tool 중 xnquiz 매칭 도구 찾기 (content_id 주입용)
  let toolContentId: number | undefined
  if (canSyncCanvas) {
    try {
      const tools = await listExternalTools({
        baseUrl: canvasBaseUrl!,
        apiToken: canvasApiToken!,
        courseId: canvasCourseId!,
      })
      const probeUrl = `${publicUrl!.replace(/\/+$/, '')}/api/lti/launch`
      const matched = pickMatchingTool(tools, probeUrl)
      if (matched) {
        toolContentId = matched.id
        console.log(`[canvas-sync] tool matched: id=${matched.id} name="${matched.name}" url=${matched.url ?? matched.domain ?? '-'}`)
      } else {
        console.warn('[canvas-sync] WARN: 과목에 매칭되는 external tool 못 찾음. Assignment 클릭 시 실패 가능')
        console.warn(`   매칭 기준 URL=${probeUrl}`)
        console.warn('   설치된 tool 목록:')
        for (const t of tools) {
          console.warn(`     - id=${t.id} name="${t.name}" url=${t.url ?? '-'} domain=${t.domain ?? '-'}`)
        }
      }
    } catch (err) {
      console.warn('[canvas-sync] external tool 조회 실패:', String(err))
    }
  }

  const now = new Date()
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7일 후

  // 퀴즈 생성
  for (const q of QUIZZES) {
    const dup = await prisma.quiz.findFirst({
      where: { courseCode: COURSE_CODE, title: q.title },
    })

    let quiz = dup
    const totalPoints = q.questions.reduce((sum, qq) => sum + qq.points, 0)

    if (dup) {
      console.log(`[quiz] SKIP 이미 존재: ${q.title}`)
    } else {
      quiz = await prisma.quiz.create({
        data: {
          title: q.title,
          description: q.description,
          courseCode: COURSE_CODE,
          createdById: owner.id,
          status: 'open',
          visible: true,
          startDate: now,
          dueDate,
          week: q.week,
          session: q.session,
          timeLimit: q.timeLimit,
          allowAttempts: 1,
          scoreRevealEnabled: false,
          allowLateSubmit: false,
        },
      })

      for (let i = 0; i < q.questions.length; i++) {
        const qq = q.questions[i]
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            order: i + 1,
            type: qq.type,
            text: qq.text,
            points: qq.points,
            autoGrade: qq.autoGrade,
            correctAnswer: qq.correctAnswer as never,
            choices: qq.choices as never,
            rubric: qq.rubric,
            correctComment: qq.correctComment,
            incorrectComment: qq.incorrectComment,
          },
        })
      }
      console.log(`[quiz] CREATED ${q.title} (총 ${totalPoints}점, ${q.questions.length}문항)`)
    }

    // Canvas Assignment 등록 (external_tool 타입)
    if (canSyncCanvas && quiz) {
      try {
        // launchUrl 쿼리(quiz_id 등) 금지 — Canvas Dev Key 의 redirect_uri 정확매칭 때문에
        // 쿼리 포함 URL 은 bad_request("Invalid redirect_uri") 를 일으킴.
        // Assignment → 어떤 퀴즈인지 연결은 추후 custom_fields 방식으로 구현.
        const launchUrl = `${publicUrl!.replace(/\/+$/, '')}/api/lti/launch`
        const { assignment, created, updated } = await ensureExternalToolAssignment({
          baseUrl: canvasBaseUrl!,
          apiToken: canvasApiToken!,
          courseId: canvasCourseId!,
          name: q.title,
          launchUrl,
          pointsPossible: totalPoints,
          dueAt: dueDate,
          published: true,
          description: q.description,
          contentId: toolContentId,
        })
        const action = created ? 'CREATED' : updated ? 'UPDATED' : 'EXISTS'
        console.log(
          `[canvas-sync] ${action} assignment id=${assignment.id} "${assignment.name}"`,
        )
      } catch (err) {
        console.error(`[canvas-sync] FAIL "${q.title}":`, String(err))
      }
    }
  }

  // 문제모음 생성
  for (const b of BANKS) {
    const dup = await prisma.questionBank.findFirst({
      where: { courseCode: COURSE_CODE, name: b.name, createdById: owner.id },
    })
    if (dup) {
      console.log(`[bank] SKIP 이미 존재: ${b.name}`)
      continue
    }

    const bank = await prisma.questionBank.create({
      data: {
        name: b.name,
        courseCode: COURSE_CODE,
        createdById: owner.id,
        difficulty: b.difficulty,
      },
    })

    for (const bq of b.questions) {
      await prisma.bankQuestion.create({
        data: {
          bankId: bank.id,
          type: bq.type,
          difficulty: bq.difficulty,
          points: bq.points,
          text: bq.text,
          options: bq.options as never,
          correctAnswer: bq.correctAnswer as never,
          scoringMode: bq.scoringMode,
          rubric: bq.rubric,
        },
      })
    }
    console.log(`[bank] CREATED ${b.name} (${b.questions.length}문항)`)
  }

  console.log('[seed-lti-demo] 완료')
}

main()
  .catch((err) => {
    console.error('[seed-lti-demo] 실패', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
