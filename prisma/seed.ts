/**
 * XN Quizzes — 시드 스크립트
 *
 * 실행: npx prisma db seed
 * 전제: .env 에 DATABASE_URL / DIRECT_URL 설정됨
 *
 * 원칙
 * - 실데이터 금지. 모든 이름은 허구 가상(`DEMO_NAMES`)
 * - 학번/이메일은 테스트 도메인(`xn.test` · RFC 2606 예약)
 * - mockData.js 의 퀴즈/문항 ID 를 그대로 재사용 → 프론트 API 전환 시 매핑 편의
 * - 학생 수 45 명으로 축소, 제출/채점 비율은 원본 유지
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('[seed] DATABASE_URL is not set — .env 확인')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
const PASSWORD_PLAIN = 'xnquiz1234!'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const DEMO_NAMES = [
  '김민준', '이서연', '박지호', '최유진', '정다은', '한승우', '오지수', '윤채원', '임도현', '강수아',
  '조현우', '신예린', '장하윤', '권도윤', '배수빈', '홍지민', '유하준', '문서윤', '송예준', '양지아',
  '류건우', '전소율', '남지안', '하도영', '심채영', '구민서', '곽태현', '안지원', '성윤호', '황서현',
  '노은채', '서재원', '엄시우', '허윤아', '추연우', '진소희', '나재민', '봉예솔', '변지환', '고은서',
  '백승현', '마하은', '천시윤', '탁민재', '길예지',
]

const DEMO_DEPARTMENTS = [
  '컴퓨터공학과', '소프트웨어학과', '정보통신공학과', '데이터사이언스학과',
  '전자공학과', '인공지능학과', '사이버보안학과', '산업공학과',
]

const DEMO_YEARS = ['2021', '2022', '2023', '2024']

const COURSES = [
  { code: 'CS301', name: '데이터베이스' },
  { code: 'CS201', name: '운영체제' },
  { code: 'CS401', name: '알고리즘' },
  { code: 'CS102', name: '자료구조' },
]

// ─────────────────────────────────────────────
// 응답 풀 (mockData.js ANSWER_POOL 에서 발췌)
// ─────────────────────────────────────────────

const ANSWER_POOL: Record<string, string[]> = {
  q1: ['SELECT', 'select', 'SELECT *', 'SELECT문', 'SELECT 명령어'],
  q2: ['데이터 중복 최소화', '이상(Anomaly) 제거', '데이터 정합성 유지', '저장 공간 효율화'],
  q3: ['외래키', 'Foreign Key', '참조키', '외부키', 'FK', '외래 키'],
  q4: ['CREATE, ALTER, DROP', 'CREATE, DROP', 'CREATE, ALTER, DROP, TRUNCATE', 'CREATE, ALTER'],
  q5: [
    'ACID는 원자성(Atomicity), 일관성(Consistency), 격리성(Isolation), 지속성(Durability)의 약자입니다.',
    'ACID 속성 중 원자성은 트랜잭션이 완전히 처리되거나 취소되어야 한다는 것입니다.',
    '트랜잭션의 ACID 속성은 데이터베이스 무결성을 보장합니다.',
  ],
  q6: ['거짓', '참', 'FALSE', 'false'],
  q7: ['DISTINCT', 'distinct', 'DISTINCT 키워드', 'GROUP BY'],
  q8: [
    'B-Tree 인덱스는 범위 검색에 유리하고 Hash 인덱스는 등치 검색에 최적화되어 있습니다.',
    'Hash 인덱스는 O(1) 시간복잡도로 등치 검색이 빠르나 범위 검색은 불가합니다.',
  ],
  q9: ['15', '15개', '15 rows'],
  q10: ['SELECT-데이터 조회, INSERT-데이터 삽입, UPDATE-데이터 수정', '모두 올바르게 연결', '일부 연결'],
  q11: ['ERD.pdf', 'ERD_설계서.pdf', 'erd_design.png'],

  // 퀴즈 8
  q8_1: ['원자값으로만 구성된 도메인', '부분 함수적 종속 제거', 'BCNF 만족'],
  q8_2: ['정수 0과 동일한 값이다', '값이 존재하지 않음을 의미한다'],
  q8_3: ['참', '거짓'],
  q8_4: ['부분 함수 종속', '이행적 함수 종속', '완전 함수 종속'],
  q8_5: ['식별 관계(Identifying Relationship)', '기본키', '다중값 속성'],
  q8_6: ['참', '거짓'],
  q8_7: ['이행적 함수 종속', '부분 함수 종속'],
  q8_8: ['분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다'],
  q8_9: ['삽입 이상, 삭제 이상, 갱신 이상'],
  q8_10: [
    '1NF 원자값, 2NF 부분 종속 제거, 3NF 이행 종속 제거, BCNF 모든 결정자가 후보키.',
    '정규화 각 단계: 1NF~BCNF 를 예시와 함께 설명.',
  ],
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

/** mockData 의 한글 scorePolicy → enum */
function toScorePolicy(val?: string): 'KEEP_HIGHEST' | 'KEEP_LATEST' | 'KEEP_AVERAGE' {
  if (val?.includes('최신')) return 'KEEP_LATEST'
  if (val?.includes('평균')) return 'KEEP_AVERAGE'
  return 'KEEP_HIGHEST'
}

/** autoGrade(boolean|string|null) → enum */
function toAutoGrade(val: unknown): 'AUTO' | 'MANUAL' | 'PARTIAL' | 'NONE' {
  if (val === true) return 'AUTO'
  if (val === false) return 'MANUAL'
  if (val === 'partial') return 'PARTIAL'
  return 'NONE'
}

/** 결정론적 해시 (seed 재현 가능) */
function seedHash(a: number, b: number): number {
  return ((a * 2654435761 + b * 2246822519) >>> 0) % 100
}

