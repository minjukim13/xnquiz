// QUIZ_TYPES: Canvas LMS 전체 퀴즈 유형 (Classic + New Quizzes)
export const QUIZ_TYPES = {
  multiple_choice:        { label: '객관식',          autoGrade: true },
  true_false:             { label: '참/거짓',          autoGrade: true },
  multiple_answers:       { label: '복수 선택',        autoGrade: true },
  short_answer:           { label: '단답형',           autoGrade: 'partial' },
  essay:                  { label: '서술형',           autoGrade: false },
  numerical:              { label: '수치형',           autoGrade: true },
  formula:                { label: '수식형',           autoGrade: true },
  matching:               { label: '연결형',           autoGrade: true },
  fill_in_multiple_blanks:{ label: '다중 빈칸 채우기', autoGrade: true },
  multiple_dropdowns:     { label: '드롭다운 선택',    autoGrade: true },
  file_upload:            { label: '파일 첨부',        autoGrade: false },
  text:                   { label: '텍스트',           autoGrade: null },
}

export const mockQuizzes = [
  {
    id: '1',
    title: '중간고사 - 데이터베이스 설계 및 SQL',
    course: 'CS301 데이터베이스',
    status: 'grading',
    startDate: '2026-03-20 09:00',
    dueDate: '2026-03-20 18:00',
    week: 8,
    session: 1,
    totalStudents: 87,
    submitted: 82,
    graded: 45,
    pendingGrade: 37,
    questions: 10,
    totalPoints: 100,
    timeLimit: 120,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
  },
  {
    id: '2',
    title: '1차 형성평가 - SQL 기초',
    course: 'CS301 데이터베이스',
    status: 'closed',
    startDate: '2026-03-15 09:00',
    dueDate: '2026-03-15 23:59',
    week: 5,
    session: 2,
    totalStudents: 120,
    submitted: 118,
    graded: 118,
    pendingGrade: 0,
    questions: 20,
    totalPoints: 50,
    avgScore: 38.2,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
  },
  {
    id: '3',
    title: '주차별 퀴즈 4 - 인덱스와 쿼리 최적화',
    course: 'CS301 데이터베이스',
    status: 'open',
    startDate: '2026-03-25 09:00',
    dueDate: '2026-03-25 23:59',
    week: 4,
    session: 1,
    totalStudents: 65,
    submitted: 12,
    graded: 12,
    pendingGrade: 0,
    questions: 10,
    totalPoints: 20,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 3,
  },
  {
    id: '4',
    title: '기말고사 - 데이터베이스 심화',
    course: 'CS301 데이터베이스',
    status: 'draft',
    startDate: '2026-06-15 09:00',
    dueDate: '2026-06-15 18:00',
    week: 16,
    session: 1,
    totalStudents: 55,
    submitted: 0,
    graded: 0,
    pendingGrade: 0,
    questions: 25,
    totalPoints: 100,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
  },
]

