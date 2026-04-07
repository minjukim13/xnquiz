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
    description: 'ERD 설계, SQL 쿼리 작성, 정규화 전 범위를 다룹니다. 오픈북 불가, 제한 시간 내 제출하세요.',
    course: 'CS301 데이터베이스',
    status: 'grading',
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
  },
  {
    id: '2',
    title: '1차 형성평가 - SQL 기초',
    description: 'SELECT, WHERE, JOIN 등 SQL 기초 구문을 다룹니다. 강의 3~4주차 내용 기반으로 출제됩니다.',
    course: 'CS301 데이터베이스',
    status: 'closed',
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
  },
  {
    id: '3',
    title: '주차별 퀴즈 4 - 인덱스와 쿼리 최적화',
    course: 'CS301 데이터베이스',
    status: 'open',
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
    timeLimit: 120,
    scorePolicy: '최고 점수 유지',
    allowAttempts: 1,
  },
  {
    id: '5',
    title: '주차별 퀴즈 5-1 - ER 다이어그램',
    course: 'CS301 데이터베이스',
    status: 'closed',
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
  },
  {
    id: '6',
    title: '5주차 형성평가 - 관계 대수',
    course: 'CS301 데이터베이스',
    status: 'closed',
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
  },
  {
    id: '7',
    title: '5주차 서술형 과제 - 정규화 단계 분석',
    course: 'CS301 데이터베이스',
    status: 'grading',
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
  },
  {
    id: '8',
    title: '2차 형성평가 - 데이터베이스 설계 & 정규화',
    description: '관계형 데이터베이스 설계 원칙과 1NF~3NF 정규화 과정을 평가합니다. 강의 6~7주차 내용 기반으로 출제됩니다.',
    course: 'CS301 데이터베이스',
    status: 'closed',
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

// 퀴즈 ID별 문항 반환 — GradingDashboard에서 사용
export function getQuizQuestions(quizId) {
  if (quizId === '1') return mockQuestions
  if (quizId === '2') return mockQuiz2Questions
  if (quizId === '3') return mockQuiz3Questions
  if (quizId === '4') return mockQuiz4Questions
  if (quizId === '8') return mockQuiz8Questions
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
  let correctMap
  if (question.id.startsWith('q2_')) correctMap = AUTO_CORRECT_Q2
  else if (question.id.startsWith('q3_')) correctMap = AUTO_CORRECT_Q3
  else if (question.id.startsWith('q4_')) correctMap = AUTO_CORRECT_Q4
  else if (question.id.startsWith('q8_')) correctMap = AUTO_CORRECT_Q8_MAP
  else correctMap = AUTO_CORRECT_ANSWERS
  const correct = correctMap?.[question.id]
  if (!correct) return null // 수동채점 필요
  const isCorrect = correct.some(c => String(answer).trim().toLowerCase() === c.toLowerCase().trim())
  return isCorrect ? question.points : 0
}

export function getStudentAnswer(studentIdx, questionId) {
  const pool = ANSWER_POOL[questionId] || ['답안 없음']
  const idNum = questionId.split('_').reduce((acc, p) => acc + parseInt(p.replace(/\D/g, '') || '0'), 0)
  return pool[(studentIdx * 3 + idNum) % pool.length]
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

export const MOCK_COURSES = [
  { id: 'cs301', name: 'CS301 데이터베이스' },
  { id: 'cs201', name: 'CS201 운영체제' },
  { id: 'cs401', name: 'CS401 알고리즘' },
  { id: 'cs102', name: 'CS102 자료구조' },
]

export const MOCK_BANKS = [
  { id: 'bank1', name: 'DB 기초',       course: 'CS301 데이터베이스', updatedAt: '2026-03-20', usedInQuizIds: ['1', '2'] },
  { id: 'bank2', name: 'SQL 심화',      course: 'CS301 데이터베이스', updatedAt: '2026-03-24', usedInQuizIds: ['1'] },
  { id: 'bank3', name: '프로세스 관리', course: 'CS201 운영체제',     updatedAt: '2026-03-15', usedInQuizIds: [] },
  { id: 'bank4', name: '메모리 관리',   course: 'CS201 운영체제',     updatedAt: '2026-03-10', usedInQuizIds: [] },
  { id: 'bank5', name: '정렬 알고리즘', course: 'CS401 알고리즘',     updatedAt: '2026-02-28', usedInQuizIds: [] },
  { id: 'bank6', name: '그래프 탐색',   course: 'CS401 알고리즘',     updatedAt: '2026-03-05', usedInQuizIds: [] },
  { id: 'bank7', name: '선형 자료구조', course: 'CS102 자료구조',     updatedAt: '2026-02-20', usedInQuizIds: [] },
  { id: 'bank8', name: '트리 및 해시',  course: 'CS102 자료구조',     updatedAt: '2026-02-25', usedInQuizIds: [] },
]

const BANK_GROUP_MAP = {
  bank1: ['1단원 - 관계형 모델', '2단원 - SQL 기초', '3단원 - 정규화', '4단원 - 트랜잭션'],
  bank2: ['기본 쿼리', '조인 및 서브쿼리', '인덱스 최적화', '뷰 및 저장 프로시저'],
  bank3: ['프로세스 개념', '스케줄링', '동기화', '교착 상태'],
  bank4: ['메모리 기초', '가상 메모리', '페이지 교체', '세그멘테이션'],
  bank5: ['시간복잡도', '비교 기반 정렬', '비교 비기반 정렬', '정렬 응용'],
  bank6: ['그래프 기초', 'BFS/DFS', '최단 경로', '최소 신장 트리'],
  bank7: ['배열과 연결 리스트', '스택과 큐', '덱', '해시 기초'],
  bank8: ['이진 트리', 'BST', '힙', '해시 테이블'],
}
export const BANK_GROUP_MAP_EXPORTED = BANK_GROUP_MAP
const DIFFICULTIES = ['high', 'medium', 'low']

const BANK_IDS = ['bank1', 'bank2', 'bank3', 'bank4', 'bank5', 'bank6', 'bank7', 'bank8']

export const MOCK_BANK_QUESTIONS = Array.from({ length: 120 }, (_, i) => {
  const bankId = BANK_IDS[i % 8]
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
  submittedAt: `2026-03-20 10:${String(20 + (i % 40)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
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

export const mockStudents8 = Array.from({ length: 116 }, (_, i) => {
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
    studentId: `2023${String(i + 1001).slice(1)}`,
    name: DEMO_NAMES[i % 12] + (i > 11 ? `-${Math.floor(i / 12) + 1}` : ''),
    department: ['컴퓨터공학과', '소프트웨어학과', '정보통신공학과', '데이터사이언스학과'][i % 4],
    score: total,
    startTime: '2026-03-31 09:00',
    endTime: `2026-03-31 ${timeStr}`,
    submitted: true,
    submittedAt: `2026-03-31 ${timeStr}:${String((i * 17) % 60).padStart(2, '0')}`,
    response: ['삽입 이상, 삭제 이상, 갱신 이상', '삽입이상, 삭제이상, 갱신이상', '삽입 이상과 삭제 이상, 갱신 이상'][i % 3],
    autoScores: { q8_1: a1, q8_2: a2, q8_3: a3, q8_4: a4, q8_5: a5, q8_6: a6, q8_7: a7, q8_8: a8 },
    manualScores: { q8_9: m9, q8_10: m10 },
  }
})

// 퀴즈 ID별 학생 데이터 반환
export function getQuizStudents(quizId) {
  if (quizId === '8') return mockStudents8
  return mockStudents
}