/** 랜덤 점수 (만점의 40~95%) — essay · 수동채점 용 */
function randomManualScore(maxPoints: number, i: number, j: number): number {
  const ratios = [0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
  return Math.round(maxPoints * ratios[seedHash(i, j) % ratios.length] * 2) / 2
}

// ─────────────────────────────────────────────
// 1. 초기화 (역순 삭제)
// ─────────────────────────────────────────────

async function resetDb() {
  console.log('  ↳ 기존 데이터 삭제 중...')
  await prisma.answer.deleteMany()
  await prisma.attempt.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.question.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.bankQuestion.deleteMany()
  await prisma.questionBank.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()
}

// ─────────────────────────────────────────────
// 2. User (교수자 1 + 학생 45)
// ─────────────────────────────────────────────

async function createUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10)

  await prisma.user.create({
    data: {
      id: 'prof1',
      email: 'prof@xn.test',
      passwordHash,
      name: '교수자 A',
      role: 'PROFESSOR',
    },
  })

  for (let i = 0; i < 45; i++) {
    const year = DEMO_YEARS[i % DEMO_YEARS.length]
    const numPart = String(i + 1).padStart(3, '0')
    await prisma.user.create({
      data: {
        id: `s${i + 1}`,
        email: `s${String(i + 1).padStart(2, '0')}@xn.test`,
        passwordHash,
        name: DEMO_NAMES[i],
        role: 'STUDENT',
        studentId: `${year}${numPart}`,
        department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
        year,
      },
    })
  }
}

// ─────────────────────────────────────────────
// 3. Course + Enrollment (전원 × 전 과목)
// ─────────────────────────────────────────────

async function createCoursesAndEnrollments() {
  for (const c of COURSES) {
    await prisma.course.create({ data: { code: c.code, name: c.name } })
    // 교수자 등록
    await prisma.enrollment.create({
      data: { userId: 'prof1', courseCode: c.code, role: 'PROFESSOR' },
    })
    // 학생 45명 등록
    for (let i = 0; i < 45; i++) {
      await prisma.enrollment.create({
        data: { userId: `s${i + 1}`, courseCode: c.code, role: 'STUDENT' },
      })
    }
  }
}

// ─────────────────────────────────────────────
// 4. Quiz (14개 — mockQuizzes 전체, 수치 45 기준 재계산)
// ─────────────────────────────────────────────

type QuizSeed = {
  id: string
  courseCode: string
  title: string
  description?: string
  status: 'draft' | 'open' | 'closed' | 'grading'
  visible: boolean
  hasFileUpload?: boolean
  startDate?: string
  dueDate?: string
  lockDate?: string
  week?: number
  session?: number
  timeLimit?: number | null
  scorePolicy?: string
  allowAttempts: number
  scoreRevealEnabled: boolean
  scoreRevealScope?: 'wrong_only' | 'with_answer' | null
  scoreRevealTiming?: 'immediately' | 'after_due' | 'period' | null
  scoreRevealStart?: string
  scoreRevealEnd?: string
  allowLateSubmit?: boolean
  lateSubmitDeadline?: string
  avgScore?: number
}