// 배점 합계: 5+5+10+10+20+5+10+15+10+10 = 100점
export const mockQuestions = [
  {
    id: 'q1', order: 1, type: 'multiple_choice',
    text: 'SQL에서 데이터를 검색할 때 사용하는 기본 명령어는?',
    points: 5, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 4.0,
    correctAnswer: 'SELECT', choices: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  },
  {
    id: 'q2', order: 2, type: 'multiple_choice',
    text: '정규화의 목적으로 가장 적절한 것은?',
    points: 5, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 4.0,
    correctAnswer: '데이터 중복 최소화',
    choices: ['데이터 중복 최소화', '처리 속도 증가', '저장 공간 증가', '데이터 암호화'],
  },
  {
    id: 'q3', order: 3, type: 'short_answer',
    text: '관계형 데이터베이스에서 두 테이블을 연결하는 데 사용되는 키의 이름을 쓰시오.',
    points: 10, autoGrade: false, gradedCount: 45, totalCount: 82, avgScore: 8.0,
    correctAnswer: '외래키(Foreign Key)',
  },
  {
    id: 'q4', order: 4, type: 'multiple_answers',
    text: '다음 중 DDL(Data Definition Language)에 해당하는 명령어를 모두 고르시오.',
    points: 10, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 7.1,
    correctAnswer: 'CREATE, ALTER, DROP',
    choices: ['CREATE', 'ALTER', 'DROP', 'SELECT', 'INSERT'],
  },
  {
    id: 'q5', order: 5, type: 'essay',
    text: '트랜잭션의 ACID 속성에 대해 각각 설명하고, 실제 데이터베이스 시스템에서 이를 어떻게 보장하는지 구체적인 예시를 들어 서술하시오.',
    points: 20, autoGrade: false, gradedCount: 45, totalCount: 82, avgScore: 15.8,
    correctAnswer: null,
  },
  {
    id: 'q6', order: 6, type: 'true_false',
    text: 'PRIMARY KEY는 NULL 값을 허용한다.',
    points: 5, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 4.0,
    correctAnswer: '거짓',
  },
  {
    id: 'q7', order: 7, type: 'short_answer',
    text: 'SELECT문에서 중복 행을 제거하기 위해 사용하는 키워드는?',
    points: 10, autoGrade: false, gradedCount: 45, totalCount: 82, avgScore: 8.7,
    correctAnswer: 'DISTINCT',
  },
  {
    id: 'q8', order: 8, type: 'essay',
    text: 'B-Tree 인덱스와 Hash 인덱스의 차이점을 비교하고, 각각 어떤 상황에서 사용하는 것이 적합한지 설명하시오.',
    points: 15, autoGrade: false, gradedCount: 45, totalCount: 82, avgScore: 12.1,
    correctAnswer: null,
  },
  {
    id: 'q9', order: 9, type: 'numerical',
    text: '아래 테이블에 저장된 레코드 수를 구하는 SQL 결과값은? (단, NULL 포함)',
    points: 10, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 8.0,
    correctAnswer: '15',
  },
  {
    id: 'q10', order: 10, type: 'matching',
    text: '다음 SQL 명령어와 그 기능을 올바르게 연결하시오.',
    points: 10, autoGrade: true, gradedCount: 82, totalCount: 82, avgScore: 8.8,
    correctAnswer: null,
  },
]

// 학생 중심 채점 모드용 문항별 응답 풀
const ANSWER_POOL = {
  q1: ['SELECT', 'select', 'SELECT *', 'SELECT문', 'SELECT 명령어'],
  q2: ['데이터 중복 최소화', '이상(Anomaly) 제거', '데이터 정합성 유지', '저장 공간 효율화'],
  q3: ['외래키', 'Foreign Key', '참조키', '외부키', 'FK', '외래 키'],
  q4: ['CREATE, ALTER, DROP', 'CREATE, DROP', 'CREATE, ALTER, DROP, TRUNCATE', 'CREATE, ALTER'],
  q5: [
    'ACID는 원자성(Atomicity), 일관성(Consistency), 격리성(Isolation), 지속성(Durability)의 약자입니다. 원자성은 트랜잭션의 모든 연산이 완전히 수행되거나 전혀 수행되지 않아야 함을 의미합니다.',
    'ACID 속성 중 원자성은 트랜잭션이 완전히 처리되거나 취소되어야 한다는 것입니다. 예를 들어 계좌 이체 시 출금과 입금이 동시에 이루어져야 합니다.',
    '트랜잭션의 ACID 속성은 데이터베이스 무결성을 보장합니다. Atomicity(원자성), Consistency(일관성), Isolation(격리성), Durability(지속성)으로 구성됩니다.',
  ],
  q6: ['거짓', '참', 'FALSE', 'false'],
  q7: ['DISTINCT', 'distinct', 'DISTINCT 키워드', 'GROUP BY'],
  q8: [
    'B-Tree 인덱스는 범위 검색에 유리하고 Hash 인덱스는 등치 검색에 최적화되어 있습니다. B-Tree는 정렬된 순서를 유지하므로 범위 조건(BETWEEN, >, <)에 효과적입니다.',
    'Hash 인덱스는 O(1) 시간복잡도로 등치 검색이 빠르나 범위 검색은 불가합니다. B-Tree는 O(log n)이지만 범위 검색을 지원합니다.',
  ],
  q9: ['15', '15개', '15 rows'],
  q10: ['SELECT-데이터 조회, INSERT-데이터 삽입, UPDATE-데이터 수정', '모두 올바르게 연결', '일부 연결'],
}

