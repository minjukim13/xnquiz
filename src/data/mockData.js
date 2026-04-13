// ── 전역 설정 읽기 (localStorage) ──
function _getGlobalSettings() {
  try {
    const raw = localStorage.getItem('xnq_global_settings')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

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
    // grading 상태 / 성적 비공개 (채점 중 공개 안 함)
    id: '1',
    title: '중간고사 - 데이터베이스 설계 및 SQL',
    description: 'ERD 설계, SQL 쿼리 작성, 정규화 전 범위를 다룹니다. 오픈북 불가, 제한 시간 내 제출하세요.',
    course: 'CS301 데이터베이스',
    status: 'grading',
    visible: true,
    startDate: '2026-04-03 09:00',
    dueDate: '2026-04-03 18:00',
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
    scoreRevealEnabled: false,
    scoreRevealScope: null,
    scoreRevealTiming: null,
  },
  {
    // closed / 오답여부만 · 즉시 공개
    id: '2',
    title: '1차 형성평가 - SQL 기초',
    description: 'SELECT, WHERE, JOIN 등 SQL 기초 구문을 다룹니다. 강의 3~4주차 내용 기반으로 출제됩니다.',
    course: 'CS301 데이터베이스',
    status: 'closed',
    visible: true,
    startDate: '2026-03-24 09:00',
    dueDate: '2026-03-24 23:59',
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
    scoreRevealEnabled: true,
    scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'immediately',
  },
  {
    // open / 정답까지 · 마감 후 공개 (재응시 3회)
    id: '3',
    title: '주차별 퀴즈 4 - 인덱스와 쿼리 최적화',
    course: 'CS301 데이터베이스',
    status: 'open',
    visible: true,
    startDate: '2026-04-06 09:00',
    dueDate: '2026-04-09 23:59',
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
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'after_due',
  },
  {
    // draft / 성적 비공개
    id: '4',
    title: '기말고사 - 데이터베이스 심화',
    course: 'CS301 데이터베이스',
    status: 'draft',
    visible: false,
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
    timeLimit: 120,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: false,
    scoreRevealScope: null,
    scoreRevealTiming: null,
  },
  {
    // closed / 정답까지 · 즉시 공개 (재응시 2회)
    id: '5',
    title: '주차별 퀴즈 5-1 - ER 다이어그램',
    course: 'CS301 데이터베이스',
    status: 'closed',
    visible: true,
    startDate: '2026-03-17 09:00',
    dueDate: '2026-03-17 23:59',
    week: 5,
    session: 1,
    totalStudents: 120,
    submitted: 115,
    graded: 115,
    pendingGrade: 0,
    questions: 10,
    totalPoints: 20,
    avgScore: 15.4,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 2,
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'immediately',
  },
  {
    // closed / 오답여부만 · 마감 후 공개
    id: '6',
    title: '5주차 형성평가 - 관계 대수',
    course: 'CS301 데이터베이스',
    status: 'closed',
    visible: true,
    startDate: '2026-03-17 10:00',
    dueDate: '2026-03-17 23:59',
    week: 5,
    session: 1,
    totalStudents: 120,
    submitted: 109,
    graded: 109,
    pendingGrade: 0,
    questions: 5,
    totalPoints: 10,
    avgScore: 7.8,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: true,
    scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'after_due',
  },
  {
    // grading 상태 / 서술형 수동채점 / 마감 후 공개
    id: '7',
    title: '5주차 서술형 과제 - 정규화 단계 분석',
    course: 'CS301 데이터베이스',
    status: 'grading',
    visible: true,
    startDate: '2026-03-17 09:00',
    dueDate: '2026-03-21 23:59',
    week: 5,
    session: 1,
    totalStudents: 120,
    submitted: 117,
    graded: 60,
    pendingGrade: 57,
    questions: 3,
    totalPoints: 30,
    timeLimit: null,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'after_due',
  },
  {
    // closed / 정답까지 · 기간 설정 공개
    id: '8',
    title: '2차 형성평가 - 데이터베이스 설계 & 정규화',
    description: '관계형 데이터베이스 설계 원칙과 1NF~3NF 정규화 과정을 평가합니다. 강의 6~7주차 내용 기반으로 출제됩니다.',
    course: 'CS301 데이터베이스',
    status: 'closed',
    visible: true,
    startDate: '2026-03-31 09:00',
    dueDate: '2026-03-31 23:59',
    week: 7,
    session: 2,
    totalStudents: 120,
    submitted: 116,
    graded: 116,
    pendingGrade: 0,
    questions: 10,
    totalPoints: 50,
    avgScore: 34.9,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'period',
    scoreRevealStart: '2026-04-01 00:00',
    scoreRevealEnd:   '2026-04-30 23:59',
  },
  // CS201 운영체제
  {
    id: 'cs201_1',
    title: '중간고사 - 프로세스 및 스레드',
    description: '프로세스 생명주기, 스레드 모델, 동기화 문제를 다룹니다.',
    course: 'CS201 운영체제',
    status: 'closed',
    visible: true,
    startDate: '2026-03-18 09:00',
    dueDate: '2026-03-18 11:00',
    week: 8,
    session: 1,
    totalStudents: 45,
    submitted: 44,
    graded: 44,
    pendingGrade: 0,
    questions: 10,
    totalPoints: 100,
    avgScore: 72.3,
    timeLimit: 120,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: false,
    scoreRevealScope: null,
    scoreRevealTiming: null,
  },
  {
    id: 'cs201_2',
    title: '1차 형성평가 - 프로세스 스케줄링',
    description: 'CPU 스케줄링 알고리즘(FCFS, SJF, Round Robin)을 평가합니다.',
    course: 'CS201 운영체제',
    status: 'closed',
    visible: true,
    startDate: '2026-03-10 09:00',
    dueDate: '2026-03-10 23:59',
    week: 4,
    session: 1,
    totalStudents: 45,
    submitted: 43,
    graded: 43,
    pendingGrade: 0,
    questions: 7,
    totalPoints: 30,
    avgScore: 22.1,
    timeLimit: 30,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 2,
    scoreRevealEnabled: true,
    scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'immediately',
  },
  {
    id: 'cs201_3',
    title: '주차별 퀴즈 - 메모리 관리',
    description: '페이징, 세그멘테이션, 가상 메모리 기초 개념을 다룹니다.',
    course: 'CS201 운영체제',
    status: 'draft',
    visible: false,
    startDate: '2026-04-14 09:00',
    dueDate: '2026-04-14 23:59',
    week: 10,
    session: 1,
    totalStudents: 45,
    submitted: 0,
    graded: 0,
    pendingGrade: 0,
    questions: 8,
    totalPoints: 20,
    timeLimit: 20,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 3,
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'after_due',
  },
  // CS401 알고리즘
  {
    id: 'cs401_1',
    title: '중간고사 - 정렬 알고리즘',
    description: '버블 정렬부터 퀵 정렬까지 시간복잡도 및 동작 원리를 평가합니다.',
    course: 'CS401 알고리즘',
    status: 'closed',
    visible: true,
    startDate: '2026-03-20 09:00',
    dueDate: '2026-03-20 11:00',
    week: 8,
    session: 1,
    totalStudents: 38,
    submitted: 37,
    graded: 37,
    pendingGrade: 0,
    questions: 10,
    totalPoints: 60,
    avgScore: 42.5,
    timeLimit: 120,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
    scoreRevealEnabled: true,
    scoreRevealScope: 'with_answer',
    scoreRevealTiming: 'after_due',
  },
  {
    id: 'cs401_2',
    title: '1차 형성평가 - 탐색 알고리즘',
    description: '이진 탐색, BFS, DFS의 시간복잡도와 활용 사례를 다룹니다.',
    course: 'CS401 알고리즘',
    status: 'draft',
    visible: false,
    startDate: '2026-04-17 09:00',
    dueDate: '2026-04-17 23:59',
    week: 11,
    session: 1,
    totalStudents: 38,
    submitted: 0,
    graded: 0,
    pendingGrade: 0,
    questions: 12,
    totalPoints: 40,
    timeLimit: 40,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 2,
    scoreRevealEnabled: true,
    scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'immediately',
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
  // 퀴즈 8 답안 풀 (2차 형성평가 - 데이터베이스 설계 & 정규화)
  q8_1: ['원자값으로만 구성된 도메인', '부분 함수적 종속 제거', 'BCNF 만족', '이행적 함수 종속 제거'],
  q8_2: ['정수 0과 동일한 값이다', '값이 존재하지 않음을 의미한다', '아직 알려지지 않은 값을 나타낸다', 'IS NULL로 비교해야 한다'],
  q8_3: ['참', '거짓', '참', '참'],
  q8_4: ['부분 함수 종속', '이행적 함수 종속', '완전 함수 종속', '다치 종속'],
  q8_5: ['식별 관계(Identifying Relationship)', '기본키', '다중값 속성', '파생 속성'],
  q8_6: ['참', '거짓', '참', '거짓'],
  q8_7: ['이행적 함수 종속', '부분 함수 종속', '완전 함수 종속', '다치 종속'],
  q8_8: ['분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다', '분해된 릴레이션의 행 수가 동일해야 한다', '분해된 릴레이션의 속성 수가 동일해야 한다', '분해된 릴레이션이 같은 도메인을 가져야 한다'],
  q8_9: ['삽입 이상, 삭제 이상, 갱신 이상', '삽입이상·삭제이상·갱신이상', '삽입 이상과 삭제 이상, 갱신 이상'],
  q8_10: ['1NF는 원자값 조건을 만족해야 합니다. 2NF는 1NF를 만족하고 부분 함수 종속을 제거해야 합니다. 예시로 (학번, 과목코드, 성적, 학과명) 테이블에서 학과명이 학번에만 종속되므로 분리해야 합니다.', 'BCNF는 모든 결정자가 후보키여야 하는 조건입니다. 예를 들어 수강(학번, 과목, 교수) 테이블에서 교수→과목 종속이 있으면 1NF→2NF→3NF→BCNF 단계로 분해합니다.', '정규화 각 단계: 1NF 원자값 보장, 2NF 부분 종속 제거, 3NF 이행 종속 제거, BCNF 모든 결정자가 후보키. 과도한 정규화 시 JOIN 연산이 증가하여 성능 저하가 발생할 수 있습니다.'],

  // 퀴즈 2 답안 풀 (1차 형성평가 - SQL 기초)
  q2_1: ['TRUNCATE', 'DELETE', 'DROP', 'REMOVE'],
  q2_2: ['ORDER BY', 'GROUP BY', 'SORT BY', 'ARRANGE BY'],
  q2_3: ['참', '거짓'],
  q2_4: ['두 테이블 모두에 일치하는 행', '왼쪽 테이블의 모든 행', '오른쪽 테이블의 모든 행', '두 테이블의 모든 행'],
  q2_5: ['IS NULL', '= NULL', '== NULL', 'EQUALS NULL'],
  q2_6: ['참', '거짓'],
  q2_7: ['CONCAT', 'COUNT', 'SUM', 'AVG'],
  q2_8: ['중복 행 제거', 'NULL 행 제거', '정렬 수행', '행 수 반환'],
  q2_9: ['참', '거짓'],
  q2_10: ['CREATE', 'SELECT', 'INSERT', 'UPDATE'],
  q2_11: ['비교 연산자(=, >, <)와 함께 사용될 때', 'IN 연산자와 함께 사용될 때', 'EXISTS 연산자와 함께 사용될 때', 'FROM 절에 사용될 때'],
  q2_12: ['새 행 삽입 시 자동으로 증가하는 고유 정수 값 생성', '컬럼 값을 자동으로 정렬', 'NULL 값을 자동으로 0으로 변환', '기본키를 자동으로 설정'],
  q2_13: ['참', '거짓'],
  q2_14: ['_', '%', '*', '?'],
  q2_15: ['>= A AND <= B', '> A AND < B', '>= A AND < B', '> A AND <= B'],
  q2_16: ['참', '거짓'],
  q2_17: ['부모 행 삭제 시 자식 행도 자동으로 삭제', '부모 행 삭제 시 오류 발생', '부모 행 삭제 시 자식 행의 값이 NULL로 변경', '자식 행 삭제 시 부모 행도 자동으로 삭제'],
  q2_18: ['뷰는 항상 물리적으로 데이터를 저장한다', '논리적 테이블이다', '기반 테이블의 데이터를 참조한다', '보안을 위해 특정 컬럼만 노출할 수 있다'],
  q2_19: ['거짓', '참'],
  q2_20: ['ROLLBACK', 'COMMIT', 'SAVEPOINT', 'UNDO'],

  // 퀴즈 3 답안 풀 (인덱스와 쿼리 최적화)
  q3_1: ['B-Tree 구조로 데이터를 정렬하여 탐색 범위를 줄이기 때문에', '데이터를 메모리에 캐시하기 때문에', '중복 데이터를 자동으로 제거하기 때문에', '테이블 전체 크기를 줄이기 때문에'],
  q3_2: ['거짓', '참'],
  q3_3: ['인덱스가 없는 컬럼으로 WHERE 조건 검색', '기본키(PK)로 단건 조회', 'LIMIT 1 조건 사용', '인덱스 컬럼 범위 검색'],
  q3_4: ['쿼리 실행 계획을 확인하여 성능 병목을 파악하기 위해', '쿼리 결과를 외부 파일로 출력하기 위해', '데이터베이스 접근 권한을 확인하기 위해', '쿼리 오류를 자동으로 수정하기 위해'],
  q3_5: ['WHERE B = ? AND C = ?', 'WHERE A = ?', 'WHERE A = ? AND B = ?', 'WHERE A = ? AND B = ? AND C = ?'],
  q3_6: ['참', '거짓'],
  q3_7: ['1번 쿼리로 N개 데이터 조회 후, 각 데이터에 대해 N번 추가 쿼리가 발생하는 현상', '하나의 테이블에 N+1개 이상의 인덱스가 생성된 상태', 'N개 테이블을 JOIN할 때 쿼리 수가 N+1이 되는 현상', '동시에 N+1명이 접속하여 데드락이 발생하는 현상'],
  q3_8: ['인덱스를 활용하지 못하고 풀 스캔이 발생한다', '쿼리 구문 오류가 발생한다', '함수 결과가 잘못 계산된다', '인덱스가 자동으로 재생성된다'],
  q3_9: ['EXPLAIN', 'explain', 'Explain'],
  q3_10: ['INSERT/UPDATE/DELETE가 매우 빈번한 테이블', '고유값이 많은 컬럼 검색', '기본키(PK)로 단건 조회', 'WHERE 조건 포함 범위 검색'],

  // 퀴즈 4 답안 풀 (기말고사 - 데이터베이스 심화)
  q4_1: ['데이터베이스의 구조와 제약 조건을 정의한 명세', '저장된 데이터의 실제 집합', '데이터 접근 권한 목록', '쿼리 실행 계획'],
  q4_2: ['2NF 만족 + 이행적 함수 종속 제거', '1NF 만족 + 부분 함수 종속 제거', '2NF 만족 + 결정자가 모두 후보키', '3NF 만족 + 다치 종속 제거'],
  q4_3: ['참', '거짓'],
  q4_4: ['같은 트랜잭션 내에서 동일 쿼리를 반복할 때 이전에 없던 행이 나타나는 현상', '커밋되지 않은 데이터를 읽는 현상', '한 트랜잭션이 읽은 데이터를 다른 트랜잭션이 수정한 현상', '데드락으로 인해 쿼리가 차단되는 현상'],
  q4_5: ['일관성(Consistency), 가용성(Availability), 분할 내성(Partition Tolerance)', '동시성, 원자성, 내구성', '무결성, 정확성, 성능', '보안, 가용성, 성능'],
  q4_6: ['참', '거짓'],
  q4_7: ['모든 트랜잭션에 동일한 타임아웃 적용', '항상 동일한 순서로 자원 잠금', '타임아웃 설정 후 롤백', '선점(Preemption) 기법 사용'],
  q4_8: ['Redis', 'MongoDB', 'Cassandra', 'Neo4j'],
  q4_9: ['거짓', '참'],
  q4_10: ['준비된 구문(Prepared Statement) 사용', '입력 길이 제한', '에러 메시지 숨기기', '데이터베이스 계정 비밀번호 복잡도 강화'],
  q4_11: ['파티셔닝은 단일 DB 내 분할, 샤딩은 다수 DB 서버 간 분산', '파티셔닝은 수직 분할만 가능, 샤딩은 수평 분할만 가능', '파티셔닝은 NoSQL 전용, 샤딩은 RDB 전용', '샤딩은 읽기 성능만 향상, 파티셔닝은 쓰기 성능만 향상'],
  q4_12: ['거짓', '참'],
  q4_13: ['SERIALIZABLE', 'READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ'],
  q4_14: ['나누기(Division)', '선택(Selection)', '프로젝션(Projection)', '합집합(Union)'],
  q4_15: ['장애 발생 시 데이터 복구를 위한 트랜잭션 로그 기록', '쿼리 성능 최적화', '인덱스 자동 생성', '동시 접속 사용자 수 제어'],
  q4_16: ['쿼리를 작성한 개발자의 경력', '통계 정보(Statistics)', '인덱스 존재 여부', '테이블 크기'],
  q4_17: ['데이터 읽기 시 잠금 없이 이전 버전의 스냅샷을 제공', '모든 읽기 연산에 공유 잠금 적용', '쓰기 연산을 직렬화하여 충돌 방지', '자동으로 트랜잭션을 롤백'],
  q4_18: ['장애 발생 시 Standby로 전환되는 동안 일시적 서비스 중단 발생', '쓰기 성능이 절반으로 감소', '데이터 정합성 보장이 불가', '읽기 분산이 불가능'],
  q4_19: ['외부 쿼리의 각 행에 대해 서브쿼리가 반복 실행', '한 번만 실행되어 결과를 캐시', '항상 단일 값을 반환', 'FROM 절에만 사용 가능'],
  q4_20: ['분해된 릴레이션의 공통 속성이 어느 한쪽의 키여야 한다', '분해된 릴레이션을 단순히 UNION으로 합칠 수 있으면 된다', '분해된 릴레이션의 행 수 합이 원본과 같아야 한다', '분해된 릴레이션이 항상 같은 수의 컬럼을 가져야 한다'],
  q4_21: ['Atomicity', 'atomicity', '원자성'],
  q4_22: ['데드락', 'deadlock', 'Deadlock', '교착 상태'],
  q4_23: ['EXPLAIN', 'explain', 'Explain'],
  q4_24: ['정규화의 목적은 데이터 중복 제거와 이상 현상 방지입니다. 1NF는 원자값 보장, 2NF는 부분 종속 제거, 3NF는 이행 종속 제거, BCNF는 모든 결정자가 후보키여야 합니다. 과도한 정규화는 JOIN 연산 증가로 성능 저하를 초래할 수 있으며, 이때 역정규화를 적용합니다.', '1NF~BCNF 각 단계를 거치며 데이터 무결성을 높입니다. 역정규화는 읽기 성능이 중요한 경우, 예를 들어 보고서 테이블에서 집계 데이터를 미리 저장하는 상황에서 적용합니다.', '정규화는 데이터 이상(삽입/삭제/갱신)을 제거하기 위한 과정입니다. 단계별로 종속성을 제거하며, 역정규화는 대시보드나 OLAP 환경에서 조회 성능 향상을 위해 사용됩니다.'],
  q4_25: ['인덱스 전략은 자주 조회되는 컬럼에 B-Tree 인덱스를 생성하되 DML 빈도를 고려해야 합니다. 캐싱은 Redis 등을 활용하여 반복 쿼리 부하를 줄이고, Read Replica로 읽기/쓰기를 분리합니다. 파티셔닝은 데이터 크기에 따라 수평/수직으로 분할합니다.', '대규모 서비스에서는 인덱스 설계가 핵심입니다. 커버링 인덱스로 I/O를 줄이고, 캐시 무효화 전략을 세워야 합니다. Read Replica 사용 시 복제 지연(replication lag)을 고려해야 하며, 파티셔닝은 쿼리 패턴에 맞게 파티션 키를 선정해야 합니다.', 'DB 성능 향상 방법으로 인덱스, 캐싱, 읽기 분리, 파티셔닝이 있습니다. 트레이드오프로는 인덱스 유지 비용, 캐시 정합성, 복제 지연, 파티션 간 조인 비용 등이 있습니다.'],

  // 퀴즈 5 답안 풀 (ER 다이어그램)
  q5_1: ['직사각형', '마름모', '타원', '이중 직사각형'],
  q5_2: ['마름모', '직사각형', '타원', '삼각형'],
  q5_3: ['참', '거짓'],
  q5_4: ['이중 타원', '점선 타원', '밑줄 있는 타원', '이중 직사각형'],
  q5_5: ['M:N', '1:1', '1:N', 'N:1'],
  q5_6: ['참', '거짓'],
  q5_7: ['별도의 관계 테이블을 생성하여 양쪽 기본키를 외래키로 포함한다', '한쪽 테이블에 외래키를 추가한다', '두 테이블을 하나로 병합한다', '관계 속성만 별도 테이블로 분리한다'],
  q5_8: ['이중선(Double Line)', '점선', '화살표', '굵은 단선'],
  q5_9: ['기본키(Primary Key)', '기본키', 'Primary Key', 'PK'],
  q5_10: ['개체(Entity), 속성(Attribute), 관계(Relationship)', '개체(Entity), 속성(Attribute)', '개체(Entity), 관계(Relationship), 인덱스(Index)', '속성(Attribute), 트리거(Trigger)'],

  // 퀴즈 6 답안 풀 (관계 대수)
  q6_1: ['셀렉션(Selection, σ)', '프로젝션(Projection, π)', '조인(Join, ⋈)', '디비전(Division, ÷)'],
  q6_2: ['프로젝션(Projection, π)', '셀렉션(Selection, σ)', '카티션 곱(Cartesian Product, ×)', '합집합(Union, ∪)'],
  q6_3: ['참', '거짓'],
  q6_4: ['두 릴레이션에서 같은 이름의 속성 값이 같은 튜플을 결합하고, 중복 속성을 제거한다', '두 릴레이션의 모든 튜플을 조합하여 카티션 곱을 구한다', '한 릴레이션에만 존재하는 튜플을 반환한다', '두 릴레이션의 합집합을 구한 후 중복을 제거한다'],
  q6_5: ['−', '-', '마이너스'],

  // 퀴즈 7 답안 풀 (서술형 과제 - 정규화 단계 분석)
  q7_1: ['1NF는 모든 속성이 원자값을 가져야 합니다. 예시로 한 셀에 여러 전화번호를 저장하면 1NF를 위반합니다. 2NF는 부분 함수 종속을 제거해야 하며, 복합키의 일부에만 종속되는 속성이 있으면 위반입니다. 3NF는 이행적 함수 종속을 제거해야 합니다.', '제1정규형은 원자값 조건, 제2정규형은 완전 함수 종속 조건, 제3정규형은 비이행 함수 종속 조건입니다. 각각 다중값 속성, 부분 종속, 이행 종속이 위반 예시입니다.', '1NF: 반복 그룹 제거, 2NF: 기본키의 부분 집합에 종속되는 속성 분리, 3NF: 기본키에 간접 종속되는 속성 분리. 예를 들어 학생(학번, 과목코드, 교수명) 테이블에서 교수명이 과목코드에만 종속되면 2NF 위반입니다.'],
  q7_2: ['주문 릴레이션은 2NF를 위반합니다. 고객명은 고객번호에만 종속되고, 상품명과 단가는 상품코드에만 종속됩니다. 정규화 과정: 고객(고객번호, 고객명), 상품(상품코드, 상품명, 단가), 주문(주문번호, 고객번호, 상품코드, 수량)으로 분해합니다.', '해당 스키마는 부분 함수 종속이 존재하여 2NF를 위반합니다. (주문번호, 상품코드)가 복합키일 때, 고객명은 주문번호에만, 상품명/단가는 상품코드에만 종속됩니다. 세 릴레이션으로 분해하여 해결합니다.', '1NF는 만족하지만 복합키에 대한 부분 종속이 있어 2NF 위반입니다. 고객 테이블, 상품 테이블, 주문 테이블로 분해하면 3NF까지 만족합니다.'],
  q7_3: ['정규화의 장점: 1) 데이터 중복 감소로 저장 공간 절약, 2) 갱신 이상 방지로 데이터 일관성 유지. 단점: 1) 테이블 수 증가로 JOIN 연산 비용 증가, 2) 쿼리 복잡도 증가. 역정규화는 대시보드 등 조회 빈도가 높은 테이블에서 JOIN을 줄이기 위해 적용합니다.', '장점: 데이터 무결성 보장, 이상 현상 제거. 단점: 조인 증가로 성능 저하 가능, 설계 복잡도 증가. 역정규화 예시: 게시판 목록에서 작성자 이름을 매번 JOIN하지 않고 게시글 테이블에 작성자명 컬럼을 추가하는 경우.', '장점: 중복 최소화, 데이터 정합성 향상. 단점: 읽기 성능 저하, 복잡한 쿼리. 역정규화가 필요한 상황: OLAP 환경에서 집계 테이블을 미리 만들어 실시간 리포트 성능을 높이는 경우.'],

  // CS201 운영체제 — 중간고사 답안 풀
  cs201_1_q1: ['스레드는 프로세스의 메모리 공간을 공유하지만 프로세스는 독립적인 메모리 공간을 가진다', '프로세스가 스레드보다 생성 비용이 낮다', '스레드는 독립적인 PCB를 가진다', '프로세스 간 통신은 스레드 간 통신보다 빠르다'],
  cs201_1_q2: ['FCFS (First-Come, First-Served)', 'Round Robin', 'SRT (Shortest Remaining Time)', 'Priority Scheduling (Preemptive)'],
  cs201_1_q3: ['참', '거짓'],
  cs201_1_q4: ['대기(Waiting) 상태', '대기 상태', 'Waiting', 'Block 상태'],
  cs201_1_q5: ['세마포어는 정수 카운터 기반으로 여러 스레드의 접근을 허용하고, 뮤텍스는 이진값으로 단 하나의 스레드만 접근을 허용합니다. 세마포어는 생산자-소비자 문제에, 뮤텍스는 임계 영역 보호에 적합합니다.', '뮤텍스는 소유권 개념이 있어 잠금을 획득한 스레드만 해제할 수 있지만, 세마포어는 다른 스레드가 시그널을 보낼 수 있습니다. 뮤텍스는 상호 배제에, 세마포어는 리소스 풀 관리에 사용됩니다.', '세마포어와 뮤텍스 모두 동기화 도구이지만, 뮤텍스는 단일 리소스 보호에 사용되고 세마포어는 N개 리소스에 대한 동시 접근 제어에 사용됩니다. 예를 들어 데이터베이스 커넥션 풀은 세마포어로 관리합니다.'],
  cs201_1_q6: ['선점(Preemption)', '상호 배제(Mutual Exclusion)', '점유와 대기(Hold and Wait)', '순환 대기(Circular Wait)'],
  cs201_1_q7: ['파이프(Pipe), 공유 메모리(Shared Memory), 메시지 큐(Message Queue)', '파이프(Pipe), 공유 메모리(Shared Memory)', '공유 메모리(Shared Memory), 메시지 큐(Message Queue)', '파이프(Pipe), 레지스터(Register)'],
  cs201_1_q8: ['13.25', '13', '14', '12.5'],
  cs201_1_q9: ['참', '거짓'],
  cs201_1_q10: ['LRU는 가장 오래 사용되지 않은 페이지를 교체하여 참조 지역성을 활용합니다. FIFO는 가장 먼저 적재된 페이지를 교체합니다. 벨라디의 이상 현상은 FIFO에서 발생하며, 프레임 수가 증가해도 페이지 폴트가 늘어나는 현상입니다.', 'FIFO는 단순하지만 벨라디의 이상 현상이 발생할 수 있습니다. LRU는 시간적 지역성을 반영하여 더 나은 성능을 보이지만 구현 비용이 높습니다. 벨라디의 이상은 스택 알고리즘이 아닌 FIFO에서 발생합니다.', 'LRU와 FIFO 모두 페이지 교체 알고리즘입니다. LRU는 최근 미사용 페이지를 교체하고, FIFO는 선입선출 방식입니다. FIFO에서 프레임 증가 시 오히려 폴트가 증가하는 벨라디 이상이 발생합니다.'],

  // CS201 운영체제 — 1차 형성평가 답안 풀
  cs201_2_q1: ['FCFS', 'SJF', 'Priority Scheduling', 'Multilevel Queue'],
  cs201_2_q2: ['참', '거짓'],
  cs201_2_q3: ['에이징(Aging)', '라운드 로빈(Round Robin)', '멀티레벨 큐(Multilevel Queue)', 'FCFS'],
  cs201_2_q4: ['프로세스가 I/O를 요청하여 대기 상태로 전환될 때', '실행 중인 프로세스가 종료될 때', '타임 슬라이스가 만료될 때', '인터럽트가 처리된 후 준비 큐에 프로세스가 추가될 때'],
  cs201_2_q5: ['디스패치(Dispatch)', '디스패치', 'Dispatch', '문맥 교환'],
  cs201_2_q6: ['Round Robin, SRT, Preemptive Priority', 'Round Robin, SRT (Shortest Remaining Time)', 'Round Robin, FCFS', 'SRT (Shortest Remaining Time), Preemptive Priority'],
  cs201_2_q7: ['14', '16', '12', '18'],

  // CS401 알고리즘 — 중간고사 답안 풀
  cs401_1_q1: ['합병 정렬(Merge Sort)', '퀵 정렬(Quick Sort)', '버블 정렬(Bubble Sort)', '삽입 정렬(Insertion Sort)'],
  cs401_1_q2: ['참', '거짓'],
  cs401_1_q3: ['버블 정렬, 합병 정렬, 삽입 정렬', '퀵 정렬, 합병 정렬, 힙 정렬', '선택 정렬, 퀵 정렬, 합병 정렬', '힙 정렬, 삽입 정렬, 선택 정렬'],
  cs401_1_q4: ['삽입 정렬(Insertion Sort)', '삽입 정렬', 'Insertion Sort', '버블 정렬'],
  cs401_1_q5: ['힙 정렬은 최대 힙(또는 최소 힙)을 구성한 후 루트 노드를 반복적으로 추출하여 정렬합니다. 시간복잡도는 최선/평균/최악 모두 O(n log n)입니다. 실제 환경에서 퀵 정렬이 더 빠른 이유는 캐시 지역성이 뛰어나기 때문입니다.', '힙 정렬은 완전 이진 트리를 활용하여 정렬합니다. 힙 구성에 O(n), 추출에 O(n log n)이 소요됩니다. 퀵 정렬은 평균적으로 캐시 히트율이 높아 상수 계수가 작기 때문에 실제로 더 빠릅니다.', '힙 정렬의 동작: 배열을 힙으로 변환(heapify) 후 최대값을 추출하여 정렬합니다. 시간복잡도는 O(n log n)입니다. 퀵 정렬은 메모리 접근 패턴이 순차적이어서 CPU 캐시 활용도가 높습니다.'],
  cs401_1_q6: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
  cs401_1_q7: ['24', '20', '16', '28'],
  cs401_1_q8: ['버블 정렬, 삽입 정렬, 선택 정렬, 퀵 정렬, 힙 정렬', '버블 정렬, 삽입 정렬, 선택 정렬, 퀵 정렬', '버블 정렬, 삽입 정렬, 합병 정렬', '퀵 정렬, 힙 정렬, 기수 정렬'],
  cs401_1_q9: ['거짓', '참'],
  cs401_1_q10: ['이미 정렬된 배열', '역순으로 정렬된 배열', '무작위 배열', '모든 원소가 동일한 배열'],
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

// 퀴즈2 문항 (1차 형성평가 - SQL 기초, 총 50점 / 20문항)
// q2_1~q2_10: 2pt, q2_11~q2_20: 3pt
export const mockQuiz2Questions = [
  {
    id: 'q2_1', order: 1, type: 'multiple_choice',
    text: 'SQL에서 테이블의 모든 행을 삭제하되 테이블 구조는 유지하는 명령어는?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.6,
    correctAnswer: 'TRUNCATE', choices: ['DELETE', 'TRUNCATE', 'DROP', 'REMOVE'],
  },
  {
    id: 'q2_2', order: 2, type: 'multiple_choice',
    text: 'SELECT 문에서 결과를 정렬할 때 사용하는 절은?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.9,
    correctAnswer: 'ORDER BY', choices: ['GROUP BY', 'ORDER BY', 'SORT BY', 'ARRANGE BY'],
  },
  {
    id: 'q2_3', order: 3, type: 'true_false',
    text: 'WHERE 절은 GROUP BY 절보다 먼저 실행된다.',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.5,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q2_4', order: 4, type: 'multiple_choice',
    text: 'INNER JOIN의 결과로 반환되는 행은?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.7,
    correctAnswer: '두 테이블 모두에 일치하는 행',
    choices: ['두 테이블 모두에 일치하는 행', '왼쪽 테이블의 모든 행', '오른쪽 테이블의 모든 행', '두 테이블의 모든 행'],
  },
  {
    id: 'q2_5', order: 5, type: 'multiple_choice',
    text: 'NULL 값과의 비교에서 올바른 SQL 표현식은?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.4,
    correctAnswer: 'IS NULL', choices: ['= NULL', '== NULL', 'IS NULL', 'EQUALS NULL'],
  },
  {
    id: 'q2_6', order: 6, type: 'true_false',
    text: 'HAVING 절은 그룹화된 결과에 조건을 적용할 때 사용한다.',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.6,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q2_7', order: 7, type: 'multiple_choice',
    text: '다음 중 집계 함수가 아닌 것은?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.8,
    correctAnswer: 'CONCAT', choices: ['COUNT', 'SUM', 'AVG', 'CONCAT'],
  },
  {
    id: 'q2_8', order: 8, type: 'multiple_choice',
    text: 'SELECT DISTINCT 의 역할은?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.9,
    correctAnswer: '중복 행 제거', choices: ['중복 행 제거', 'NULL 행 제거', '정렬 수행', '행 수 반환'],
  },
  {
    id: 'q2_9', order: 9, type: 'true_false',
    text: 'LEFT JOIN은 오른쪽 테이블에 일치하는 행이 없어도 왼쪽 테이블의 모든 행을 반환한다.',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.5,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q2_10', order: 10, type: 'multiple_choice',
    text: 'DML(Data Manipulation Language)에 해당하지 않는 명령어는?',
    points: 2, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.6,
    correctAnswer: 'CREATE', choices: ['SELECT', 'INSERT', 'UPDATE', 'CREATE'],
  },
  {
    id: 'q2_11', order: 11, type: 'multiple_choice',
    text: '서브쿼리(Subquery)가 반드시 단일 값을 반환해야 하는 경우는?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.1,
    correctAnswer: '비교 연산자(=, >, <)와 함께 사용될 때',
    choices: ['IN 연산자와 함께 사용될 때', 'EXISTS 연산자와 함께 사용될 때', '비교 연산자(=, >, <)와 함께 사용될 때', 'FROM 절에 사용될 때'],
  },
  {
    id: 'q2_12', order: 12, type: 'multiple_choice',
    text: 'AUTO_INCREMENT 속성의 역할은?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.5,
    correctAnswer: '새 행 삽입 시 자동으로 증가하는 고유 정수 값 생성',
    choices: ['새 행 삽입 시 자동으로 증가하는 고유 정수 값 생성', '컬럼 값을 자동으로 정렬', 'NULL 값을 자동으로 0으로 변환', '기본키를 자동으로 설정'],
  },
  {
    id: 'q2_13', order: 13, type: 'true_false',
    text: 'UNION은 두 SELECT 결과를 합칠 때 중복 행을 자동으로 제거한다.',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.0,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q2_14', order: 14, type: 'multiple_choice',
    text: 'LIKE 연산자에서 임의의 단일 문자를 의미하는 와일드카드는?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.2,
    correctAnswer: '_', choices: ['%', '_', '*', '?'],
  },
  {
    id: 'q2_15', order: 15, type: 'multiple_choice',
    text: 'BETWEEN A AND B 조건과 동일한 표현식은?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.3,
    correctAnswer: '>= A AND <= B',
    choices: ['> A AND < B', '>= A AND <= B', '>= A AND < B', '> A AND <= B'],
  },
  {
    id: 'q2_16', order: 16, type: 'true_false',
    text: 'COUNT(*) 는 NULL 값을 포함한 모든 행의 수를 반환한다.',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.8,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q2_17', order: 17, type: 'multiple_choice',
    text: 'FOREIGN KEY 제약 조건에 ON DELETE CASCADE를 설정하면?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.0,
    correctAnswer: '부모 행 삭제 시 자식 행도 자동으로 삭제',
    choices: ['부모 행 삭제 시 오류 발생', '부모 행 삭제 시 자식 행도 자동으로 삭제', '부모 행 삭제 시 자식 행의 값이 NULL로 변경', '자식 행 삭제 시 부모 행도 자동으로 삭제'],
  },
  {
    id: 'q2_18', order: 18, type: 'multiple_choice',
    text: '뷰(View)에 대한 설명으로 옳지 않은 것은?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.9,
    correctAnswer: '뷰는 항상 물리적으로 데이터를 저장한다',
    choices: ['논리적 테이블이다', '기반 테이블의 데이터를 참조한다', '뷰는 항상 물리적으로 데이터를 저장한다', '보안을 위해 특정 컬럼만 노출할 수 있다'],
  },
  {
    id: 'q2_19', order: 19, type: 'true_false',
    text: 'GROUP BY 없이 HAVING 절을 단독으로 사용할 수 없다.',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 1.7,
    correctAnswer: '거짓', choices: ['참', '거짓'],
  },
  {
    id: 'q2_20', order: 20, type: 'multiple_choice',
    text: '트랜잭션을 취소하고 이전 상태로 되돌리는 명령어는?',
    points: 3, autoGrade: true, gradedCount: 118, totalCount: 118, avgScore: 2.4,
    correctAnswer: 'ROLLBACK', choices: ['COMMIT', 'ROLLBACK', 'SAVEPOINT', 'UNDO'],
  },
]

// quiz2 자동채점 정답 맵
const AUTO_CORRECT_Q2 = {
  q2_1: ['TRUNCATE'],
  q2_2: ['ORDER BY'],
  q2_3: ['참', 'true'],
  q2_4: ['두 테이블 모두에 일치하는 행'],
  q2_5: ['IS NULL'],
  q2_6: ['참', 'true'],
  q2_7: ['CONCAT'],
  q2_8: ['중복 행 제거'],
  q2_9: ['참', 'true'],
  q2_10: ['CREATE'],
  q2_11: ['비교 연산자(=, >, <)와 함께 사용될 때'],
  q2_12: ['새 행 삽입 시 자동으로 증가하는 고유 정수 값 생성'],
  q2_13: ['참', 'true'],
  q2_14: ['_'],
  q2_15: ['>= A AND <= B'],
  q2_16: ['참', 'true'],
  q2_17: ['부모 행 삭제 시 자식 행도 자동으로 삭제'],
  q2_18: ['뷰는 항상 물리적으로 데이터를 저장한다'],
  q2_19: ['거짓', 'false'],
  q2_20: ['ROLLBACK'],
}

// 퀴즈4 문항 (기말고사 - 데이터베이스 심화, 총 100점 / 25문항)
// q4_1~q4_12: 2pt, q4_13~q4_20: 4pt, q4_21~q4_23: 8pt, q4_24~q4_25: 10pt
export const mockQuiz4Questions = [
  {
    id: 'q4_1', order: 1, type: 'multiple_choice',
    text: '데이터베이스 스키마(Schema)의 정의로 가장 적절한 것은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '데이터베이스의 구조와 제약 조건을 정의한 명세',
    choices: ['데이터베이스의 구조와 제약 조건을 정의한 명세', '저장된 데이터의 실제 집합', '데이터 접근 권한 목록', '쿼리 실행 계획'],
  },
  {
    id: 'q4_2', order: 2, type: 'multiple_choice',
    text: '3NF(제3정규형)를 만족하기 위한 조건은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '2NF 만족 + 이행적 함수 종속 제거',
    choices: ['1NF 만족 + 부분 함수 종속 제거', '2NF 만족 + 이행적 함수 종속 제거', '2NF 만족 + 결정자가 모두 후보키', '3NF 만족 + 다치 종속 제거'],
  },
  {
    id: 'q4_3', order: 3, type: 'true_false',
    text: 'BCNF(보이스-코드 정규형)는 항상 3NF보다 강력한 정규형이다.',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q4_4', order: 4, type: 'multiple_choice',
    text: '동시성 제어에서 팬텀 리드(Phantom Read)란?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '같은 트랜잭션 내에서 동일 쿼리를 반복할 때 이전에 없던 행이 나타나는 현상',
    choices: ['커밋되지 않은 데이터를 읽는 현상', '한 트랜잭션이 읽은 데이터를 다른 트랜잭션이 수정한 현상', '같은 트랜잭션 내에서 동일 쿼리를 반복할 때 이전에 없던 행이 나타나는 현상', '데드락으로 인해 쿼리가 차단되는 현상'],
  },
  {
    id: 'q4_5', order: 5, type: 'multiple_choice',
    text: '분산 데이터베이스의 CAP 정리에서 C, A, P가 의미하는 것은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '일관성(Consistency), 가용성(Availability), 분할 내성(Partition Tolerance)',
    choices: ['일관성, 가용성, 분할 내성', '동시성, 원자성, 내구성', '무결성, 정확성, 성능', '보안, 가용성, 성능'],
  },
  {
    id: 'q4_6', order: 6, type: 'true_false',
    text: '클러스터드 인덱스(Clustered Index)는 테이블당 하나만 생성할 수 있다.',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '참', choices: ['참', '거짓'],
  },
  {
    id: 'q4_7', order: 7, type: 'multiple_choice',
    text: '데드락(Deadlock)을 예방하는 방법으로 적절하지 않은 것은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '모든 트랜잭션에 동일한 타임아웃 적용',
    choices: ['항상 동일한 순서로 자원 잠금', '타임아웃 설정 후 롤백', '모든 트랜잭션에 동일한 타임아웃 적용', '선점(Preemption) 기법 사용'],
  },
  {
    id: 'q4_8', order: 8, type: 'multiple_choice',
    text: 'NoSQL 데이터베이스 중 키-값(Key-Value) 저장소에 해당하는 것은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: 'Redis', choices: ['MongoDB', 'Cassandra', 'Redis', 'Neo4j'],
  },
  {
    id: 'q4_9', order: 9, type: 'true_false',
    text: '트랜잭션 격리 수준을 높일수록 동시 처리 성능은 향상된다.',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '거짓', choices: ['참', '거짓'],
  },
  {
    id: 'q4_10', order: 10, type: 'multiple_choice',
    text: 'SQL 인젝션 공격을 방어하는 가장 효과적인 방법은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '준비된 구문(Prepared Statement) 사용',
    choices: ['입력 길이 제한', '준비된 구문(Prepared Statement) 사용', '에러 메시지 숨기기', '데이터베이스 계정 비밀번호 복잡도 강화'],
  },
  {
    id: 'q4_11', order: 11, type: 'multiple_choice',
    text: '파티셔닝(Partitioning)과 샤딩(Sharding)의 차이로 올바른 것은?',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '파티셔닝은 단일 DB 내 분할, 샤딩은 다수 DB 서버 간 분산',
    choices: ['파티셔닝은 수직 분할만 가능, 샤딩은 수평 분할만 가능', '파티셔닝은 NoSQL 전용, 샤딩은 RDB 전용', '파티셔닝은 단일 DB 내 분할, 샤딩은 다수 DB 서버 간 분산', '샤딩은 읽기 성능만 향상, 파티셔닝은 쓰기 성능만 향상'],
  },
  {
    id: 'q4_12', order: 12, type: 'true_false',
    text: '뷰(View)를 통해 항상 INSERT, UPDATE, DELETE가 가능하다.',
    points: 2, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '거짓', choices: ['참', '거짓'],
  },
  {
    id: 'q4_13', order: 13, type: 'multiple_choice',
    text: '트랜잭션 격리 수준 중 Dirty Read, Non-Repeatable Read, Phantom Read 모두 방지하는 수준은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: 'SERIALIZABLE',
    choices: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
  },
  {
    id: 'q4_14', order: 14, type: 'multiple_choice',
    text: '다음 중 관계 대수(Relational Algebra)의 기본 연산에 해당하지 않는 것은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '나누기(Division)',
    choices: ['선택(Selection)', '프로젝션(Projection)', '합집합(Union)', '나누기(Division)'],
  },
  {
    id: 'q4_15', order: 15, type: 'multiple_choice',
    text: 'WAL(Write-Ahead Logging)의 주요 목적은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '장애 발생 시 데이터 복구를 위한 트랜잭션 로그 기록',
    choices: ['쿼리 성능 최적화', '인덱스 자동 생성', '장애 발생 시 데이터 복구를 위한 트랜잭션 로그 기록', '동시 접속 사용자 수 제어'],
  },
  {
    id: 'q4_16', order: 16, type: 'multiple_choice',
    text: '다음 중 옵티마이저(Optimizer)가 쿼리 실행 계획을 결정할 때 고려하는 요소가 아닌 것은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '쿼리를 작성한 개발자의 경력',
    choices: ['통계 정보(Statistics)', '인덱스 존재 여부', '테이블 크기', '쿼리를 작성한 개발자의 경력'],
  },
  {
    id: 'q4_17', order: 17, type: 'multiple_choice',
    text: 'MVCC(Multi-Version Concurrency Control)의 핵심 개념은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '데이터 읽기 시 잠금 없이 이전 버전의 스냅샷을 제공',
    choices: ['모든 읽기 연산에 공유 잠금 적용', '데이터 읽기 시 잠금 없이 이전 버전의 스냅샷을 제공', '쓰기 연산을 직렬화하여 충돌 방지', '자동으로 트랜잭션을 롤백'],
  },
  {
    id: 'q4_18', order: 18, type: 'multiple_choice',
    text: '데이터베이스 이중화에서 Active-Standby 구성의 단점은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '장애 발생 시 Standby로 전환되는 동안 일시적 서비스 중단 발생',
    choices: ['쓰기 성능이 절반으로 감소', '장애 발생 시 Standby로 전환되는 동안 일시적 서비스 중단 발생', '데이터 정합성 보장이 불가', '읽기 분산이 불가능'],
  },
  {
    id: 'q4_19', order: 19, type: 'multiple_choice',
    text: '다음 중 연결형 서브쿼리(Correlated Subquery)의 특징은?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '외부 쿼리의 각 행에 대해 서브쿼리가 반복 실행',
    choices: ['한 번만 실행되어 결과를 캐시', '항상 단일 값을 반환', '외부 쿼리의 각 행에 대해 서브쿼리가 반복 실행', 'FROM 절에만 사용 가능'],
  },
  {
    id: 'q4_20', order: 20, type: 'multiple_choice',
    text: 'DB 정규화 시 분해가 무손실(Lossless Decomposition)이 되려면?',
    points: 4, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '분해된 릴레이션의 공통 속성이 어느 한쪽의 키여야 한다',
    choices: ['분해된 릴레이션을 단순히 UNION으로 합칠 수 있으면 된다', '분해된 릴레이션의 공통 속성이 어느 한쪽의 키여야 한다', '분해된 릴레이션의 행 수 합이 원본과 같아야 한다', '분해된 릴레이션이 항상 같은 수의 컬럼을 가져야 한다'],
  },
  {
    id: 'q4_21', order: 21, type: 'short_answer',
    text: '트랜잭션의 ACID 속성 중, 트랜잭션이 완전히 수행되거나 전혀 수행되지 않아야 함을 보장하는 속성의 이름을 영문으로 쓰시오.',
    points: 8, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: 'Atomicity',
  },
  {
    id: 'q4_22', order: 22, type: 'short_answer',
    text: '데이터베이스에서 두 개 이상의 트랜잭션이 서로 상대방이 점유한 자원을 기다리며 무한정 대기하는 상황을 무엇이라 하는가?',
    points: 8, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: '데드락',
  },
  {
    id: 'q4_23', order: 23, type: 'short_answer',
    text: '쿼리 최적화 도구로, 특정 SQL의 실행 계획을 확인하기 위해 앞에 붙이는 키워드를 쓰시오.',
    points: 8, autoGrade: true, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: 'EXPLAIN',
  },
  {
    id: 'q4_24', order: 24, type: 'essay',
    text: '정규화(Normalization)의 목적과 단계(1NF~BCNF)를 설명하고, 과도한 정규화의 문제점과 역정규화(Denormalization)를 적용하는 상황을 구체적인 예시와 함께 서술하시오.',
    points: 10, autoGrade: false, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: null,
  },
  {
    id: 'q4_25', order: 25, type: 'essay',
    text: '대규모 서비스 환경에서 데이터베이스 성능을 향상시키기 위한 방법을 인덱스 전략, 캐싱, 읽기/쓰기 분리(Read Replica), 파티셔닝 관점에서 각각 설명하고, 실제 적용 시 고려해야 할 트레이드오프를 서술하시오.',
    points: 10, autoGrade: false, gradedCount: 0, totalCount: 0, avgScore: 0,
    correctAnswer: null,
  },
]

// quiz4 자동채점 정답 맵
const AUTO_CORRECT_Q4 = {
  q4_1: ['데이터베이스의 구조와 제약 조건을 정의한 명세'],
  q4_2: ['2NF 만족 + 이행적 함수 종속 제거'],
  q4_3: ['참', 'true'],
  q4_4: ['같은 트랜잭션 내에서 동일 쿼리를 반복할 때 이전에 없던 행이 나타나는 현상'],
  q4_5: ['일관성(Consistency), 가용성(Availability), 분할 내성(Partition Tolerance)', '일관성, 가용성, 분할 내성'],
  q4_6: ['참', 'true'],
  q4_7: ['모든 트랜잭션에 동일한 타임아웃 적용'],
  q4_8: ['Redis'],
  q4_9: ['거짓', 'false'],
  q4_10: ['준비된 구문(Prepared Statement) 사용'],
  q4_11: ['파티셔닝은 단일 DB 내 분할, 샤딩은 다수 DB 서버 간 분산'],
  q4_12: ['거짓', 'false'],
  q4_13: ['SERIALIZABLE'],
  q4_14: ['나누기(Division)'],
  q4_15: ['장애 발생 시 데이터 복구를 위한 트랜잭션 로그 기록'],
  q4_16: ['쿼리를 작성한 개발자의 경력'],
  q4_17: ['데이터 읽기 시 잠금 없이 이전 버전의 스냅샷을 제공'],
  q4_18: ['장애 발생 시 Standby로 전환되는 동안 일시적 서비스 중단 발생'],
  q4_19: ['외부 쿼리의 각 행에 대해 서브쿼리가 반복 실행'],
  q4_20: ['분해된 릴레이션의 공통 속성이 어느 한쪽의 키여야 한다'],
  q4_21: ['Atomicity', 'atomicity', '원자성'],
  q4_22: ['데드락', 'deadlock', 'Deadlock'],
  q4_23: ['EXPLAIN', 'explain'],
}

// quiz 7 — 5주차 서술형 과제 (정규화 단계 분석), 3문항 전부 서술형/수동채점
const mockQuiz7Questions = [
  {
    id: 'q7_1', order: 1, type: 'essay',
    text: '제1정규형(1NF), 제2정규형(2NF), 제3정규형(3NF)의 정의를 각각 서술하고, 각 정규형을 위반하는 예시를 들어 설명하시오.',
    points: 10, autoGrade: false, gradedCount: 60, totalCount: 117, avgScore: 7.8,
    correctAnswer: null,
  },
  {
    id: 'q7_2', order: 2, type: 'essay',
    text: '다음 릴레이션 스키마를 보고, 어떤 정규형을 위반하는지 판단하고, 완전한 정규화 과정을 단계별로 서술하시오.\n\n주문(주문번호, 고객번호, 고객명, 상품코드, 상품명, 수량, 단가)',
    points: 10, autoGrade: false, gradedCount: 60, totalCount: 117, avgScore: 7.2,
    correctAnswer: null,
  },
  {
    id: 'q7_3', order: 3, type: 'essay',
    text: '정규화의 장단점을 각각 2가지 이상 서술하고, 역정규화(Denormalization)가 필요한 상황을 구체적인 예시를 들어 설명하시오.',
    points: 10, autoGrade: false, gradedCount: 60, totalCount: 117, avgScore: 7.5,
    correctAnswer: null,
  },
]

// 퀴즈5 문항 (주차별 퀴즈 5-1 - ER 다이어그램, 총 20점 / 10문항)
export const mockQuiz5Questions = [
  {
    id: 'q5_1', order: 1, type: 'multiple_choice',
    text: 'ER 다이어그램에서 개체(Entity)를 나타내는 기호는?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.8,
    correctAnswer: '직사각형',
    choices: ['직사각형', '마름모', '타원', '이중 직사각형'],
  },
  {
    id: 'q5_2', order: 2, type: 'multiple_choice',
    text: 'ER 모델에서 관계(Relationship)를 표현하는 기호는?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.7,
    correctAnswer: '마름모',
    choices: ['직사각형', '마름모', '타원', '삼각형'],
  },
  {
    id: 'q5_3', order: 3, type: 'true_false',
    text: '약한 개체(Weak Entity)는 자체적으로 기본키를 가질 수 없으며, 소유 개체(Owner Entity)의 기본키에 의존한다.',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.5,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q5_4', order: 4, type: 'multiple_choice',
    text: '다음 중 ER 다이어그램에서 다중값 속성(Multivalued Attribute)을 나타내는 표기법은?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.4,
    correctAnswer: '이중 타원',
    choices: ['점선 타원', '이중 타원', '밑줄 있는 타원', '이중 직사각형'],
  },
  {
    id: 'q5_5', order: 5, type: 'multiple_choice',
    text: '학생(Student)과 과목(Course) 간의 수강 관계에서, 한 학생이 여러 과목을 수강하고 한 과목에 여러 학생이 등록할 수 있다면 이 관계의 카디널리티는?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.6,
    correctAnswer: 'M:N',
    choices: ['1:1', '1:N', 'M:N', 'N:1'],
  },
  {
    id: 'q5_6', order: 6, type: 'true_false',
    text: 'ER 다이어그램에서 파생 속성(Derived Attribute)은 다른 속성의 값으로부터 계산될 수 있는 속성이다.',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.7,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q5_7', order: 7, type: 'multiple_choice',
    text: 'ER 모델을 관계형 스키마로 변환할 때, M:N 관계는 어떻게 처리하는가?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.3,
    correctAnswer: '별도의 관계 테이블을 생성하여 양쪽 기본키를 외래키로 포함한다',
    choices: [
      '한쪽 테이블에 외래키를 추가한다',
      '별도의 관계 테이블을 생성하여 양쪽 기본키를 외래키로 포함한다',
      '두 테이블을 하나로 병합한다',
      '관계 속성만 별도 테이블로 분리한다',
    ],
  },
  {
    id: 'q5_8', order: 8, type: 'multiple_choice',
    text: 'ER 다이어그램에서 전체 참여(Total Participation)를 나타내는 표기법은?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.5,
    correctAnswer: '이중선(Double Line)',
    choices: ['점선', '이중선(Double Line)', '화살표', '굵은 단선'],
  },
  {
    id: 'q5_9', order: 9, type: 'short_answer',
    text: 'ER 다이어그램에서 개체의 속성 중 해당 개체를 유일하게 식별할 수 있는 속성을 무엇이라 하는가?',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.6,
    correctAnswer: '기본키(Primary Key)',
  },
  {
    id: 'q5_10', order: 10, type: 'multiple_answers',
    text: '다음 중 ER 다이어그램의 구성 요소에 해당하는 것을 모두 고르시오.',
    points: 2, autoGrade: true, gradedCount: 115, totalCount: 115, avgScore: 1.2,
    correctAnswer: '개체(Entity), 속성(Attribute), 관계(Relationship)',
    choices: ['개체(Entity)', '속성(Attribute)', '관계(Relationship)', '인덱스(Index)', '트리거(Trigger)'],
  },
]

// quiz5 자동채점 정답 맵
const AUTO_CORRECT_Q5 = {
  q5_1: ['직사각형'],
  q5_2: ['마름모'],
  q5_3: ['참', 'true'],
  q5_4: ['이중 타원'],
  q5_5: ['M:N', 'm:n', 'M대N', '다대다'],
  q5_6: ['참', 'true'],
  q5_7: ['별도의 관계 테이블을 생성하여 양쪽 기본키를 외래키로 포함한다'],
  q5_8: ['이중선(Double Line)', '이중선'],
  q5_9: ['기본키', 'Primary Key', '기본키(Primary Key)', 'PK'],
  q5_10: ['개체(Entity), 속성(Attribute), 관계(Relationship)'],
}

// 퀴즈6 문항 (5주차 형성평가 - 관계 대수, 총 10점 / 5문항)
export const mockQuiz6Questions = [
  {
    id: 'q6_1', order: 1, type: 'multiple_choice',
    text: '관계 대수에서 특정 조건을 만족하는 튜플(행)만 선택하는 연산은?',
    points: 2, autoGrade: true, gradedCount: 109, totalCount: 109, avgScore: 1.7,
    correctAnswer: '셀렉션(Selection, σ)',
    choices: ['프로젝션(Projection, π)', '셀렉션(Selection, σ)', '조인(Join, ⋈)', '디비전(Division, ÷)'],
  },
  {
    id: 'q6_2', order: 2, type: 'multiple_choice',
    text: '관계 대수에서 특정 속성(열)만 추출하는 연산은?',
    points: 2, autoGrade: true, gradedCount: 109, totalCount: 109, avgScore: 1.6,
    correctAnswer: '프로젝션(Projection, π)',
    choices: ['셀렉션(Selection, σ)', '프로젝션(Projection, π)', '카티션 곱(Cartesian Product, ×)', '합집합(Union, ∪)'],
  },
  {
    id: 'q6_3', order: 3, type: 'true_false',
    text: '관계 대수의 합집합(Union) 연산을 수행하려면 두 릴레이션의 차수(속성 수)와 도메인이 동일해야 한다.',
    points: 2, autoGrade: true, gradedCount: 109, totalCount: 109, avgScore: 1.5,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q6_4', order: 4, type: 'multiple_choice',
    text: '자연 조인(Natural Join)에 대한 설명으로 올바른 것은?',
    points: 2, autoGrade: true, gradedCount: 109, totalCount: 109, avgScore: 1.3,
    correctAnswer: '두 릴레이션에서 같은 이름의 속성 값이 같은 튜플을 결합하고, 중복 속성을 제거한다',
    choices: [
      '두 릴레이션의 모든 튜플을 조합하여 카티션 곱을 구한다',
      '두 릴레이션에서 같은 이름의 속성 값이 같은 튜플을 결합하고, 중복 속성을 제거한다',
      '한 릴레이션에만 존재하는 튜플을 반환한다',
      '두 릴레이션의 합집합을 구한 후 중복을 제거한다',
    ],
  },
  {
    id: 'q6_5', order: 5, type: 'short_answer',
    text: '관계 대수에서 두 릴레이션의 차집합(Difference)을 나타내는 기호를 쓰시오.',
    points: 2, autoGrade: true, gradedCount: 109, totalCount: 109, avgScore: 1.4,
    correctAnswer: '−',
  },
]

// quiz6 자동채점 정답 맵
const AUTO_CORRECT_Q6 = {
  q6_1: ['셀렉션(Selection, σ)', '셀렉션', 'Selection'],
  q6_2: ['프로젝션(Projection, π)', '프로젝션', 'Projection'],
  q6_3: ['참', 'true'],
  q6_4: ['두 릴레이션에서 같은 이름의 속성 값이 같은 튜플을 결합하고, 중복 속성을 제거한다'],
  q6_5: ['−', '-', '마이너스', 'minus'],
}

// 동적으로 추가되는 퀴즈 문항 저장소 (복사/가져오기 시 사용)
const quizQuestionsMap = {}

// 퀴즈 ID별 문항 반환 — GradingDashboard, QuizEdit에서 사용
export function getQuizQuestions(quizId) {
  if (quizId in quizQuestionsMap) return quizQuestionsMap[quizId]
  if (quizId === '1') return mockQuestions
  if (quizId === '2') return mockQuiz2Questions
  if (quizId === '3') return mockQuiz3Questions
  if (quizId === '4') return mockQuiz4Questions
  if (quizId === '5') return mockQuiz5Questions
  if (quizId === '6') return mockQuiz6Questions
  if (quizId === '7') return mockQuiz7Questions
  if (quizId === '8') return mockQuiz8Questions
  if (quizId === 'cs201_1') return mockCs201Quiz1Questions
  if (quizId === 'cs201_2') return mockCs201Quiz2Questions
  if (quizId === 'cs401_1') return mockCs401Quiz1Questions
  return []
}

// 복사/가져오기 시 새 quizId에 문항 등록
export function setQuizQuestions(quizId, questions) {
  quizQuestionsMap[quizId] = questions
}

// CS201 운영체제 — 중간고사 문항
const mockCs201Quiz1Questions = [
  {
    id: 'cs201_1_q1', order: 1, type: 'multiple_choice',
    text: '다음 중 프로세스(Process)와 스레드(Thread)의 차이점으로 올바른 것은?',
    points: 10, autoGrade: true,
    correctAnswer: '스레드는 프로세스의 메모리 공간을 공유하지만 프로세스는 독립적인 메모리 공간을 가진다',
    choices: [
      '스레드는 프로세스의 메모리 공간을 공유하지만 프로세스는 독립적인 메모리 공간을 가진다',
      '프로세스가 스레드보다 생성 비용이 낮다',
      '스레드는 독립적인 PCB를 가진다',
      '프로세스 간 통신은 스레드 간 통신보다 빠르다',
    ],
  },
  {
    id: 'cs201_1_q2', order: 2, type: 'multiple_choice',
    text: 'CPU 스케줄링에서 선점형(Preemptive) 방식이 아닌 것은?',
    points: 10, autoGrade: true,
    correctAnswer: 'FCFS (First-Come, First-Served)',
    choices: ['Round Robin', 'FCFS (First-Come, First-Served)', 'SRT (Shortest Remaining Time)', 'Priority Scheduling (Preemptive)'],
  },
  {
    id: 'cs201_1_q3', order: 3, type: 'true_false',
    text: '교착상태(Deadlock)는 자원 선점이 가능한 환경에서는 발생하지 않는다.',
    points: 5, autoGrade: true,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'cs201_1_q4', order: 4, type: 'short_answer',
    text: '프로세스가 CPU를 점유하지 않고 이벤트를 기다리는 상태를 무엇이라 하는가?',
    points: 10, autoGrade: false,
    correctAnswer: '대기(Waiting) 상태',
  },
  {
    id: 'cs201_1_q5', order: 5, type: 'essay',
    text: '세마포어(Semaphore)와 뮤텍스(Mutex)의 차이점을 설명하고, 각각 어떤 상황에서 사용하는 것이 적합한지 구체적인 예를 들어 서술하시오.',
    points: 20, autoGrade: false,
    correctAnswer: null,
  },
  {
    id: 'cs201_1_q6', order: 6, type: 'multiple_choice',
    text: '다음 중 교착상태 발생의 필요 조건이 아닌 것은?',
    points: 10, autoGrade: true,
    correctAnswer: '선점(Preemption)',
    choices: ['상호 배제(Mutual Exclusion)', '점유와 대기(Hold and Wait)', '선점(Preemption)', '순환 대기(Circular Wait)'],
  },
  {
    id: 'cs201_1_q7', order: 7, type: 'multiple_answers',
    text: '다음 중 프로세스 간 통신(IPC) 방법에 해당하는 것을 모두 고르시오.',
    points: 10, autoGrade: true,
    correctAnswer: '파이프(Pipe), 공유 메모리(Shared Memory), 메시지 큐(Message Queue)',
    choices: ['파이프(Pipe)', '공유 메모리(Shared Memory)', '메시지 큐(Message Queue)', '레지스터(Register)', '캐시(Cache)'],
  },
  {
    id: 'cs201_1_q8', order: 8, type: 'numerical',
    text: 'FCFS 스케줄링에서 도착 순서가 P1(버스트 8ms), P2(버스트 4ms), P3(버스트 9ms), P4(버스트 5ms)일 때 평균 대기 시간(ms)은?',
    points: 10, autoGrade: true,
    correctAnswer: '13.25',
  },
  {
    id: 'cs201_1_q9', order: 9, type: 'true_false',
    text: '스레드는 코드(Code), 데이터(Data), 힙(Heap) 영역을 공유하고 스택(Stack)은 독립적으로 가진다.',
    points: 5, autoGrade: true,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'cs201_1_q10', order: 10, type: 'essay',
    text: '페이지 교체 알고리즘 중 LRU(Least Recently Used)와 FIFO(First-In First-Out)를 비교하고, 벨라디의 이상 현상(Belady\'s Anomaly)이 발생하는 알고리즘과 그 원인을 설명하시오.',
    points: 10, autoGrade: false,
    correctAnswer: null,
  },
]

// CS201 운영체제 — 1차 형성평가 문항
const mockCs201Quiz2Questions = [
  {
    id: 'cs201_2_q1', order: 1, type: 'multiple_choice',
    text: 'Round Robin 스케줄링의 타임 퀀텀(Time Quantum)이 매우 클 경우 어떤 스케줄링과 동일해지는가?',
    points: 5, autoGrade: true,
    correctAnswer: 'FCFS',
    choices: ['SJF', 'FCFS', 'Priority Scheduling', 'Multilevel Queue'],
  },
  {
    id: 'cs201_2_q2', order: 2, type: 'true_false',
    text: 'SJF(Shortest Job First) 스케줄링은 평균 대기 시간을 최소화하는 최적 알고리즘이다.',
    points: 3, autoGrade: true,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'cs201_2_q3', order: 3, type: 'multiple_choice',
    text: '다음 중 기아(Starvation) 현상을 해결하기 위한 기법으로 가장 적절한 것은?',
    points: 5, autoGrade: true,
    correctAnswer: '에이징(Aging)',
    choices: ['에이징(Aging)', '라운드 로빈(Round Robin)', '멀티레벨 큐(Multilevel Queue)', 'FCFS'],
  },
  {
    id: 'cs201_2_q4', order: 4, type: 'multiple_choice',
    text: 'CPU 스케줄러가 준비 큐에서 프로세스를 선택하는 시점이 아닌 것은?',
    points: 5, autoGrade: true,
    correctAnswer: '프로세스가 I/O를 요청하여 대기 상태로 전환될 때',
    choices: [
      '실행 중인 프로세스가 종료될 때',
      '프로세스가 I/O를 요청하여 대기 상태로 전환될 때',
      '타임 슬라이스가 만료될 때',
      '인터럽트가 처리된 후 준비 큐에 프로세스가 추가될 때',
    ],
  },
  {
    id: 'cs201_2_q5', order: 5, type: 'short_answer',
    text: '준비(Ready) 상태의 프로세스가 CPU를 할당받아 실행 중인 상태로 전환되는 것을 무엇이라 하는가?',
    points: 3, autoGrade: false,
    correctAnswer: '디스패치(Dispatch)',
  },
  {
    id: 'cs201_2_q6', order: 6, type: 'multiple_answers',
    text: '선점형(Preemptive) 스케줄링 알고리즘에 해당하는 것을 모두 고르시오.',
    points: 5, autoGrade: true,
    correctAnswer: 'Round Robin, SRT, Preemptive Priority',
    choices: ['Round Robin', 'SRT (Shortest Remaining Time)', 'FCFS', 'Preemptive Priority', 'SJF (Non-preemptive)'],
  },
  {
    id: 'cs201_2_q7', order: 7, type: 'numerical',
    text: 'Round Robin(타임 퀀텀 4ms)에서 P1(10ms), P2(6ms), P3(4ms)가 동시에 도착할 때 P2의 완료 시간(ms)은?',
    points: 4, autoGrade: true,
    correctAnswer: '14',
  },
]

// CS401 알고리즘 — 중간고사 문항
const mockCs401Quiz1Questions = [
  {
    id: 'cs401_1_q1', order: 1, type: 'multiple_choice',
    text: '다음 중 최악의 경우(Worst Case) 시간복잡도가 O(n log n)인 정렬 알고리즘은?',
    points: 5, autoGrade: true,
    correctAnswer: '합병 정렬(Merge Sort)',
    choices: ['퀵 정렬(Quick Sort)', '합병 정렬(Merge Sort)', '버블 정렬(Bubble Sort)', '삽입 정렬(Insertion Sort)'],
  },
  {
    id: 'cs401_1_q2', order: 2, type: 'true_false',
    text: '퀵 정렬(Quick Sort)은 평균 O(n log n)이지만 최악의 경우 O(n²)의 시간복잡도를 가진다.',
    points: 5, autoGrade: true,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'cs401_1_q3', order: 3, type: 'multiple_choice',
    text: '안정 정렬(Stable Sort)에 해당하는 알고리즘으로만 묶인 것은?',
    points: 5, autoGrade: true,
    correctAnswer: '버블 정렬, 합병 정렬, 삽입 정렬',
    choices: [
      '버블 정렬, 합병 정렬, 삽입 정렬',
      '퀵 정렬, 합병 정렬, 힙 정렬',
      '선택 정렬, 퀵 정렬, 합병 정렬',
      '힙 정렬, 삽입 정렬, 선택 정렬',
    ],
  },
  {
    id: 'cs401_1_q4', order: 4, type: 'short_answer',
    text: '입력 배열이 거의 정렬된 상태일 때 가장 효율적인 정렬 알고리즘은 무엇인가?',
    points: 5, autoGrade: false,
    correctAnswer: '삽입 정렬(Insertion Sort)',
  },
  {
    id: 'cs401_1_q5', order: 5, type: 'essay',
    text: '힙 정렬(Heap Sort)의 동작 원리를 설명하고, 최선/평균/최악 시간복잡도를 분석하시오. 또한 퀵 정렬과 힙 정렬 중 실제 환경에서 더 빠른 이유를 설명하시오.',
    points: 15, autoGrade: false,
    correctAnswer: null,
  },
  {
    id: 'cs401_1_q6', order: 6, type: 'multiple_choice',
    text: '비교 기반 정렬 알고리즘의 이론적 하한선은?',
    points: 5, autoGrade: true,
    correctAnswer: 'O(n log n)',
    choices: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
  },
  {
    id: 'cs401_1_q7', order: 7, type: 'numerical',
    text: '크기 8인 배열을 합병 정렬로 정렬할 때 총 비교 횟수의 최댓값은? (n log n 기준)',
    points: 5, autoGrade: true,
    correctAnswer: '24',
  },
  {
    id: 'cs401_1_q8', order: 8, type: 'multiple_answers',
    text: '제자리 정렬(In-place Sort)에 해당하는 알고리즘을 모두 고르시오.',
    points: 5, autoGrade: true,
    correctAnswer: '버블 정렬, 삽입 정렬, 선택 정렬, 퀵 정렬, 힙 정렬',
    choices: ['버블 정렬', '삽입 정렬', '선택 정렬', '퀵 정렬', '힙 정렬', '합병 정렬', '기수 정렬'],
  },
  {
    id: 'cs401_1_q9', order: 9, type: 'true_false',
    text: '기수 정렬(Radix Sort)은 비교 기반 정렬 알고리즘이다.',
    points: 5, autoGrade: true,
    correctAnswer: '거짓',
    choices: ['참', '거짓'],
  },
  {
    id: 'cs401_1_q10', order: 10, type: 'multiple_choice',
    text: '퀵 정렬에서 피벗을 항상 배열의 첫 번째 원소로 선택할 때 최악의 경우가 발생하는 입력은?',
    points: 5, autoGrade: true,
    correctAnswer: '이미 정렬된 배열',
    choices: ['역순으로 정렬된 배열', '이미 정렬된 배열', '무작위 배열', '모든 원소가 동일한 배열'],
  },
]

// CS201_1 자동채점 정답 맵
const AUTO_CORRECT_CS201_1 = {
  cs201_1_q1: ['스레드는 프로세스의 메모리 공간을 공유하지만 프로세스는 독립적인 메모리 공간을 가진다'],
  cs201_1_q2: ['FCFS (First-Come, First-Served)', 'FCFS'],
  cs201_1_q3: ['참', 'true'],
  cs201_1_q6: ['선점(Preemption)', '선점'],
  cs201_1_q8: ['13.25'],
  cs201_1_q9: ['참', 'true'],
}

// CS201_2 자동채점 정답 맵
const AUTO_CORRECT_CS201_2 = {
  cs201_2_q1: ['FCFS'],
  cs201_2_q2: ['참', 'true'],
  cs201_2_q3: ['에이징(Aging)', '에이징', 'Aging'],
  cs201_2_q4: ['프로세스가 I/O를 요청하여 대기 상태로 전환될 때'],
  cs201_2_q7: ['14'],
}

// CS401_1 자동채점 정답 맵
const AUTO_CORRECT_CS401_1 = {
  cs401_1_q1: ['합병 정렬(Merge Sort)', '합병 정렬', 'Merge Sort'],
  cs401_1_q2: ['참', 'true'],
  cs401_1_q3: ['버블 정렬, 합병 정렬, 삽입 정렬'],
  cs401_1_q6: ['O(n log n)'],
  cs401_1_q7: ['24'],
  cs401_1_q9: ['거짓', 'false'],
  cs401_1_q10: ['이미 정렬된 배열'],
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

/**
 * 특정 문항 정답 변경 후 소급 재채점
 * - 이미 제출 완료된 응시: 자동 재채점 (수동 조정된 점수는 유지)
 * - 이후 응시 예정: 정답이 mockData에 반영되므로 자동 적용
 * - 현재 풀이 중 세션: localStorage에 미저장 상태이므로 자연히 미반영
 * @param {string} quizId
 * @param {object} updatedQuestion - 정답이 변경된 문항 객체
 * @returns {number} 재채점된 응시 건수
 */
export function regradeQuestion(quizId, updatedQuestion) {
  try {
    const raw = localStorage.getItem('xnq_student_attempts')
    if (!raw) return 0
    const all = JSON.parse(raw)
    const attempts = all[quizId]
    if (!attempts || attempts.length === 0) return 0

    const manualGradesRaw = localStorage.getItem('xnq_manual_grades')
    const manualGrades = manualGradesRaw ? JSON.parse(manualGradesRaw) : {}

    let count = 0
    attempts.forEach(attempt => {
      const answer = attempt.answers?.[updatedQuestion.id]
      if (answer === undefined) return // 해당 문항 응답 없음

      // 수동 조정된 점수가 있으면 재채점 제외
      const manualKey = `${attempt.studentId}_${quizId}_${updatedQuestion.id}`
      if (manualGrades[manualKey] !== undefined) return

      const quiz = mockQuizzes.find(q => q.id === quizId)
      const newScore = autoGradeAnswer(updatedQuestion, answer)
      if (newScore === null) return // 수동채점 필요 유형은 제외

      const oldScore = attempt.autoScores?.[updatedQuestion.id] ?? 0
      const diff = newScore - oldScore

      if (!attempt.autoScores) attempt.autoScores = {}
      attempt.autoScores[updatedQuestion.id] = newScore
      attempt.totalAutoScore = (attempt.totalAutoScore ?? 0) + diff
      count++
    })

    localStorage.setItem('xnq_student_attempts', JSON.stringify(all))
    return count
  } catch (err) {
    console.error('[xnquiz] 재채점 실패:', err)
    return 0
  }
}

/**
 * scorePolicy 변경 시 기존 응시 기록에 소급 적용
 * - 모든 응시 attempt의 scorePolicy 필드를 새 값으로 업데이트
 * - getStudentAttempts 호출 시 새 정책이 반영되어 최종 점수 재계산됨
 * @param {string} quizId
 * @param {string} newPolicy - '최고 점수 유지' | '평균 점수' | '최신 점수 유지'
 * @returns {number} 업데이트된 응시 건수
 */
export function recalculateScorePolicy(quizId, newPolicy) {
  try {
    const raw = localStorage.getItem('xnq_student_attempts')
    if (!raw) return 0
    const all = JSON.parse(raw)
    const attempts = all[quizId]
    if (!attempts || attempts.length === 0) return 0
    attempts.forEach(attempt => {
      attempt.scorePolicy = newPolicy
    })
    localStorage.setItem('xnq_student_attempts', JSON.stringify(all))
    return attempts.length
  } catch (err) {
    console.error('[xnquiz] scorePolicy 소급 재계산 실패:', err)
    return 0
  }
}

export function gradeQuiz3Answer(questionId, answer) {
  const correct = AUTO_CORRECT_Q3[questionId]
  if (!correct || !answer) return 0
  const question = mockQuiz3Questions.find(q => q.id === questionId)
  const points = question?.points ?? 2
  return correct.some(c => answer.trim().toLowerCase() === c.toLowerCase().trim()) ? points : 0
}

export function autoGradeAnswer(question, answer, options = {}) {
  if (!answer && answer !== 0) return 0

  // multiple_answers: 전역 설정(scoringMode + penaltyMethod) 기반 채점
  if (question.type === 'multiple_answers') {
    const opts = question.options || question.choices || []
    // correctAnswer: 인덱스 배열(신규) | 텍스트 배열 | 쉼표구분 문자열(기존 mock)
    let correctTexts
    if (Array.isArray(question.correctAnswer)) {
      correctTexts = typeof question.correctAnswer[0] === 'number'
        ? question.correctAnswer.map(i => opts[i]).filter(Boolean)
        : question.correctAnswer.map(s => String(s).trim())
    } else if (typeof question.correctAnswer === 'string') {
      correctTexts = question.correctAnswer.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      return null
    }
    if (correctTexts.length === 0) return null

    const studentSelected = String(answer).split(',').map(s => s.trim()).filter(Boolean)
    const correctSet = new Set(correctTexts.map(s => s.toLowerCase()))
    const gs = _getGlobalSettings()
    const scoringMode = gs.multipleAnswersScoringMode || question.scoringMode || 'all_correct'

    if (scoringMode === 'partial') {
      const correctCount = studentSelected.filter(s => correctSet.has(s.toLowerCase())).length
      const wrongCount = studentSelected.filter(s => !correctSet.has(s.toLowerCase())).length
      const totalChoices = opts.length || 4 // 선택지 총 수 (formula_scoring용)
      const penaltyMethod = gs.penaltyMethod || 'none'

      if (penaltyMethod === 'right_minus_wrong') {
        // 오답 차감 (Canvas 방식): (정답 수 - 오답 수) / 전체 정답 수 × 배점 (최소 0점)
        const raw = ((correctCount - wrongCount) / correctTexts.length) * question.points
        return Math.max(0, Math.round(raw * 2) / 2)
      }
      if (penaltyMethod === 'formula_scoring') {
        // 추측 보정 감점: (정답 수 - 오답 수/(선택지 수-1)) / 전체 정답 수 × 배점 (최소 0점)
        const divisor = Math.max(totalChoices - 1, 1)
        const raw = ((correctCount - wrongCount / divisor) / correctTexts.length) * question.points
        return Math.max(0, Math.round(raw * 2) / 2)
      }
      // 감점 없음: 정답 개수 / 전체 정답 수 × 배점
      return Math.round((correctCount / correctTexts.length) * question.points * 2) / 2
    } else {
      // all_correct: 정답 전체 선택 + 오답 미포함 시 만점, 그 외 0점
      const studentSet = new Set(studentSelected.map(s => s.toLowerCase()))
      const allCorrect = correctTexts.every(c => studentSet.has(c.toLowerCase()))
      const noWrong   = studentSelected.every(s => correctSet.has(s.toLowerCase()))
      return (allCorrect && noWrong) ? question.points : 0
    }
  }

  let correctMap
  if (question.id.startsWith('q2_')) correctMap = AUTO_CORRECT_Q2
  else if (question.id.startsWith('q3_')) correctMap = AUTO_CORRECT_Q3
  else if (question.id.startsWith('q4_')) correctMap = AUTO_CORRECT_Q4
  else if (question.id.startsWith('q5_')) correctMap = AUTO_CORRECT_Q5
  else if (question.id.startsWith('q6_')) correctMap = AUTO_CORRECT_Q6
  else if (question.id.startsWith('q8_')) correctMap = AUTO_CORRECT_Q8_MAP
  else if (question.id.startsWith('cs201_1_')) correctMap = AUTO_CORRECT_CS201_1
  else if (question.id.startsWith('cs201_2_')) correctMap = AUTO_CORRECT_CS201_2
  else if (question.id.startsWith('cs401_1_')) correctMap = AUTO_CORRECT_CS401_1
  else correctMap = AUTO_CORRECT_ANSWERS
  const correct = correctMap?.[question.id]
  if (!correct) return null // 수동채점 필요
  const gs = _getGlobalSettings()
  const isCorrect = gs.caseSensitive
    ? correct.some(c => String(answer).trim() === c.trim())
    : correct.some(c => String(answer).trim().toLowerCase() === c.toLowerCase().trim())
  return isCorrect ? question.points : 0
}

export function getStudentAnswer(studentIdx, questionId) {
  const pool = ANSWER_POOL[questionId] || ['답안 없음']
  const idNum = questionId.split('_').reduce((acc, p) => acc + parseInt(p.replace(/\D/g, '') || '0'), 0)
  return pool[(studentIdx * 3 + idNum) % pool.length]
}

export function isAnswerCorrect(answer, questionId) {
  let correctMap
  if (questionId.startsWith('q2_')) correctMap = AUTO_CORRECT_Q2
  else if (questionId.startsWith('q3_')) correctMap = AUTO_CORRECT_Q3
  else if (questionId.startsWith('q4_')) correctMap = AUTO_CORRECT_Q4
  else if (questionId.startsWith('q5_')) correctMap = AUTO_CORRECT_Q5
  else if (questionId.startsWith('q6_')) correctMap = AUTO_CORRECT_Q6
  else if (questionId.startsWith('q8_')) correctMap = AUTO_CORRECT_Q8_MAP
  else if (questionId.startsWith('cs201_1_')) correctMap = AUTO_CORRECT_CS201_1
  else if (questionId.startsWith('cs201_2_')) correctMap = AUTO_CORRECT_CS201_2
  else if (questionId.startsWith('cs401_1_')) correctMap = AUTO_CORRECT_CS401_1
  else correctMap = AUTO_CORRECT_ANSWERS
  const correct = correctMap?.[questionId]
  if (!correct) return null
  const gs = _getGlobalSettings()
  return gs.caseSensitive
    ? correct.some(c => String(answer).includes(c))
    : correct.some(c => String(answer).toLowerCase().includes(c.toLowerCase()))
}

// ── 문제은행 공유 데이터 (QuestionBankList, QuestionBank, QuizCreate, QuizEdit 공통 사용) ──


export const MOCK_COURSES = [
  { id: 'cs301', name: 'CS301 데이터베이스' },
  { id: 'cs201', name: 'CS201 운영체제' },
  { id: 'cs401', name: 'CS401 알고리즘' },
  { id: 'cs102', name: 'CS102 자료구조' },
]

export const MOCK_BANKS = [
  { id: 'bank1', name: 'DB 종합 문제집', course: 'CS301 데이터베이스', difficulty: '',       updatedAt: '2026-04-01', usedInQuizIds: ['1', '2'] },
  { id: 'bank2', name: 'SQL 심화',       course: 'CS301 데이터베이스', difficulty: 'high',   updatedAt: '2026-03-28', usedInQuizIds: ['1'] },
  { id: 'bank3', name: 'SQL 기초',       course: 'CS301 데이터베이스', difficulty: 'medium', updatedAt: '2026-03-20', usedInQuizIds: [] },
  { id: 'bank4', name: 'DB 입문',        course: 'CS301 데이터베이스', difficulty: 'low',    updatedAt: '2026-03-15', usedInQuizIds: [] },
  { id: 'bank5', name: '운영체제 종합',  course: 'CS201 운영체제',     difficulty: '',       updatedAt: '2026-03-10', usedInQuizIds: [] },
  { id: 'bank6', name: '알고리즘 심화',  course: 'CS401 알고리즘',     difficulty: 'high',   updatedAt: '2026-03-05', usedInQuizIds: [] },
]

export const MOCK_BANK_QUESTIONS = [
  // bank1: DB 종합 문제집 (난이도 미지정 — 혼합)
  { id: 'bq1',  bankId: 'bank1', type: 'multiple_choice', difficulty: 'low',    points: 5,  usageCount: 3,
    text: '관계형 데이터베이스에서 기본키(Primary Key)의 역할은?',
    options: ['각 행을 유일하게 식별한다', '테이블 간 관계를 정의한다', '데이터 타입을 지정한다', '인덱스를 자동 생성한다'],
    correctAnswer: 0 },
  { id: 'bq2',  bankId: 'bank1', type: 'multiple_choice', difficulty: 'medium', points: 5,  usageCount: 2,
    text: 'SQL에서 NULL 값을 비교할 때 올바른 방법은?',
    options: ['= NULL', 'IS NULL', '== NULL', 'EQUALS NULL'],
    correctAnswer: 1 },
  { id: 'bq3',  bankId: 'bank1', type: 'short_answer',    difficulty: 'high',   points: 10, usageCount: 1,
    text: '트랜잭션의 ACID 속성 중 Atomicity가 보장하는 것을 설명하시오.',
    correctAnswer: ['모두 실행되거나 모두 취소', '원자성', 'All or Nothing'] },
  { id: 'bq4',  bankId: 'bank1', type: 'true_false',      difficulty: 'low',    points: 3,  usageCount: 4,
    text: 'SELECT 쿼리는 데이터를 변경하지 않는다.',
    correctAnswer: true },
  { id: 'bq5',  bankId: 'bank1', type: 'essay',           difficulty: 'high',   points: 15, usageCount: 0,
    text: 'ERD(개체-관계 다이어그램)와 관계형 스키마의 차이를 설명하시오.',
    rubric: 'ERD는 개념적 모델(엔티티, 관계, 속성 표현), 관계형 스키마는 논리적 모델(테이블, 컬럼, 제약조건). 두 모델의 목적과 추상화 수준 차이를 명확히 서술할 것.' },
  { id: 'bq6',  bankId: 'bank1', type: 'multiple_choice', difficulty: 'medium', points: 5,  usageCount: 2,
    text: '정규화 과정에서 2NF(제2정규형)를 만족하려면 어떤 조건이 필요한가?',
    options: ['모든 속성이 원자값이어야 한다', '부분 함수 종속이 제거되어야 한다', '이행적 함수 종속이 제거되어야 한다', '모든 결정자가 후보키여야 한다'],
    correctAnswer: 1 },

  // bank2: SQL 심화 (난이도: 상 — 모든 문항이 상이어야 함)
  { id: 'bq7',  bankId: 'bank2', type: 'multiple_choice', difficulty: 'high',   points: 10, usageCount: 1,
    text: '서브쿼리와 JOIN 중 일반적으로 성능 측면에서 유리한 경우를 비교한 것으로 올바른 것은?',
    options: ['서브쿼리가 항상 더 빠르다', 'JOIN이 대부분의 경우 옵티마이저에 의해 더 효율적으로 처리된다', '둘의 성능 차이는 없다', '서브쿼리는 인덱스를 사용할 수 없다'],
    correctAnswer: 1 },
  { id: 'bq8',  bankId: 'bank2', type: 'essay',           difficulty: 'high',   points: 20, usageCount: 0,
    text: '인덱스가 쿼리 성능에 미치는 영향을 설명하고, 인덱스 생성 기준을 논하시오.',
    rubric: '인덱스의 B-Tree 구조 이해, 읽기 성능 향상 vs 쓰기 성능 저하 트레이드오프, 선택도(Selectivity) 높은 컬럼 우선, 복합 인덱스 순서의 중요성 등을 포함하여 서술.' },
  { id: 'bq9',  bankId: 'bank2', type: 'short_answer',    difficulty: 'high',   points: 10, usageCount: 2,
    text: 'EXPLAIN 명령어를 통해 쿼리 실행 계획에서 확인할 수 있는 주요 정보는?',
    correctAnswer: ['실행 계획', '인덱스 사용 여부', 'type, key, rows, Extra'] },
  { id: 'bq10', bankId: 'bank2', type: 'multiple_choice', difficulty: 'high',   points: 10, usageCount: 3,
    text: '다음 중 인덱스가 무시될 수 있는 상황으로 올바른 것은?',
    options: ['WHERE 절에 인덱스 컬럼을 직접 비교할 때', 'WHERE 절에서 인덱스 컬럼에 함수를 적용할 때', 'ORDER BY에 인덱스 컬럼을 사용할 때', 'JOIN 조건에 인덱스 컬럼을 사용할 때'],
    correctAnswer: 1 },
  { id: 'bq11', bankId: 'bank2', type: 'essay',           difficulty: 'high',   points: 20, usageCount: 0,
    text: '파티셔닝(Partitioning)과 샤딩(Sharding)의 개념 차이를 설명하시오.',
    rubric: '파티셔닝은 단일 DB 내에서 테이블 분할(수평/수직), 샤딩은 여러 DB 서버에 걸쳐 데이터 분산. 각각의 목적, 장단점, 적용 시나리오를 비교하여 서술.' },
  { id: 'bq12', bankId: 'bank2', type: 'short_answer',    difficulty: 'high',   points: 10, usageCount: 1,
    text: 'WITH 절(CTE)이 서브쿼리 대비 갖는 장점을 두 가지 이상 설명하시오.',
    correctAnswer: ['가독성 향상', '재사용 가능', '재귀 쿼리 지원'] },

  // bank3: SQL 기초 (난이도: 중 — 모든 문항이 중이어야 함)
  { id: 'bq13', bankId: 'bank3', type: 'multiple_choice',  difficulty: 'medium', points: 5, usageCount: 4,
    text: 'INNER JOIN과 LEFT JOIN의 결과 차이는 무엇인가?',
    options: ['INNER JOIN은 양쪽 모두 일치하는 행만 반환한다', 'LEFT JOIN은 오른쪽 테이블의 모든 행을 반환한다', 'INNER JOIN은 중복을 자동 제거한다', '차이가 없다'],
    correctAnswer: 0 },
  { id: 'bq14', bankId: 'bank3', type: 'multiple_choice',  difficulty: 'medium', points: 5, usageCount: 2,
    text: 'GROUP BY와 HAVING 절을 함께 사용하는 상황으로 올바른 것은?',
    options: ['개별 행을 필터링할 때', '그룹화된 결과에 조건을 적용할 때', '정렬 순서를 지정할 때', '테이블을 조인할 때'],
    correctAnswer: 1 },
  { id: 'bq15', bankId: 'bank3', type: 'short_answer',     difficulty: 'medium', points: 8, usageCount: 1,
    text: 'DISTINCT 키워드의 역할과 사용 예시를 작성하시오.',
    correctAnswer: ['중복 제거', '중복된 행을 제거하고 고유한 값만 반환'] },
  { id: 'bq16', bankId: 'bank3', type: 'multiple_choice',  difficulty: 'medium', points: 5, usageCount: 3,
    text: 'SELECT 쿼리의 논리적 실행 순서를 올바르게 나열한 것은?',
    options: ['SELECT → FROM → WHERE → GROUP BY', 'FROM → WHERE → GROUP BY → SELECT', 'FROM → SELECT → WHERE → ORDER BY', 'SELECT → WHERE → FROM → GROUP BY'],
    correctAnswer: 1 },
  { id: 'bq17', bankId: 'bank3', type: 'multiple_answers', difficulty: 'medium', points: 5, usageCount: 0,
    text: '다음 중 집계 함수(Aggregate Function)에 해당하는 것을 모두 고르시오.',
    options: ['COUNT', 'CONCAT', 'SUM', 'AVG', 'SUBSTRING', 'MAX'],
    correctAnswer: [0, 2, 3, 5], scoringMode: 'partial' },

  // bank4: DB 입문 (난이도: 하 — 모든 문항이 하이어야 함)
  { id: 'bq18', bankId: 'bank4', type: 'true_false',      difficulty: 'low',    points: 3, usageCount: 5,
    text: 'SQL에서 SELECT * 은 테이블의 모든 열을 조회한다.',
    correctAnswer: true },
  { id: 'bq19', bankId: 'bank4', type: 'multiple_choice', difficulty: 'low',    points: 3, usageCount: 3,
    text: 'WHERE 절에서 사용할 수 없는 연산자는?',
    options: ['=', '>', 'LIKE', 'GROUP'],
    correctAnswer: 3 },
  { id: 'bq20', bankId: 'bank4', type: 'multiple_choice', difficulty: 'low',    points: 3, usageCount: 2,
    text: 'CREATE TABLE 문에서 열의 데이터 타입을 지정하는 이유는?',
    options: ['저장 공간을 효율적으로 사용하고 데이터 무결성을 보장하기 위해', '테이블 이름을 지정하기 위해', '인덱스를 자동 생성하기 위해', '쿼리 속도를 높이기 위해'],
    correctAnswer: 0 },
  { id: 'bq21', bankId: 'bank4', type: 'true_false',      difficulty: 'low',    points: 3, usageCount: 1,
    text: 'DELETE 문은 테이블 구조(스키마)를 삭제한다.',
    correctAnswer: false },
  { id: 'bq22', bankId: 'bank4', type: 'short_answer',    difficulty: 'low',    points: 5, usageCount: 2,
    text: 'INSERT INTO 문의 기본 문법을 예시와 함께 작성하시오.',
    correctAnswer: ['INSERT INTO 테이블명 VALUES', 'INSERT INTO table_name (col1, col2) VALUES (val1, val2)'] },

  // bank5: 운영체제 종합 (난이도 미지정 — 혼합)
  { id: 'bq23', bankId: 'bank5', type: 'multiple_choice', difficulty: 'low',    points: 5,  usageCount: 3,
    text: '프로세스와 스레드의 가장 큰 차이점은?',
    options: ['스레드는 프로세스 내에서 메모리를 공유한다', '프로세스는 스레드보다 가볍다', '스레드는 독립적인 메모리 공간을 가진다', '프로세스는 동시에 실행될 수 없다'],
    correctAnswer: 0 },
  { id: 'bq24', bankId: 'bank5', type: 'multiple_choice', difficulty: 'medium', points: 5,  usageCount: 2,
    text: 'CPU 스케줄링 알고리즘 중 선점형(Preemptive)에 해당하는 것은?',
    options: ['FCFS (First-Come, First-Served)', 'SJF (Shortest Job First, 비선점)', 'Round Robin', 'Priority (비선점)'],
    correctAnswer: 2 },
  { id: 'bq25', bankId: 'bank5', type: 'essay',           difficulty: 'high',   points: 20, usageCount: 0,
    text: '교착 상태(Deadlock)의 발생 조건 4가지를 서술하고 각각 예시를 들어 설명하시오.',
    rubric: '상호 배제(Mutual Exclusion), 점유 대기(Hold and Wait), 비선점(No Preemption), 순환 대기(Circular Wait) 4가지 조건을 모두 서술하고, 각각 구체적인 예시를 제시할 것.' },
  { id: 'bq26', bankId: 'bank5', type: 'true_false',      difficulty: 'medium', points: 5,  usageCount: 1,
    text: 'LRU 페이지 교체 알고리즘은 가장 오래전에 사용된 페이지를 교체한다.',
    correctAnswer: true },
  { id: 'bq27', bankId: 'bank5', type: 'short_answer',    difficulty: 'high',   points: 10, usageCount: 1,
    text: '세마포어(Semaphore)와 뮤텍스(Mutex)의 차이를 설명하시오.',
    correctAnswer: ['세마포어는 카운팅 가능, 뮤텍스는 이진(0/1)만 가능', '뮤텍스는 소유권 개념이 있다'] },

  // bank6: 알고리즘 심화 (난이도: 상 — 모든 문항이 상이어야 함)
  { id: 'bq28', bankId: 'bank6', type: 'multiple_choice', difficulty: 'high',   points: 10, usageCount: 2,
    text: '다익스트라(Dijkstra) 알고리즘이 올바르게 동작하지 않는 경우는?',
    options: ['가중치가 모두 동일한 경우', '음의 가중치가 존재하는 경우', '방향 그래프인 경우', '사이클이 존재하는 경우'],
    correctAnswer: 1 },
  { id: 'bq29', bankId: 'bank6', type: 'essay',           difficulty: 'high',   points: 20, usageCount: 0,
    text: 'NP-완전(NP-Complete) 문제의 정의를 설명하고 대표적인 예시를 드시오.',
    rubric: 'NP에 속하면서 모든 NP 문제가 다항시간에 환원 가능한 문제. 대표 예시: SAT, TSP, 해밀턴 경로 등. P vs NP 관계에 대한 이해도 포함하여 평가.' },
  { id: 'bq30', bankId: 'bank6', type: 'short_answer',    difficulty: 'high',   points: 10, usageCount: 1,
    text: '동적 프로그래밍(DP)과 분할 정복(Divide & Conquer)의 차이를 비교하시오.',
    correctAnswer: ['DP는 중복 부분문제를 메모이제이션으로 해결', '분할 정복은 독립적 부분문제로 분할'] },
  { id: 'bq31', bankId: 'bank6', type: 'multiple_choice', difficulty: 'high',   points: 10, usageCount: 3,
    text: '다음 중 평균 시간복잡도가 O(n log n)인 정렬 알고리즘만 묶인 것은?',
    options: ['버블 정렬, 삽입 정렬', '퀵 정렬, 병합 정렬, 힙 정렬', '선택 정렬, 힙 정렬', '퀵 정렬, 버블 정렬'],
    correctAnswer: 1 },
  { id: 'bq32', bankId: 'bank6', type: 'essay',           difficulty: 'high',   points: 20, usageCount: 0,
    text: '그리디(Greedy) 알고리즘이 최적해를 보장하기 위한 조건을 설명하시오.',
    rubric: '탐욕적 선택 속성(Greedy Choice Property)과 최적 부분 구조(Optimal Substructure) 두 가지를 명확히 설명하고, 각각의 예시(활동 선택, 허프만 코딩 등)를 제시할 것.' },
]

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
const DEMO_NAMES = [
  '김민준','이서연','박지호','최유진','정다은','한승우','오지수','윤채원','임도현','강수아',
  '조현우','신예린','장하윤','권도윤','배수빈','홍지민','유하준','문서윤','송예준','양지아',
  '류건우','전소율','남지안','하도영','심채영','구민서','곽태현','안지원','성윤호','황서현',
  '노은채','서재원','엄시우','허윤아','추연우','진소희','나재민','봉예솔','변지환','고은서',
  '백승현','마하은','천시윤','탁민재','길예지','주연호','왕수현','옥하린','석도경','공유나',
  '편지율','위승민','부서진','빈채린','감하영','설민수','계도연','좌수민','방시원','판채은',
  '차은호','원예담','표지훈','복현서','국하윤','연수연','풍태은','제민지','야도윤','장서아',
  '김하진','이태윤','박나연','최건희','정수아','한지율','오예성','윤다윤','임서준','강하늘',
  '조채민','신유빈','장은호','권서진','배하율','홍민채','유도현','서하은','남윤서','하채린',
  '심도겸','구예원','곽시현','안태민','성지유','황도윤','노하영','엄수진','허건호','추예나',
  '진민혁','나서율','봉지현','변하은','고태영','백서윤','마도현','천예림','탁수아','길현준',
  '주하린','왕도영','옥민서','석채원','공시윤','편도현','위예진','부하준','빈태윤','감서현',
]

const DEMO_DEPARTMENTS = [
  '컴퓨터공학과','소프트웨어학과','정보통신공학과','데이터사이언스학과',
  '전자공학과','인공지능학과','사이버보안학과','산업공학과',
]

const DEMO_YEARS = ['2021','2022','2023','2024']

// Quiz 1 학생: 87명 (82명 제출, 5명 미제출)
export const mockStudents = Array.from({ length: 87 }, (_, i) => {
  // 마지막 5명은 미제출
  if (i >= 82) {
    return {
      id: `s${i + 1}`,
      studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
      score: null,
      startTime: null,
      endTime: null,
      submitted: false,
      submittedAt: null,
      response: null,
      autoScores: {},
      manualScores: null,
    }
  }
  return {
    id: `s${i + 1}`,
    studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
    name: DEMO_NAMES[i % DEMO_NAMES.length],
    department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
    score: i < 45 ? TOTAL_SCORES[i % TOTAL_SCORES.length] : null,
    startTime: '2026-04-03 09:00',
    endTime: '2026-04-03 10:' + String(20 + (i % 40)).padStart(2, '0'),
    submitted: true,
    submittedAt: `2026-04-03 10:${String(20 + (i % 40)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
    response: i < 45
      ? ['외래키', 'Foreign Key', '참조키', '외부키', 'FK'][i % 5]
      : ['외래키입니다', '두 테이블을 연결하는 키', 'Foreign Key라고도 합니다', '참조 무결성을 보장하는 키'][i % 4],
    autoScores: {
      q1:  [5,  5,  5,  5,  0 ][i % 5],
      q2:  [5,  5,  0,  5,  5 ][i % 5],
      q4:  [10, 10, 5,  10, 0 ][i % 5],
      q6:  [5,  5,  5,  0,  5 ][i % 5],
      q9:  [10, 10, 10, 10, 0 ][i % 5],
      q10: [10, 8,  10, 6,  10][i % 5],
    },
    manualScores: i < 45 ? {
      q3: FIXED_SCORES[i % 45],
      q5: Q5_SCORES[i % 12],
      q7: Q7_SCORES[i % 12],
      q8: Q8_SCORES[i % 12],
    } : null,
  }
})

// ── 퀴즈 8: 2차 형성평가 - 데이터베이스 설계 & 정규화 (10문항, 50점) ──────────────────

export const mockQuiz8Questions = [
  {
    id: 'q8_1', order: 1, type: 'multiple_choice',
    text: '1NF(제1정규형)의 기본 요구 사항은?',
    points: 3, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 2.7,
    correctAnswer: '원자값으로만 구성된 도메인',
    choices: ['원자값으로만 구성된 도메인', '부분 함수적 종속 제거', '이행적 함수 종속 제거', 'BCNF 만족'],
  },
  {
    id: 'q8_2', order: 2, type: 'multiple_choice',
    text: 'NULL 값에 대한 설명으로 틀린 것은?',
    points: 3, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 2.4,
    correctAnswer: '정수 0과 동일한 값이다',
    choices: ['값이 존재하지 않음을 의미한다', '아직 알려지지 않은 값을 나타낸다', '정수 0과 동일한 값이다', 'IS NULL로 비교해야 한다'],
  },
  {
    id: 'q8_3', order: 3, type: 'true_false',
    text: '슈퍼키(Super Key)는 릴레이션의 모든 튜플을 유일하게 식별할 수 있다.',
    points: 2, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.7,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q8_4', order: 4, type: 'multiple_choice',
    text: '2NF 위반의 직접적인 원인이 되는 것은?',
    points: 3, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.95,
    correctAnswer: '부분 함수 종속',
    choices: ['완전 함수 종속', '부분 함수 종속', '이행적 함수 종속', '다치 종속'],
  },
  {
    id: 'q8_5', order: 5, type: 'multiple_choice',
    text: 'ER 다이어그램에서 약한 엔티티(Weak Entity)가 존재하기 위해 반드시 필요한 것은?',
    points: 3, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.8,
    correctAnswer: '식별 관계(Identifying Relationship)',
    choices: ['기본키', '식별 관계(Identifying Relationship)', '다중값 속성', '파생 속성'],
  },
  {
    id: 'q8_6', order: 6, type: 'true_false',
    text: 'BCNF를 만족하는 릴레이션은 반드시 3NF를 만족한다.',
    points: 2, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.1,
    correctAnswer: '참',
    choices: ['참', '거짓'],
  },
  {
    id: 'q8_7', order: 7, type: 'multiple_choice',
    text: '함수 종속 A→B, B→C가 성립할 때 A→C가 성립하는 현상을 무엇이라 하는가?',
    points: 4, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.8,
    correctAnswer: '이행적 함수 종속',
    choices: ['완전 함수 종속', '부분 함수 종속', '이행적 함수 종속', '다치 종속'],
  },
  {
    id: 'q8_8', order: 8, type: 'multiple_choice',
    text: '무손실 분해(Lossless Decomposition)의 조건으로 옳은 것은?',
    points: 5, autoGrade: true, gradedCount: 116, totalCount: 116, avgScore: 1.875,
    correctAnswer: '분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다',
    choices: [
      '분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다',
      '분해된 릴레이션의 행 수가 동일해야 한다',
      '분해된 릴레이션의 속성 수가 동일해야 한다',
      '분해된 릴레이션이 같은 도메인을 가져야 한다',
    ],
  },
  {
    id: 'q8_9', order: 9, type: 'short_answer',
    text: '정규화 과정에서 제거하고자 하는 데이터 이상(Anomaly)의 종류 3가지를 모두 쓰시오.',
    points: 10, autoGrade: false, gradedCount: 116, totalCount: 116, avgScore: 8.3,
    correctAnswer: '삽입 이상, 삭제 이상, 갱신 이상',
  },
  {
    id: 'q8_10', order: 10, type: 'essay',
    text: '1NF부터 BCNF까지 정규화의 각 단계를 정의하고, 예시 테이블을 활용하여 각 단계로 분해하는 과정을 서술하시오.',
    points: 15, autoGrade: false, gradedCount: 116, totalCount: 116, avgScore: 11.2,
    correctAnswer: null,
  },
]

const AUTO_CORRECT_Q8_MAP = {
  q8_1: ['원자값으로만 구성된 도메인'],
  q8_2: ['정수 0과 동일한 값이다'],
  q8_3: ['참', 'true'],
  q8_4: ['부분 함수 종속'],
  q8_5: ['식별 관계(Identifying Relationship)'],
  q8_6: ['참', 'true'],
  q8_7: ['이행적 함수 종속'],
  q8_8: ['분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다'],
}

// 퀴즈 8 학생별 수동채점 점수 풀
const S8_Q9  = [6, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10]   // mean ≈ 8.33
const S8_Q10 = [8, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 13, 13, 14, 15] // mean ≈ 11.2

// 퀴즈 8 오답 선택지 (정답 아닌 것들)
const Q8_WRONG = {
  q8_1: ['부분 함수적 종속 제거', '이행적 함수 종속 제거', 'BCNF 만족'],
  q8_2: ['값이 존재하지 않음을 의미한다', '아직 알려지지 않은 값을 나타낸다', 'IS NULL로 비교해야 한다'],
  q8_3: ['거짓'],
  q8_4: ['완전 함수 종속', '이행적 함수 종속', '다치 종속'],
  q8_5: ['기본키', '다중값 속성', '파생 속성'],
  q8_6: ['거짓'],
  q8_7: ['완전 함수 종속', '부분 함수 종속', '다치 종속'],
  q8_8: ['분해된 릴레이션의 행 수가 동일해야 한다', '분해된 릴레이션의 속성 수가 동일해야 한다', '분해된 릴레이션이 같은 도메인을 가져야 한다'],
}

export const mockStudents8 = Array.from({ length: 120 }, (_, i) => {
  // 마지막 4명은 미제출
  if (i >= 116) {
    return {
      id: `s8_${i + 1}`,
      studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
      score: null, startTime: null, endTime: null, submitted: false, submittedAt: null,
      response: null, autoScores: {}, manualScores: null, selections: {},
    }
  }
  // 자동채점 점수 (난이도별 정답률 반영)
  const a1 = i % 10 !== 9  ? 3 : 0    // ~90% 정답 (쉬움)
  const a2 = i % 5  < 4    ? 3 : 0    // 80% 정답 (쉬움)
  const a3 = i % 20 < 17   ? 2 : 0    // 85% 정답 (쉬움)
  const a4 = i % 20 < 13   ? 3 : 0    // 65% 정답 (중간)
  const a5 = i % 5  < 3    ? 3 : 0    // 60% 정답 (중간)
  const a6 = i % 20 < 11   ? 2 : 0    // 55% 정답 (중간)
  const a7 = i % 20 < 9    ? 4 : 0    // 45% 정답 (어려움)
  const a8 = i % 8  < 3    ? 5 : 0    // ~37.5% 정답 (어려움)
  const m9  = S8_Q9[i % 15]
  const m10 = S8_Q10[i % 15]
  const autoTotal = a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8
  const total = autoTotal + m9 + m10
  const hour = 9 + Math.floor(((i * 7) % 480) / 60)
  const min  = (i * 7) % 60
  const timeStr = `${String(Math.min(hour, 17)).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  return {
    id: `s8_${i + 1}`,
    studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
    name: DEMO_NAMES[i % DEMO_NAMES.length],
    department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
    score: total,
    startTime: '2026-03-31 09:00',
    endTime: `2026-03-31 ${timeStr}`,
    submitted: true,
    submittedAt: `2026-03-31 ${timeStr}:${String((i * 17) % 60).padStart(2, '0')}`,
    response: ['삽입 이상, 삭제 이상, 갱신 이상', '삽입이상, 삭제이상, 갱신이상', '삽입 이상과 삭제 이상, 갱신 이상'][i % 3],
    autoScores: { q8_1: a1, q8_2: a2, q8_3: a3, q8_4: a4, q8_5: a5, q8_6: a6, q8_7: a7, q8_8: a8 },
    manualScores: { q8_9: m9, q8_10: m10 },
    selections: {
      q8_1: a1 > 0 ? '원자값으로만 구성된 도메인' : Q8_WRONG.q8_1[i % 3],
      q8_2: a2 > 0 ? '정수 0과 동일한 값이다' : Q8_WRONG.q8_2[i % 3],
      q8_3: a3 > 0 ? '참' : '거짓',
      q8_4: a4 > 0 ? '부분 함수 종속' : Q8_WRONG.q8_4[i % 3],
      q8_5: a5 > 0 ? '식별 관계(Identifying Relationship)' : Q8_WRONG.q8_5[i % 3],
      q8_6: a6 > 0 ? '참' : '거짓',
      q8_7: a7 > 0 ? '이행적 함수 종속' : Q8_WRONG.q8_7[i % 3],
      q8_8: a8 > 0 ? '분해된 릴레이션의 공통 속성이 어느 한쪽의 슈퍼키여야 한다' : Q8_WRONG.q8_8[i % 3],
    },
  }
})

// 결정론적 해시 — 학생 인덱스 + 문항 인덱스 기반으로 정답률 패턴 생성
function _seedHash(i, j) { return ((i * 2654435761 + j * 2246822519) >>> 0) % 100 }

// 퀴즈별 학생 팩토리 — metadata와 정합성 유지
function generateStudents(total, submitted, graded, prefix, _baseYear = '2022', startDate = '2026-03-20', questions = []) {
  // 난이도별 정답률 테이블 (문항 순서 기반)
  const difficultyRates = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 70, 65, 55, 75, 60, 50, 70, 65, 55, 80, 60, 50, 45, 40]

  // 수동채점 문항별 점수 패턴 풀 (배점 비율)
  const MANUAL_RATIOS = [0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.65, 0.7, 0.8, 0.9, 0.95, 0.55, 0.7, 0.8, 0.85]

  return Array.from({ length: total }, (_, i) => {
    const isSubmitted = i < submitted
    const isGraded = isSubmitted && i < graded

    // 미제출 학생
    if (!isSubmitted) {
      return {
        id: `${prefix}${i + 1}`,
        studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
        name: DEMO_NAMES[i % DEMO_NAMES.length],
        department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
        score: null, startTime: null, endTime: null, submitted: false, submittedAt: null,
        response: null, autoScores: {}, manualScores: null, selections: {},
      }
    }

    // 제출 학생: 문항별 점수/선택지 생성
    const autoScores = {}
    const manualScores = {}
    const selections = {}
    let hasManual = false

    questions.forEach((q, j) => {
      const rate = difficultyRates[j % difficultyRates.length]
      const hash = _seedHash(i, j)
      const isCorrect = hash < rate

      if (q.autoGrade === true || q.autoGrade === 'partial') {
        // 자동채점 문항
        autoScores[q.id] = isCorrect ? q.points : 0

        // selections: 객관식/참거짓은 보기에서 선택, 단답/수치형은 ANSWER_POOL에서 가져옴
        if (q.choices && q.choices.length > 0) {
          if (isCorrect) {
            selections[q.id] = q.correctAnswer
          } else {
            const wrongChoices = q.choices.filter(c => c !== q.correctAnswer)
            selections[q.id] = wrongChoices[(i + j) % wrongChoices.length] || q.choices[0]
          }
        } else {
          // 단답/수치형 — ANSWER_POOL 활용
          const pool = ANSWER_POOL[q.id]
          if (pool) {
            selections[q.id] = isCorrect ? pool[0] : pool[(1 + (i + j) % (pool.length - 1)) % pool.length]
          } else {
            selections[q.id] = isCorrect ? (q.correctAnswer || '정답') : '오답'
          }
        }
      } else {
        // 수동채점 문항 (essay, short_answer with autoGrade: false)
        hasManual = true
        if (isGraded) {
          const ratio = MANUAL_RATIOS[(i + j) % MANUAL_RATIOS.length]
          manualScores[q.id] = Math.round(q.points * ratio)
        }
        // selections: ANSWER_POOL에서 서술형 답안 선택
        const pool = ANSWER_POOL[q.id]
        if (pool) {
          selections[q.id] = pool[(i + j) % pool.length]
        } else {
          selections[q.id] = '답안 내용입니다.'
        }
      }
    })

    const autoTotal = Object.values(autoScores).reduce((a, b) => a + b, 0)
    const manualTotal = isGraded ? Object.values(manualScores).reduce((a, b) => a + b, 0) : 0
    const totalScore = isGraded ? autoTotal + manualTotal : null

    // 첫 번째 수동채점 문항의 response 값 설정
    const firstManualQ = questions.find(q => q.autoGrade === false)
    let response = null
    if (firstManualQ) {
      response = selections[firstManualQ.id] || '답안 내용입니다.'
    } else {
      // 수동채점 문항이 없으면 마지막 문항의 selection 사용
      const lastQ = questions[questions.length - 1]
      response = lastQ ? (selections[lastQ.id] || '답안') : '답안'
    }

    return {
      id: `${prefix}${i + 1}`,
      studentId: `${DEMO_YEARS[i % DEMO_YEARS.length]}${String(i + 1001).slice(1)}`,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      department: DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length],
      score: totalScore,
      startTime: `${startDate} 09:00`,
      endTime: `${startDate} 10:${String(20 + (i % 40)).padStart(2, '0')}`,
      submitted: true,
      submittedAt: `${startDate} 10:${String(20 + (i % 40)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      response,
      autoScores,
      manualScores: (isGraded && hasManual) ? manualScores : (hasManual ? null : manualScores),
      selections,
    }
  })
}

// 퀴즈 ID별 학생 데이터 반환
const studentCache = {}
export function getQuizStudents(quizId) {
  if (quizId === '1') return mockStudents
  if (quizId === '8') return mockStudents8
  if (studentCache[quizId]) return studentCache[quizId]

  const quiz = mockQuizzes.find(q => q.id === quizId)
  if (!quiz) return mockStudents

  const dateStr = quiz.startDate?.split(' ')[0] || '2026-03-20'
  const yearPrefix = ['cs201_1', 'cs201_2', 'cs201_3'].includes(quizId) ? '2024'
    : ['cs401_1', 'cs401_2'].includes(quizId) ? '2023' : '2022'
  const questions = getQuizQuestions(quizId)
  const students = generateStudents(quiz.totalStudents, quiz.submitted, quiz.graded, `${quizId}_s`, yearPrefix, dateStr, questions)
  studentCache[quizId] = students
  return students
}