const QUIZZES: QuizSeed[] = [
  {
    id: '1', courseCode: 'CS301', title: '중간고사 - 데이터베이스 설계 및 SQL',
    description: 'ERD 설계, SQL 쿼리 작성, 정규화 전 범위를 다룹니다. 오픈북 불가, 제한 시간 내 제출하세요.',
    status: 'grading', visible: true, hasFileUpload: true,
    startDate: '2026-04-03 09:00', dueDate: '2026-04-03 18:00', lockDate: '2026-04-30 23:59',
    week: 8, session: 1, timeLimit: 120, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: false, scoreRevealScope: null, scoreRevealTiming: null,
  },
  {
    id: '2', courseCode: 'CS301', title: '1차 형성평가 - SQL 기초',
    description: 'SELECT, WHERE, JOIN 등 SQL 기초 구문을 다룹니다. 강의 3~4주차 내용 기반으로 출제됩니다.',
    status: 'closed', visible: true,
    startDate: '2026-03-24 09:00', dueDate: '2026-03-24 23:59', lockDate: '2026-04-30 23:59',
    week: 5, session: 2, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: true, scoreRevealScope: 'wrong_only', scoreRevealTiming: 'immediately',
    avgScore: 38.2,
  },
  {
    id: '3', courseCode: 'CS301', title: '주차별 퀴즈 4 - 인덱스와 쿼리 최적화',
    status: 'open', visible: true,
    startDate: '2026-04-06 09:00', dueDate: '2026-04-09 23:59', lockDate: '2026-04-30 23:59',
    week: 4, session: 1, scorePolicy: '최고 점수 유지', allowAttempts: 3,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'after_due',
    allowLateSubmit: true, lateSubmitDeadline: '2026-04-20 23:59',
  },
  {
    id: '4', courseCode: 'CS301', title: '기말고사 - 데이터베이스 심화',
    status: 'draft', visible: false,
    startDate: '2026-06-15 09:00', dueDate: '2026-06-15 18:00', lockDate: '2026-07-15 23:59',
    week: 16, session: 1, timeLimit: 120, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: false, scoreRevealScope: null, scoreRevealTiming: null,
  },
  {
    id: '5', courseCode: 'CS301', title: '주차별 퀴즈 5-1 - ER 다이어그램',
    status: 'closed', visible: true,
    startDate: '2026-03-17 09:00', dueDate: '2026-03-17 23:59', lockDate: '2026-03-31 23:59',
    week: 5, session: 1, scorePolicy: '최고 점수 유지', allowAttempts: 2,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'immediately',
    avgScore: 15.4,
  },
  {
    id: '6', courseCode: 'CS301', title: '5주차 형성평가 - 관계 대수',
    status: 'closed', visible: true,
    startDate: '2026-03-17 10:00', dueDate: '2026-03-17 23:59', lockDate: '2026-03-31 23:59',
    week: 5, session: 1, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: true, scoreRevealScope: 'wrong_only', scoreRevealTiming: 'after_due',
    avgScore: 7.8,
  },
  {
    id: '7', courseCode: 'CS301', title: '5주차 서술형 과제 - 정규화 단계 분석',
    status: 'grading', visible: true,
    startDate: '2026-03-17 09:00', dueDate: '2026-03-21 23:59', lockDate: '2026-04-30 23:59',
    week: 5, session: 1, timeLimit: null, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'after_due',
  },
  {
    id: '8', courseCode: 'CS301', title: '2차 형성평가 - 데이터베이스 설계 & 정규화',
    description: '관계형 데이터베이스 설계 원칙과 1NF~3NF 정규화 과정을 평가합니다. 강의 6~7주차 내용 기반으로 출제됩니다.',
    status: 'closed', visible: true,
    startDate: '2026-03-31 09:00', dueDate: '2026-03-31 23:59', lockDate: '2026-04-30 23:59',
    week: 7, session: 2, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'period',
    scoreRevealStart: '2026-04-01 00:00', scoreRevealEnd: '2026-04-30 23:59',
    avgScore: 34.9,
  },
  {
    id: '9', courseCode: 'CS301', title: '주차별 퀴즈 5 - 트랜잭션과 동시성 제어',
    description: '트랜잭션 ACID 속성, 동시성 제어 기법(Lock, MVCC), 교착상태 처리를 다룹니다.',
    status: 'open', visible: true,
    startDate: '2026-04-21 09:00', dueDate: '2026-04-23 23:59', lockDate: '2026-05-21 23:59',
    week: 9, session: 1, timeLimit: 20, scorePolicy: '최고 점수 유지', allowAttempts: 2,
    scoreRevealEnabled: true, scoreRevealScope: 'wrong_only', scoreRevealTiming: 'after_due',
  },
  {
    id: 'cs201_1', courseCode: 'CS201', title: '중간고사 - 프로세스 및 스레드',
    description: '프로세스 생명주기, 스레드 모델, 동기화 문제를 다룹니다.',
    status: 'closed', visible: true,
    startDate: '2026-03-18 09:00', dueDate: '2026-03-18 11:00', lockDate: '2026-04-30 23:59',
    week: 8, session: 1, timeLimit: 120, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: false, scoreRevealScope: null, scoreRevealTiming: null,
    avgScore: 72.3,
  },
  {
    id: 'cs201_2', courseCode: 'CS201', title: '1차 형성평가 - 프로세스 스케줄링',
    description: 'CPU 스케줄링 알고리즘(FCFS, SJF, Round Robin)을 평가합니다.',
    status: 'closed', visible: true,
    startDate: '2026-03-10 09:00', dueDate: '2026-03-10 23:59', lockDate: '2026-04-30 23:59',
    week: 4, session: 1, timeLimit: 30, scorePolicy: '최고 점수 유지', allowAttempts: 2,
    scoreRevealEnabled: true, scoreRevealScope: 'wrong_only', scoreRevealTiming: 'immediately',
    avgScore: 22.1,
  },
  {
    id: 'cs201_3', courseCode: 'CS201', title: '주차별 퀴즈 - 메모리 관리',
    description: '페이징, 세그멘테이션, 가상 메모리 기초 개념을 다룹니다.',
    status: 'draft', visible: false,
    startDate: '2026-04-14 09:00', dueDate: '2026-04-14 23:59', lockDate: '2026-05-14 23:59',
    week: 10, session: 1, timeLimit: 20, scorePolicy: '최고 점수 유지', allowAttempts: 3,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'after_due',
  },
  {
    id: 'cs401_1', courseCode: 'CS401', title: '중간고사 - 정렬 알고리즘',
    description: '버블 정렬부터 퀵 정렬까지 시간복잡도 및 동작 원리를 평가합니다.',
    status: 'closed', visible: true,
    startDate: '2026-03-20 09:00', dueDate: '2026-03-20 11:00', lockDate: '2026-04-20 23:59',
    week: 8, session: 1, timeLimit: 120, scorePolicy: '최고 점수 유지', allowAttempts: 1,
    scoreRevealEnabled: true, scoreRevealScope: 'with_answer', scoreRevealTiming: 'after_due',
    avgScore: 42.5,
  },
  {
    id: 'cs401_2', courseCode: 'CS401', title: '1차 형성평가 - 탐색 알고리즘',
    description: '이진 탐색, BFS, DFS의 시간복잡도와 활용 사례를 다룹니다.',
    status: 'draft', visible: false,
    startDate: '2026-04-17 09:00', dueDate: '2026-04-17 23:59', lockDate: '2026-05-17 23:59',
    week: 11, session: 1, timeLimit: 40, scorePolicy: '최고 점수 유지', allowAttempts: 2,
    scoreRevealEnabled: true, scoreRevealScope: 'wrong_only', scoreRevealTiming: 'immediately',
  },
]

async function createQuizzes() {
  for (const q of QUIZZES) {
    await prisma.quiz.create({
      data: {
        id: q.id,
        courseCode: q.courseCode,
        createdById: 'prof1',
        title: q.title,
        description: q.description,
        status: q.status,
        visible: q.visible,
        startDate: q.startDate ? new Date(q.startDate.replace(' ', 'T') + '+09:00') : null,
        dueDate: q.dueDate ? new Date(q.dueDate.replace(' ', 'T') + '+09:00') : null,
        lockDate: q.lockDate ? new Date(q.lockDate.replace(' ', 'T') + '+09:00') : null,
        week: q.week,
        session: q.session,
        timeLimit: q.timeLimit ?? null,
        hasFileUpload: q.hasFileUpload ?? false,
        scorePolicy: toScorePolicy(q.scorePolicy),
        allowAttempts: q.allowAttempts,
        scoreRevealEnabled: q.scoreRevealEnabled,
        scoreRevealScope: q.scoreRevealScope ?? null,
        scoreRevealTiming: q.scoreRevealTiming ?? null,
        scoreRevealStart: q.scoreRevealStart ? new Date(q.scoreRevealStart.replace(' ', 'T') + '+09:00') : null,
        scoreRevealEnd: q.scoreRevealEnd ? new Date(q.scoreRevealEnd.replace(' ', 'T') + '+09:00') : null,
        allowLateSubmit: q.allowLateSubmit ?? false,
        lateSubmitDeadline: q.lateSubmitDeadline ? new Date(q.lateSubmitDeadline.replace(' ', 'T') + '+09:00') : null,
        avgScore: q.avgScore ?? null,
      },
    })
  }
}

// ─────────────────────────────────────────────
// 5. Question (퀴즈 1 · 8 문항 전체)
// ─────────────────────────────────────────────