// 문항별 자동채점 정답 판별
const AUTO_CORRECT_ANSWERS = {
  q1: ['SELECT', 'select'],
  q2: ['데이터 중복 최소화'],
  q4: ['CREATE, ALTER, DROP'],
  q6: ['거짓', 'false', 'FALSE'],
  q9: ['15', '15개'],
}

// 퀴즈3 문항 (주차별 퀴즈 4 - 인덱스와 쿼리 최적화, 총 20점)
export const mockQuiz3Questions = [
  {
    id: 'q3_1', order: 1, type: 'multiple_choice',
    text: '인덱스(Index)를 생성했을 때 데이터 검색 속도가 빨라지는 이유로 가장 적절한 것은?',
    points: 2, autoGrade: true,
    correctAnswer: 'B-Tree 구조로 데이터를 정렬하여 탐색 범위를 줄이기 때문에',
    choices: ['B-Tree 구조로 데이터를 정렬하여 탐색 범위를 줄이기 때문에', '데이터를 메모리에 캐시하기 때문에', '중복 데이터를 자동으로 제거하기 때문에', '테이블 전체 크기를 줄이기 때문에'],
  },
  {
    id: 'q3_2', order: 2, type: 'true_false',
    text: '인덱스를 많이 생성할수록 데이터베이스의 전체 성능이 향상된다.',
    points: 2, autoGrade: true,
    correctAnswer: '거짓',
    choices: ['참', '거짓'],
  },
  {
    id: 'q3_3', order: 3, type: 'multiple_choice',
    text: '다음 중 풀 테이블 스캔(Full Table Scan)이 발생할 가능성이 높은 경우는?',
    points: 2, autoGrade: true,
    correctAnswer: '인덱스가 없는 컬럼으로 WHERE 조건 검색',
    choices: ['기본키(PK)로 단건 조회', '인덱스가 없는 컬럼으로 WHERE 조건 검색', 'LIMIT 1 조건 사용', '인덱스 컬럼 범위 검색'],
  },
  {
    id: 'q3_4', order: 4, type: 'multiple_choice',
    text: 'EXPLAIN 명령어를 사용하는 주된 목적은?',
    points: 2, autoGrade: true,
    correctAnswer: '쿼리 실행 계획을 확인하여 성능 병목을 파악하기 위해',
    choices: ['쿼리 실행 계획을 확인하여 성능 병목을 파악하기 위해', '쿼리 결과를 외부 파일로 출력하기 위해', '데이터베이스 접근 권한을 확인하기 위해', '쿼리 오류를 자동으로 수정하기 위해'],
  },
  {
    id: 'q3_5', order: 5, type: 'multiple_choice',
    text: '복합 인덱스 (A, B, C)로 생성했을 때 인덱스가 효과적으로 활용되지 않는 WHERE 조건은?',
    points: 2, autoGrade: true,
    correctAnswer: 'WHERE B = ? AND C = ?',
    choices: ['WHERE A = ?', 'WHERE A = ? AND B = ?', 'WHERE A = ? AND B = ? AND C = ?', 'WHERE B = ? AND C = ?'],
  },
  {
    id: 'q3_6', order: 6, type: 'true_false',
    text: 'SELECT * 보다 필요한 컬럼만 명시하여 조회하면 쿼리 성능이 향상될 수 있다.',
    points: 2, autoGrade: true,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q3_7', order: 7, type: 'multiple_choice',
    text: 'N+1 문제(N+1 Problem)란 무엇인가?',
    points: 2, autoGrade: true,
    correctAnswer: '1번 쿼리로 N개 데이터 조회 후, 각 데이터에 대해 N번 추가 쿼리가 발생하는 현상',
    choices: ['1번 쿼리로 N개 데이터 조회 후, 각 데이터에 대해 N번 추가 쿼리가 발생하는 현상', '하나의 테이블에 N+1개 이상의 인덱스가 생성된 상태', 'N개 테이블을 JOIN할 때 쿼리 수가 N+1이 되는 현상', '동시에 N+1명이 접속하여 데드락이 발생하는 현상'],
  },
  {
    id: 'q3_8', order: 8, type: 'multiple_choice',
    text: 'WHERE 절에서 인덱스 컬럼에 함수를 적용했을 때 발생하는 문제는?',
    points: 2, autoGrade: true,
    correctAnswer: '인덱스를 활용하지 못하고 풀 스캔이 발생한다',
    choices: ['인덱스를 활용하지 못하고 풀 스캔이 발생한다', '쿼리 구문 오류가 발생한다', '함수 결과가 잘못 계산된다', '인덱스가 자동으로 재생성된다'],
  },
  {
    id: 'q3_9', order: 9, type: 'short_answer',
    text: '쿼리 실행 경로와 비용을 분석하여 보여주는 SQL 명령어를 쓰시오.',
    points: 2, autoGrade: true,
    correctAnswer: 'EXPLAIN',
  },
  {
    id: 'q3_10', order: 10, type: 'multiple_choice',
    text: '다음 중 인덱스 사용이 불리한 경우로 옳은 것은?',
    points: 2, autoGrade: true,
    correctAnswer: 'INSERT/UPDATE/DELETE가 매우 빈번한 테이블',
    choices: ['고유값이 많은 컬럼 검색', 'INSERT/UPDATE/DELETE가 매우 빈번한 테이블', '기본키(PK)로 단건 조회', 'WHERE 조건 포함 범위 검색'],
  },
]

