// Quiz 응답 매퍼
// Prisma Quiz + 집계 → 프론트 mockQuizzes 호환 구조로 변환
import type { Quiz, Course, ScorePolicy } from '@prisma/client'

export function scorePolicyLabel(policy: ScorePolicy): string {
  switch (policy) {
    case 'KEEP_HIGHEST': return '최고 점수 유지'
    case 'KEEP_LATEST':  return '최신 점수 유지'
    case 'KEEP_AVERAGE': return '평균 점수'
    default:             return '최고 점수 유지'
  }
}

/** mockData 한글 라벨 → enum (쓰기 API 용) */
export function scorePolicyFromLabel(label?: string | null): ScorePolicy {
  if (label === '최신 점수 유지') return 'KEEP_LATEST'
  if (label === '평균 점수')       return 'KEEP_AVERAGE'
  return 'KEEP_HIGHEST' // 기본값
}

export type QuizStats = {
  totalStudents: number | null
  submitted: number | null
  graded: number | null
  pendingGrade: number | null
  questions: number
  totalPoints: number
  avgScore: number | null
}

export type QuizWithCourse = Quiz & { course: Course }

export function toQuizResponse(quiz: QuizWithCourse, stats: QuizStats) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? undefined,

    // 과목 — 분리 필드 + 합친 레이블(mockData 호환)
    courseCode: quiz.courseCode,
    courseName: quiz.course.name,
    course: `${quiz.courseCode} ${quiz.course.name}`,

    status: quiz.status,
    visible: quiz.visible,
    hasFileUpload: quiz.hasFileUpload,

    // 일정
    createdAt: quiz.createdAt.toISOString(),
    startDate: quiz.startDate?.toISOString() ?? null,
    dueDate:   quiz.dueDate?.toISOString()   ?? null,
    lockDate:  quiz.lockDate?.toISOString()  ?? null,

    // 주차/회차
    week:    quiz.week,
    session: quiz.session,

    // 응시 설정
    timeLimit:          quiz.timeLimit,
    scorePolicy:        scorePolicyLabel(quiz.scorePolicy),
    allowAttempts:      quiz.allowAttempts,

    // 성적 공개
    scoreRevealEnabled: quiz.scoreRevealEnabled,
    scoreRevealScope:   quiz.scoreRevealScope,
    scoreRevealTiming:  quiz.scoreRevealTiming,
    scoreRevealStart:   quiz.scoreRevealStart?.toISOString() ?? null,
    scoreRevealEnd:     quiz.scoreRevealEnd?.toISOString()   ?? null,

    // 지각 제출
    allowLateSubmit:    quiz.allowLateSubmit,
    lateSubmitDeadline: quiz.lateSubmitDeadline?.toISOString() ?? null,

    // 집계 (실시간)
    totalStudents: stats.totalStudents,
    submitted:     stats.submitted,
    graded:        stats.graded,
    pendingGrade:  stats.pendingGrade,
    questions:     stats.questions,
    totalPoints:   stats.totalPoints,
    avgScore:      stats.avgScore,
  }
}