type QSeed = {
  id: string
  quizId: string
  order: number
  type: string
  text: string
  points: number
  autoGrade: unknown
  correctAnswer?: unknown
  choices?: unknown
  rubric?: string
  correct_comments?: string
  incorrect_comments?: string
  neutral_comments?: string
  allowedFileTypes?: string[]
  maxFileSize?: string
}

const Q1_QUESTIONS: QSeed[] = [
  {
    id: 'q1', quizId: '1', order: 1, type: 'multiple_choice', points: 5, autoGrade: true,
    text: 'SQL에서 데이터를 검색할 때 사용하는 기본 명령어는?',
    correctAnswer: 'SELECT', choices: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    correct_comments: 'SELECT는 SQL DML의 핵심 명령어입니다.',
    incorrect_comments: '"검색"에 해당하는 것은 SELECT입니다. 2장 SQL 기초 절을 다시 확인해 보세요.',
  },
  {
    id: 'q2', quizId: '1', order: 2, type: 'multiple_choice', points: 5, autoGrade: true,
    text: '정규화의 목적으로 가장 적절한 것은?',
    correctAnswer: '데이터 중복 최소화',
    choices: ['데이터 중복 최소화', '처리 속도 증가', '저장 공간 증가', '데이터 암호화'],
  },
  {
    id: 'q3', quizId: '1', order: 3, type: 'short_answer', points: 10, autoGrade: false,
    text: '관계형 데이터베이스에서 두 테이블을 연결하는 데 사용되는 키의 이름을 쓰시오.',
    correctAnswer: '외래키(Foreign Key)',
  },
  {
    id: 'q4', quizId: '1', order: 4, type: 'multiple_answers', points: 10, autoGrade: true,
    text: '다음 중 DDL(Data Definition Language)에 해당하는 명령어를 모두 고르시오.',
    correctAnswer: 'CREATE, ALTER, DROP', choices: ['CREATE', 'ALTER', 'DROP', 'SELECT', 'INSERT'],
  },
  {
    id: 'q5', quizId: '1', order: 5, type: 'essay', points: 20, autoGrade: false,
    text: '트랜잭션의 ACID 속성에 대해 각각 설명하고, 실제 데이터베이스 시스템에서 이를 어떻게 보장하는지 구체적인 예시를 들어 서술하시오.',
    rubric: '원자성·일관성·격리성·지속성 각 속성 정의 + 보장 기법 + 예시',
  },
  {
    id: 'q6', quizId: '1', order: 6, type: 'true_false', points: 5, autoGrade: true,
    text: 'PRIMARY KEY는 NULL 값을 허용한다.',
    correctAnswer: '거짓', choices: ['참', '거짓'],
  },
  {
    id: 'q7', quizId: '1', order: 7, type: 'short_answer', points: 10, autoGrade: false,
    text: 'SELECT문에서 중복 행을 제거하기 위해 사용하는 키워드는?',
    correctAnswer: 'DISTINCT',
  },
  {
    id: 'q8', quizId: '1', order: 8, type: 'essay', points: 15, autoGrade: false,
    text: 'B-Tree 인덱스와 Hash 인덱스의 차이점을 비교하고, 각각 어떤 상황에서 사용하는 것이 적합한지 설명하시오.',
    rubric: 'B-Tree/Hash 구조 차이 + 적합 상황 비교',
  },
  {
    id: 'q9', quizId: '1', order: 9, type: 'numerical', points: 10, autoGrade: true,
    text: '아래 테이블에 저장된 레코드 수를 구하는 SQL 결과값은? (단, NULL 포함)',
    correctAnswer: '15',
  },
  {
    id: 'q10', quizId: '1', order: 10, type: 'matching', points: 10, autoGrade: true,
    text: '다음 SQL 명령어와 그 기능을 올바르게 연결하시오.',
    correctAnswer: null,
  },
  {
    id: 'q11', quizId: '1', order: 11, type: 'file_upload', points: 15, autoGrade: false,
    text: 'ERD 설계 결과물을 PDF 또는 이미지 파일로 제출하시오. 최소 3개 이상의 엔티티와 관계를 포함해야 합니다.',
    correctAnswer: null, allowedFileTypes: ['pdf', 'png', 'jpg', 'hwp'], maxFileSize: '10MB',
  },
]

const Q8_QUESTIONS: QSeed[] = [
  {
    id: 'q8_1', quizId: '8', order: 1, type: 'multiple_choice', points: 3, autoGrade: true,
    text: '1NF(제1정규형)의 기본 요구 사항은?',
    correctAnswer: '원자값으로만 구성된 도메인',
    choices: ['원자값으로만 구성된 도메인', '부분 함수적 종속 제거', '이행적 함수 종속 제거', 'BCNF 만족'],
  },
  {
    id: 'q8_2', quizId: '8', order: 2, type: 'multiple_choice', points: 3, autoGrade: true,
    text: 'NULL 값에 대한 설명으로 틀린 것은?',
    correctAnswer: '정수 0과 동일한 값이다',
    choices: ['값이 존재하지 않음을 의미한다', '아직 알려지지 않은 값을 나타낸다', '정수 0과 동일한 값이다', 'IS NULL로 비교해야 한다'],
  },
  {
    id: 'q8_3', quizId: '8', order: 3, type: 'true_false', points: 2, autoGrade: true,
    text: '슈퍼키(Super Key)는 릴레이션의 모든 튜플을 유일하게 식별할 수 있다.',
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q8_4', quizId: '8', order: 4, type: 'multiple_choice', points: 3, autoGrade: true,
    text: '2NF 위반의 직접적인 원인이 되는 것은?',
    correctAnswer: '부분 함수 종속',
    choices: ['완전 함수 종속', '부분 함수 종속', '이행적 함수 종속', '다치 종속'],
  },
  {
    id: 'q8_5', quizId: '8', order: 5, type: 'multiple_choice', points: 3, autoGrade: true,
    text: 'ER 다이어그램에서 약한 엔티티(Weak Entity)가 존재하기 위해 반드시 필요한 것은?',
    correctAnswer: '식별 관계(Identifying Relationship)',
    choices: ['기본키', '식별 관계(Identifying Relationship)', '다중값 속성', '파생 속성'],
  },
  {
    id: 'q8_6', quizId: '8', order: 6, type: 'true_false', points: 2, autoGrade: true,
    text: 'BCNF를 만족하는 릴레이션은 반드시 3NF를 만족한다.',
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q8_7', quizId: '8', order: 7, type: 'multiple_choice', points: 4, autoGrade: true,
    text: '함수 종속 A→B, B→C가 성립할 때 A→C가 성립하는 현상을 무엇이라 하는가?',
    correctAnswer: '이행적 함수 종속',
    choices: ['완전 함수 종속', '부분 함수 종속', '이행적 함수 종속', '다치 종속'],
  },
  {
    id: 'q8_8', quizId: '8', order: 8, type: 'multiple_choice', points: 5, autoGrade: true,
    text: '무손실 분해(Lossless Decomposition)의 조건으로 옳은 것은?',
    correctAnswer: '분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다',
    choices: [
      '분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다',
      '분해된 릴레이션의 행 수가 동일해야 한다',
      '분해된 릴레이션의 속성 수가 동일해야 한다',
      '분해된 릴레이션이 같은 도메인을 가져야 한다',
    ],
  },
  {
    id: 'q8_9', quizId: '8', order: 9, type: 'short_answer', points: 10, autoGrade: false,
    text: '정규화 과정에서 제거하고자 하는 데이터 이상(Anomaly)의 종류 3가지를 모두 쓰시오.',
    correctAnswer: '삽입 이상, 삭제 이상, 갱신 이상',
  },
  {
    id: 'q8_10', quizId: '8', order: 10, type: 'essay', points: 15, autoGrade: false,
    text: '1NF부터 BCNF까지 정규화의 각 단계를 정의하고, 예시 테이블을 활용하여 각 단계로 분해하는 과정을 서술하시오.',
    correctAnswer: null,
  },
]