// quiz3 자동채점 정답 맵
const AUTO_CORRECT_Q3 = {
  q3_1: ['B-Tree 구조로 데이터를 정렬하여 탐색 범위를 줄이기 때문에'],
  q3_2: ['거짓', 'false'],
  q3_3: ['인덱스가 없는 컬럼으로 WHERE 조건 검색'],
  q3_4: ['쿼리 실행 계획을 확인하여 성능 병목을 파악하기 위해'],
  q3_5: ['WHERE B = ? AND C = ?'],
  q3_6: ['참', 'true'],
  q3_7: ['1번 쿼리로 N개 데이터 조회 후, 각 데이터에 대해 N번 추가 쿼리가 발생하는 현상'],
  q3_8: ['인덱스를 활용하지 못하고 풀 스캔이 발생한다'],
  q3_9: ['EXPLAIN', 'explain'],
  q3_10: ['INSERT/UPDATE/DELETE가 매우 빈번한 테이블'],
}

// 퀴즈 ID별 문항 반환 — GradingDashboard에서 사용
export function getQuizQuestions(quizId) {
  if (quizId === '1') return mockQuestions
  if (quizId === '3') return mockQuiz3Questions
  return []
}

// 학생 응시 결과 저장/불러오기
// 복수응시 정책에 따라 학생별 최종 유효 응시 반환
export function getStudentAttempts(quizId) {
  try {
    const raw = localStorage.getItem('xnq_student_attempts')
    const all = raw ? JSON.parse(raw) : {}
    const attempts = all[quizId] || []

    // 학생별로 그룹화
    const byStudent = {}
    attempts.forEach(a => {
      if (!byStudent[a.studentId]) byStudent[a.studentId] = []
      byStudent[a.studentId].push(a)
    })

    // 각 학생의 최종 유효 응시 1개 반환 (점수 정책 적용)
    return Object.values(byStudent).map(list => {
      if (list.length <= 1) return list[0]
      const policy = list[list.length - 1].scorePolicy ?? '최고 점수 유지'
      if (policy === '최고 점수 유지') {
        return list.reduce((best, curr) =>
          (curr.totalAutoScore ?? 0) > (best.totalAutoScore ?? 0) ? curr : best
        )
      }
      if (policy === '평균 점수') {
        const latest = { ...list[list.length - 1] }
        latest.totalAutoScore = Math.round(
          list.reduce((s, a) => s + (a.totalAutoScore ?? 0), 0) / list.length
        )
        return latest
      }
      // '최신 점수 유지'
      return list[list.length - 1]
    }).filter(Boolean)
  } catch { return [] }
}

export function saveStudentAttempt(quizId, attempt) {
  try {
    const raw = localStorage.getItem('xnq_student_attempts')
    const all = raw ? JSON.parse(raw) : {}
    if (!all[quizId]) all[quizId] = []
    // 모든 응시 기록 보존 (정책은 읽기 시점에 적용)
    all[quizId].push(attempt)
    localStorage.setItem('xnq_student_attempts', JSON.stringify(all))
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.error('[xnquiz] localStorage 용량 초과 - 응시 기록 저장 실패:', err)
      throw new Error('응시 데이터를 저장할 수 없습니다. 브라우저 저장 공간이 부족합니다.')
    }
  }
}

export function gradeQuiz3Answer(questionId, answer) {
  const correct = AUTO_CORRECT_Q3[questionId]
  if (!correct || !answer) return 0
  return correct.some(c => answer.trim().toLowerCase() === c.toLowerCase().trim()) ? null : 0
}

export function autoGradeAnswer(question, answer) {
  if (!answer && answer !== 0) return 0
  const correctMap = question.id.startsWith('q3_') ? AUTO_CORRECT_Q3 : AUTO_CORRECT_ANSWERS
  const correct = correctMap?.[question.id]
  if (!correct) return null // 수동채점 필요
  const isCorrect = correct.some(c => String(answer).trim().toLowerCase() === c.toLowerCase().trim())
  return isCorrect ? question.points : 0
}

export function getStudentAnswer(studentIdx, questionId) {
  const pool = ANSWER_POOL[questionId] || ['답안 없음']
  return pool[(studentIdx * 3 + parseInt(questionId.replace('q', ''))) % pool.length]
}

export function isAnswerCorrect(answer, questionId) {
  const correct = AUTO_CORRECT_ANSWERS[questionId]
  if (!correct) return null
  return correct.some(c => answer.toLowerCase().includes(c.toLowerCase()))
}

// ── 문제은행 공유 데이터 (QuestionBankList, QuestionBank, QuizCreate, QuizEdit 공통 사용) ──

const BANK_QUESTION_TEXTS = [
  'SQL SELECT 문의 기본 구조를 설명하시오.',
  '정규화의 목적과 단계를 서술하시오.',
  'JOIN의 종류와 각 특징을 설명하시오.',
  'PRIMARY KEY와 FOREIGN KEY의 차이점은?',
  'WHERE 절과 HAVING 절의 차이는?',
  '인덱스의 역할과 장단점을 설명하시오.',
  'ACID 속성이란 무엇인가?',
  '뷰(View)의 개념과 사용 목적은?',
  '서브쿼리와 JOIN의 성능 차이는?',
  'GROUP BY 절의 사용 방법을 예시와 함께 설명하시오.',
]

export const MOCK_BANKS = [
  { id: 'bank1', name: 'DB 기초', course: 'CS301 데이터베이스', updatedAt: '2026-03-20', usedInQuizIds: ['1', '2'] },
  { id: 'bank2', name: 'SQL 심화', course: 'CS301 데이터베이스', updatedAt: '2026-03-24', usedInQuizIds: ['1'] },
  { id: 'bank3', name: '프로세스 관리', course: 'CS201 운영체제', updatedAt: '2026-03-15', usedInQuizIds: [] },
  { id: 'bank4', name: '메모리 관리', course: 'CS201 운영체제', updatedAt: '2026-03-10', usedInQuizIds: [] },
]

const BANK_GROUP_MAP = {
  bank1: ['1단원', '2단원', '3단원'],
  bank2: ['A그룹', 'B그룹', 'C그룹'],
  bank3: ['설계 기초', '설계 심화'],
  bank4: ['기초', '심화'],
}
const DIFFICULTIES = ['high', 'medium', 'low']