async function createQuestions() {
  const all = [...Q1_QUESTIONS, ...Q8_QUESTIONS]
  for (const q of all) {
    await prisma.question.create({
      data: {
        id: q.id,
        quizId: q.quizId,
        order: q.order,
        type: q.type as any,
        text: q.text,
        points: q.points,
        autoGrade: toAutoGrade(q.autoGrade),
        correctAnswer: q.correctAnswer === undefined ? undefined : (q.correctAnswer as any),
        choices: q.choices === undefined ? undefined : (q.choices as any),
        rubric: q.rubric,
        correctComment: q.correct_comments,
        incorrectComment: q.incorrect_comments,
        neutralComment: q.neutral_comments,
        allowedFileTypes: q.allowedFileTypes ? (q.allowedFileTypes as any) : undefined,
        maxFileSize: q.maxFileSize,
      },
    })
  }
}

// ─────────────────────────────────────────────
// 6. QuestionBank + BankQuestion
// ─────────────────────────────────────────────

const BANKS = [
  { id: 'bank1', courseCode: 'CS301', name: 'DB 종합 문제집', difficulty: null },
  { id: 'bank2', courseCode: 'CS301', name: 'SQL 심화', difficulty: 'high' as const },
  { id: 'bank3', courseCode: 'CS301', name: 'SQL 기초', difficulty: 'medium' as const },
  { id: 'bank4', courseCode: 'CS301', name: 'DB 입문', difficulty: 'low' as const },
  { id: 'bank5', courseCode: 'CS201', name: '운영체제 종합', difficulty: null },
  { id: 'bank6', courseCode: 'CS401', name: '알고리즘 심화', difficulty: 'high' as const },
]

type BQ = {
  id: string
  bankId: string
  type: string
  difficulty: 'low' | 'medium' | 'high' | null
  points: number
  usageCount: number
  text: string
  options?: unknown
  correctAnswer?: unknown
  scoringMode?: string
  rubric?: string
}