export const MOCK_BANK_QUESTIONS = Array.from({ length: 60 }, (_, i) => {
  const bankId = ['bank1', 'bank2', 'bank3', 'bank4'][i % 4]
  const groups = BANK_GROUP_MAP[bankId]
  return {
    id: `bank_q${i + 1}`,
    text: BANK_QUESTION_TEXTS[i % 10] + (i >= 10 ? ` (${Math.floor(i / 10) + 1})` : ''),
    type: Object.keys(QUIZ_TYPES)[i % Object.keys(QUIZ_TYPES).length],
    points: [3, 5, 8, 10, 15][i % 5],
    bankId,
    usageCount: [0, 2, 5, 1, 3, 8, 0, 4][i % 8],
    difficulty: DIFFICULTIES[i % 3],
    groupTag: groups[i % groups.length],
  }
})

// 데모용 가상 데이터 — 실제 개인정보 아님
// Q3 단답형(10점) 개별 점수
const FIXED_SCORES = [8, 9, 7, 10, 6, 8, 9, 7, 8, 10, 6, 9, 7, 8, 6, 9, 10, 7, 8, 9, 6, 7, 8, 9, 10, 7, 8, 6, 9, 8, 7, 10, 8, 9, 7, 6, 8, 9, 7, 8, 10, 6, 9, 8, 7]
// Q5 서술형(20점) 개별 점수
const Q5_SCORES = [14, 16, 18, 15, 17, 13, 16, 15, 18, 14, 17, 16]
// Q7 단답형(10점) 개별 점수
const Q7_SCORES = [8, 10, 10, 6, 10, 8, 10, 10, 8, 6, 10, 8]
// Q8 서술형(15점) 개별 점수
const Q8_SCORES = [12, 13, 11, 14, 10, 12, 13, 11, 12, 14, 10, 13]
// 총점: auto(i%5) + FIXED_SCORES[i%45] + Q5_SCORES[i%12] + Q7_SCORES[i%12] + Q8_SCORES[i%12]
const TOTAL_SCORES = [87,91,81,81,63,86,91,78,82,64,88,89,76,83,65,89,90,75,83,65,89,84,80,78,69,88,89,75,82,61,91,89,81,79,64,84,90,80,81,62,92,82,83,80,65]
const DEMO_NAMES = ['학생 A', '학생 B', '학생 C', '학생 D', '학생 E', '학생 F', '학생 G', '학생 H', '학생 I', '학생 J', '학생 K', '학생 L']

export const mockStudents = Array.from({ length: 82 }, (_, i) => ({
  id: `s${i + 1}`,
  studentId: `2022${String(i + 1001).slice(1)}`,
  name: DEMO_NAMES[i % 12] + (i > 11 ? `-${Math.floor(i / 12) + 1}` : ''),
  department: ['컴퓨터공학과', '소프트웨어학과', '정보통신공학과', '데이터사이언스학과'][i % 4],
  score: i < 45 ? TOTAL_SCORES[i % TOTAL_SCORES.length] : null,
  startTime: '2026-03-20 09:00',
  endTime: '2026-03-20 10:' + String(20 + (i % 40)).padStart(2, '0'),
  submitted: true,
  // q3 단답형 응답 (이전 호환성)
  response: i < 45
    ? ['외래키', 'Foreign Key', '참조키', '외부키', 'FK'][i % 5]
    : ['외래키입니다', '두 테이블을 연결하는 키', 'Foreign Key라고도 합니다', '참조 무결성을 보장하는 키'][i % 4],
  // 자동채점 문항별 점수 (q1:5점, q2:5점, q4:10점, q6:5점, q9:10점, q10:10점)
  autoScores: {
    q1:  [5,  5,  5,  5,  0 ][i % 5],
    q2:  [5,  5,  0,  5,  5 ][i % 5],
    q4:  [10, 10, 5,  10, 0 ][i % 5],
    q6:  [5,  5,  5,  0,  5 ][i % 5],
    q9:  [10, 10, 10, 10, 0 ][i % 5],
    q10: [10, 8,  10, 6,  10][i % 5],
  },
  // 수동채점 문항 점수 (채점된 45명 전원 완료 — q3:10점, q5:20점, q7:10점, q8:15점)
  manualScores: i < 45 ? {
    q3: FIXED_SCORES[i % 45],
    q5: Q5_SCORES[i % 12],
    q7: Q7_SCORES[i % 12],
    q8: Q8_SCORES[i % 12],
  } : null,
}))