const BANK_QUESTIONS: BQ[] = [
  { id: 'bq1', bankId: 'bank1', type: 'multiple_choice', difficulty: 'low', points: 5, usageCount: 3,
    text: '관계형 데이터베이스에서 기본키(Primary Key)의 역할은?',
    options: ['각 행을 유일하게 식별한다', '테이블 간 관계를 정의한다', '데이터 타입을 지정한다', '인덱스를 자동 생성한다'],
    correctAnswer: 0 },
  { id: 'bq2', bankId: 'bank1', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 2,
    text: 'SQL에서 NULL 값을 비교할 때 올바른 방법은?',
    options: ['= NULL', 'IS NULL', '== NULL', 'EQUALS NULL'], correctAnswer: 1 },
  { id: 'bq3', bankId: 'bank1', type: 'short_answer', difficulty: 'high', points: 10, usageCount: 1,
    text: '트랜잭션의 ACID 속성 중 Atomicity가 보장하는 것을 설명하시오.',
    correctAnswer: ['모두 실행되거나 모두 취소', '원자성', 'All or Nothing'] },
  { id: 'bq4', bankId: 'bank1', type: 'true_false', difficulty: 'low', points: 3, usageCount: 4,
    text: 'SELECT 쿼리는 데이터를 변경하지 않는다.', correctAnswer: true },
  { id: 'bq5', bankId: 'bank1', type: 'essay', difficulty: 'high', points: 15, usageCount: 0,
    text: 'ERD(개체-관계 다이어그램)와 관계형 스키마의 차이를 설명하시오.',
    rubric: 'ERD 는 개념적 모델, 관계형 스키마는 논리적 모델. 두 모델의 목적과 추상화 수준 차이 서술.' },
  { id: 'bq6', bankId: 'bank1', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 2,
    text: '정규화 과정에서 2NF(제2정규형)를 만족하려면 어떤 조건이 필요한가?',
    options: ['모든 속성이 원자값이어야 한다', '부분 함수 종속이 제거되어야 한다', '이행적 함수 종속이 제거되어야 한다', '모든 결정자가 후보키여야 한다'],
    correctAnswer: 1 },

  { id: 'bq7', bankId: 'bank2', type: 'multiple_choice', difficulty: 'high', points: 10, usageCount: 1,
    text: '서브쿼리와 JOIN 중 일반적으로 성능 측면에서 유리한 경우를 비교한 것으로 올바른 것은?',
    options: ['서브쿼리가 항상 더 빠르다', 'JOIN이 대부분의 경우 옵티마이저에 의해 더 효율적으로 처리된다', '둘의 성능 차이는 없다', '서브쿼리는 인덱스를 사용할 수 없다'],
    correctAnswer: 1 },
  { id: 'bq8', bankId: 'bank2', type: 'essay', difficulty: 'high', points: 20, usageCount: 0,
    text: '인덱스가 쿼리 성능에 미치는 영향을 설명하고, 인덱스 생성 기준을 논하시오.',
    rubric: 'B-Tree 구조, 읽기/쓰기 트레이드오프, 선택도, 복합 인덱스 순서 포함.' },
  { id: 'bq9', bankId: 'bank2', type: 'short_answer', difficulty: 'high', points: 10, usageCount: 2,
    text: 'EXPLAIN 명령어를 통해 쿼리 실행 계획에서 확인할 수 있는 주요 정보는?',
    correctAnswer: ['실행 계획', '인덱스 사용 여부', 'type, key, rows, Extra'] },
  { id: 'bq10', bankId: 'bank2', type: 'multiple_choice', difficulty: 'high', points: 10, usageCount: 3,
    text: '다음 중 인덱스가 무시될 수 있는 상황으로 올바른 것은?',
    options: ['WHERE 절에 인덱스 컬럼을 직접 비교할 때', 'WHERE 절에서 인덱스 컬럼에 함수를 적용할 때', 'ORDER BY에 인덱스 컬럼을 사용할 때', 'JOIN 조건에 인덱스 컬럼을 사용할 때'],
    correctAnswer: 1 },
  { id: 'bq11', bankId: 'bank2', type: 'essay', difficulty: 'high', points: 20, usageCount: 0,
    text: '파티셔닝(Partitioning)과 샤딩(Sharding)의 개념 차이를 설명하시오.',
    rubric: '파티셔닝은 단일 DB 내, 샤딩은 여러 DB 서버 간 분산. 목적·장단점·시나리오 비교 서술.' },
  { id: 'bq12', bankId: 'bank2', type: 'short_answer', difficulty: 'high', points: 10, usageCount: 1,
    text: 'WITH 절(CTE)이 서브쿼리 대비 갖는 장점을 두 가지 이상 설명하시오.',
    correctAnswer: ['가독성 향상', '재사용 가능', '재귀 쿼리 지원'] },

  { id: 'bq13', bankId: 'bank3', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 4,
    text: 'INNER JOIN과 LEFT JOIN의 결과 차이는 무엇인가?',
    options: ['INNER JOIN은 양쪽 모두 일치하는 행만 반환한다', 'LEFT JOIN은 오른쪽 테이블의 모든 행을 반환한다', 'INNER JOIN은 중복을 자동 제거한다', '차이가 없다'],
    correctAnswer: 0 },
  { id: 'bq14', bankId: 'bank3', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 2,
    text: 'GROUP BY와 HAVING 절을 함께 사용하는 상황으로 올바른 것은?',
    options: ['개별 행을 필터링할 때', '그룹화된 결과에 조건을 적용할 때', '정렬 순서를 지정할 때', '테이블을 조인할 때'],
    correctAnswer: 1 },
  { id: 'bq15', bankId: 'bank3', type: 'short_answer', difficulty: 'medium', points: 8, usageCount: 1,
    text: 'DISTINCT 키워드의 역할과 사용 예시를 작성하시오.',
    correctAnswer: ['중복 제거', '중복된 행을 제거하고 고유한 값만 반환'] },
  { id: 'bq16', bankId: 'bank3', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 3,
    text: 'SELECT 쿼리의 논리적 실행 순서를 올바르게 나열한 것은?',
    options: ['SELECT → FROM → WHERE → GROUP BY', 'FROM → WHERE → GROUP BY → SELECT', 'FROM → SELECT → WHERE → ORDER BY', 'SELECT → WHERE → FROM → GROUP BY'],
    correctAnswer: 1 },
  { id: 'bq17', bankId: 'bank3', type: 'multiple_answers', difficulty: 'medium', points: 5, usageCount: 0,
    text: '다음 중 집계 함수(Aggregate Function)에 해당하는 것을 모두 고르시오.',
    options: ['COUNT', 'CONCAT', 'SUM', 'AVG', 'SUBSTRING', 'MAX'],
    correctAnswer: [0, 2, 3, 5], scoringMode: 'partial' },

  { id: 'bq18', bankId: 'bank4', type: 'true_false', difficulty: 'low', points: 3, usageCount: 5,
    text: 'SQL에서 SELECT * 은 테이블의 모든 열을 조회한다.', correctAnswer: true },
  { id: 'bq19', bankId: 'bank4', type: 'multiple_choice', difficulty: 'low', points: 3, usageCount: 3,
    text: 'WHERE 절에서 사용할 수 없는 연산자는?',
    options: ['=', '>', 'LIKE', 'GROUP'], correctAnswer: 3 },
  { id: 'bq20', bankId: 'bank4', type: 'multiple_choice', difficulty: 'low', points: 3, usageCount: 2,
    text: 'CREATE TABLE 문에서 열의 데이터 타입을 지정하는 이유는?',
    options: ['저장 공간을 효율적으로 사용하고 데이터 무결성을 보장하기 위해', '테이블 이름을 지정하기 위해', '인덱스를 자동 생성하기 위해', '쿼리 속도를 높이기 위해'],
    correctAnswer: 0 },
  { id: 'bq21', bankId: 'bank4', type: 'true_false', difficulty: 'low', points: 3, usageCount: 1,
    text: 'DELETE 문은 테이블 구조(스키마)를 삭제한다.', correctAnswer: false },
  { id: 'bq22', bankId: 'bank4', type: 'short_answer', difficulty: 'low', points: 5, usageCount: 2,
    text: 'INSERT INTO 문의 기본 문법을 예시와 함께 작성하시오.',
    correctAnswer: ['INSERT INTO 테이블명 VALUES', 'INSERT INTO table_name (col1, col2) VALUES (val1, val2)'] },

  { id: 'bq23', bankId: 'bank5', type: 'multiple_choice', difficulty: 'low', points: 5, usageCount: 3,
    text: '프로세스와 스레드의 가장 큰 차이점은?',
    options: ['스레드는 프로세스 내에서 메모리를 공유한다', '프로세스는 스레드보다 가볍다', '스레드는 독립적인 메모리 공간을 가진다', '프로세스는 동시에 실행될 수 없다'],
    correctAnswer: 0 },
  { id: 'bq24', bankId: 'bank5', type: 'multiple_choice', difficulty: 'medium', points: 5, usageCount: 2,
    text: 'CPU 스케줄링 알고리즘 중 선점형(Preemptive)에 해당하는 것은?',
    options: ['FCFS (First-Come, First-Served)', 'SJF (Shortest Job First, 비선점)', 'Round Robin', 'Priority (비선점)'],
    correctAnswer: 2 },
  { id: 'bq25', bankId: 'bank5', type: 'essay', difficulty: 'high', points: 20, usageCount: 0,
    text: '교착 상태(Deadlock)의 발생 조건 4가지를 서술하고 각각 예시를 들어 설명하시오.',
    rubric: '상호 배제·점유 대기·비선점·순환 대기 4가지 조건 + 예시.' },
  { id: 'bq26', bankId: 'bank5', type: 'true_false', difficulty: 'medium', points: 5, usageCount: 1,
    text: 'LRU 페이지 교체 알고리즘은 가장 오래전에 사용된 페이지를 교체한다.', correctAnswer: true },
  { id: 'bq27', bankId: 'bank5', type: 'short_answer', difficulty: 'high', points: 10, usageCount: 1,
    text: '세마포어(Semaphore)와 뮤텍스(Mutex)의 차이를 설명하시오.',
    correctAnswer: ['세마포어는 카운팅 가능', '뮤텍스는 이진(0/1)만 가능', '뮤텍스는 소유권 개념이 있다'] },

  { id: 'bq28', bankId: 'bank6', type: 'multiple_choice', difficulty: 'high', points: 10, usageCount: 2,
    text: '다익스트라(Dijkstra) 알고리즘이 올바르게 동작하지 않는 경우는?',
    options: ['가중치가 모두 동일한 경우', '음의 가중치가 존재하는 경우', '방향 그래프인 경우', '사이클이 존재하는 경우'],
    correctAnswer: 1 },
  { id: 'bq29', bankId: 'bank6', type: 'essay', difficulty: 'high', points: 20, usageCount: 0,
    text: 'NP-완전(NP-Complete) 문제의 정의를 설명하고 대표적인 예시를 드시오.',
    rubric: 'NP 정의 + 환원 가능성 + SAT·TSP 등 예시.' },
  { id: 'bq30', bankId: 'bank6', type: 'short_answer', difficulty: 'high', points: 10, usageCount: 1,
    text: '동적 프로그래밍(DP)과 분할 정복(Divide & Conquer)의 차이를 비교하시오.',
    correctAnswer: ['DP는 중복 부분문제를 메모이제이션으로 해결', '분할 정복은 독립적 부분문제로 분할'] },
  { id: 'bq31', bankId: 'bank6', type: 'multiple_choice', difficulty: 'high', points: 10, usageCount: 3,
    text: '다음 중 평균 시간복잡도가 O(n log n)인 정렬 알고리즘만 묶인 것은?',
    options: ['버블 정렬, 삽입 정렬', '퀵 정렬, 병합 정렬, 힙 정렬', '선택 정렬, 힙 정렬', '퀵 정렬, 버블 정렬'],
    correctAnswer: 1 },
  { id: 'bq32', bankId: 'bank6', type: 'essay', difficulty: 'high', points: 20, usageCount: 0,
    text: '그리디(Greedy) 알고리즘이 최적해를 보장하기 위한 조건을 설명하시오.',
    rubric: '탐욕적 선택 속성 + 최적 부분 구조 + 예시(활동 선택, 허프만).' },
]

async function createBanks() {
  for (const b of BANKS) {
    await prisma.questionBank.create({
      data: {
        id: b.id,
        courseCode: b.courseCode,
        createdById: 'prof1',
        name: b.name,
        difficulty: b.difficulty,
      },
    })
  }

  for (const bq of BANK_QUESTIONS) {
    await prisma.bankQuestion.create({
      data: {
        id: bq.id,
        bankId: bq.bankId,
        type: bq.type as any,
        difficulty: bq.difficulty,
        points: bq.points,
        usageCount: bq.usageCount,
        text: bq.text,
        options: bq.options === undefined ? undefined : (bq.options as any),
        correctAnswer: bq.correctAnswer === undefined ? undefined : (bq.correctAnswer as any),
        scoringMode: bq.scoringMode,
        rubric: bq.rubric,
      },
    })
  }
}

// ─────────────────────────────────────────────
// 7. Attempts + Answers (퀴즈 1 — 45명 중 42 제출 · 23 채점)
// ─────────────────────────────────────────────

async function createAttemptsForQuiz1() {
  const AUTO_RATE: Record<string, number> = {
    q1: 92, q2: 85, q4: 65, q6: 78, q9: 70, q10: 75,
  }

  for (let i = 0; i < 45; i++) {
    const userId = `s${i + 1}`
    const isSubmitted = i < 42
    const isGraded = i < 23

    const autoScores: Record<string, number> = {}
    const manualScoresEst: Record<string, number> = {}

    if (!isSubmitted) {
      // 미제출 — Attempt 생성은 하되 startTime 만 있거나 아예 없음
      const startedButIncomplete = (i - 42) % 2 === 0
      await prisma.attempt.create({
        data: {
          id: `att_1_${userId}`,
          quizId: '1',
          userId,
          attemptNumber: 1,
          startTime: startedButIncomplete ? new Date('2026-04-03T09:05:00+09:00') : null,
          endTime: null,
          submitted: false,
          submittedAt: null,
          isLate: false,
          autoScore: null,
          manualScore: null,
          totalScore: null,
          graded: false,
        },
      })
      continue
    }

    // 제출된 학생 — 자동/수동 점수 계산
    for (const q of Q1_QUESTIONS) {
      const isAuto = q.autoGrade === true
      if (isAuto) {
        const rate = AUTO_RATE[q.id] ?? 70
        const isCorrect = seedHash(i, q.order) < rate
        autoScores[q.id] = isCorrect ? q.points : 0
      } else if (isGraded) {
        manualScoresEst[q.id] = randomManualScore(q.points, i, q.order)
      }
    }

    const autoTotal = Object.values(autoScores).reduce((a, b) => a + b, 0)
    const manualTotal = isGraded ? Object.values(manualScoresEst).reduce((a, b) => a + b, 0) : 0
    const totalScore = isGraded ? autoTotal + manualTotal : null

    const submittedMin = 20 + (i % 40)
    const submittedAt = new Date(`2026-04-03T10:${String(submittedMin).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}+09:00`)

    await prisma.attempt.create({
      data: {
        id: `att_1_${userId}`,
        quizId: '1',
        userId,
        attemptNumber: 1,
        startTime: new Date('2026-04-03T09:00:00+09:00'),
        endTime: submittedAt,
        submitted: true,
        submittedAt,
        isLate: false,
        autoScore: autoTotal,
        manualScore: isGraded ? manualTotal : null,
        totalScore,
        graded: isGraded,
      },
    })

    // Answer 11개
    for (const q of Q1_QUESTIONS) {
      const pool = ANSWER_POOL[q.id] ?? ['답안']
      const response = pool[(i + q.order) % pool.length]
      const auto = autoScores[q.id] ?? null
      const manual = isGraded ? (manualScoresEst[q.id] ?? null) : null

      await prisma.answer.create({
        data: {
          id: `ans_1_${userId}_${q.id}`,
          attemptId: `att_1_${userId}`,
          questionId: q.id,
          response: response as any,
          autoScore: auto,
          manualScore: manual,
          gradedById: isGraded ? 'prof1' : null,
          gradedAt: isGraded ? new Date('2026-04-05T14:00:00+09:00') : null,
        },
      })
    }
  }
}

// ─────────────────────────────────────────────
// 8. Attempts + Answers (퀴즈 8 — 45명 중 44 제출 · 44 채점)
// ─────────────────────────────────────────────

async function createAttemptsForQuiz8() {
  const AUTO_RATE: Record<string, number> = {
    q8_1: 90, q8_2: 80, q8_3: 85, q8_4: 65, q8_5: 60, q8_6: 55, q8_7: 45, q8_8: 38,
  }

  for (let i = 0; i < 45; i++) {
    const userId = `s${i + 1}`
    const isSubmitted = i < 44
    const isGraded = i < 44

    if (!isSubmitted) {
      await prisma.attempt.create({
        data: {
          id: `att_8_${userId}`,
          quizId: '8',
          userId,
          attemptNumber: 1,
          startTime: null,
          endTime: null,
          submitted: false,
          submittedAt: null,
          isLate: false,
          autoScore: null,
          manualScore: null,
          totalScore: null,
          graded: false,
        },
      })
      continue
    }

    const autoScores: Record<string, number> = {}
    const manualScoresEst: Record<string, number> = {}

    for (const q of Q8_QUESTIONS) {
      if (q.autoGrade === true) {
        const rate = AUTO_RATE[q.id] ?? 70
        const isCorrect = seedHash(i, q.order) < rate
        autoScores[q.id] = isCorrect ? q.points : 0
      } else if (isGraded) {
        manualScoresEst[q.id] = randomManualScore(q.points, i, q.order)
      }
    }

    const autoTotal = Object.values(autoScores).reduce((a, b) => a + b, 0)
    const manualTotal = isGraded ? Object.values(manualScoresEst).reduce((a, b) => a + b, 0) : 0
    const totalScore = isGraded ? autoTotal + manualTotal : null

    const hour = 9 + Math.floor(((i * 7) % 480) / 60)
    const min = (i * 7) % 60
    const timeStr = `${String(Math.min(hour, 17)).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    const submittedAt = new Date(`2026-03-31T${timeStr}:${String((i * 17) % 60).padStart(2, '0')}+09:00`)

    await prisma.attempt.create({
      data: {
        id: `att_8_${userId}`,
        quizId: '8',
        userId,
        attemptNumber: 1,
        startTime: new Date('2026-03-31T09:00:00+09:00'),
        endTime: submittedAt,
        submitted: true,
        submittedAt,
        isLate: false,
        autoScore: autoTotal,
        manualScore: isGraded ? manualTotal : null,
        totalScore,
        graded: isGraded,
      },
    })

    for (const q of Q8_QUESTIONS) {
      const pool = ANSWER_POOL[q.id] ?? ['답안']
      const response = pool[(i + q.order) % pool.length]
      const auto = autoScores[q.id] ?? null
      const manual = isGraded ? (manualScoresEst[q.id] ?? null) : null

      await prisma.answer.create({
        data: {
          id: `ans_8_${userId}_${q.id}`,
          attemptId: `att_8_${userId}`,
          questionId: q.id,
          response: response as any,
          autoScore: auto,
          manualScore: manual,
          gradedById: isGraded ? 'prof1' : null,
          gradedAt: isGraded ? new Date('2026-04-05T14:00:00+09:00') : null,
        },
      })
    }
  }
}

// ─────────────────────────────────────────────
// main
// ─────────────────────────────────────────────

async function main() {
  console.log('▶ 시드 시작')

  console.log('1/7) 초기화')
  await resetDb()

  console.log('2/7) User (교수자 1 + 학생 45)')
  await createUsers()

  console.log('3/7) Course + Enrollment (4 × 46 = 184)')
  await createCoursesAndEnrollments()

  console.log('4/7) Quiz (14)')
  await createQuizzes()

  console.log('5/7) Question (퀴즈 1 · 8 — 21개)')
  await createQuestions()

  console.log('6/7) QuestionBank + BankQuestion (6 + 32)')
  await createBanks()

  console.log('7/7) Attempt + Answer (퀴즈 1: 45건 / 퀴즈 8: 45건)')
  await createAttemptsForQuiz1()
  await createAttemptsForQuiz8()

  console.log('✔ 시드 완료')
  console.log('─────────────────────────────')
  console.log('로그인 정보')
  console.log('  교수자: prof@xn.test / xnquiz1234!')
  console.log('  학생:   s01@xn.test ~ s45@xn.test / xnquiz1234!')
  console.log('─────────────────────────────')
}

main()
  .catch((e) => {
    console.error('시드 에러:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
