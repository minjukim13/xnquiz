import { useMemo } from 'react'
import StatusBadge from '../../components/StatusBadge'
import { getEffectiveSubmittedCount, isDeadlinePassed } from '@/utils/deadlineUtils'

function resolveDisplayStatus(quiz) {
  if (!quiz) return null
  if (quiz.status === 'open' && quiz.startDate && new Date() < new Date(quiz.startDate)) return 'scheduled'
  if (quiz.status === 'open' && isDeadlinePassed(quiz)) return 'closed'
  return quiz.status
}

// ─── 퀴즈 정보 카드 ─────────────────────────────────────────────────────────
export default function QuizInfoCard({ quiz, students }) {
  const effectiveSubmitted = useMemo(
    () => getEffectiveSubmittedCount(quiz, students),
    [quiz, students]
  )
  // 마감 후 자동 0점 처리된 학생도 채점 완료로 집계하기 위해 students 기반 동적 계산
  const effectiveGraded = useMemo(() => {
    if (Array.isArray(students) && students.length > 0) {
      return students.filter(s => s.submitted && s.score !== null).length
    }
    return quiz.graded ?? 0
  }, [students, quiz.graded])
  const submitRate = useMemo(
    () => quiz.totalStudents > 0 ? Math.round((effectiveSubmitted / quiz.totalStudents) * 100) : 0,
    [effectiveSubmitted, quiz.totalStudents]
  )
  const gradeProgress = useMemo(
    () => quiz.totalStudents > 0 ? Math.round((effectiveGraded / quiz.totalStudents) * 100) : 0,
    [effectiveGraded, quiz.totalStudents]
  )

  return (
    <div className="mb-5 overflow-hidden bg-card rounded-2xl shadow-md">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-accent text-primary">
                {quiz.week}주차 {quiz.session}차시
              </span>
              <StatusBadge status={resolveDisplayStatus(quiz)} className="px-2.5 py-1 rounded-full font-semibold" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground mb-1.5">{quiz.title}</h2>
            <p className="text-sm text-muted-foreground mb-2">{quiz.startDate || quiz.dueDate ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}` : '응시 기간 제한 없음'}</p>
            {(() => {
              if (quiz.scoreRevealEnabled === undefined && quiz.scoreReleasePolicy === undefined) return null
              const enabled = quiz.scoreRevealEnabled ?? (quiz.scoreReleasePolicy !== null)
              if (!enabled) {
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">성적 공개</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-gray-500">비공개</span>
                  </div>
                )
              }
              const isWithAnswer = quiz.scoreRevealScope === 'with_answer'
              const timing = quiz.scoreRevealTiming ?? quiz.scoreReleasePolicy
              const timingLabel = timing === 'after_due' ? '마감 후 공개'
                : timing === 'period' ? '공개 기간 지정'
                : '즉시 공개'
              const periodStart = quiz.scoreRevealStart?.split(' ')[0]
              const periodEnd = quiz.scoreRevealEnd?.split(' ')[0]
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground">성적 공개</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-primary">
                    {isWithAnswer ? '정답 포함' : '점수만'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-50 text-green-600">
                    {timingLabel}
                  </span>
                  {timing === 'period' && periodStart && (
                    <span className="text-xs font-medium text-gray-500">
                      {periodStart} ~ {periodEnd}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="flex items-stretch shrink-0 overflow-hidden rounded-[14px] bg-background">
            <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[90px]">
              <p className="text-xs mb-2 text-muted-foreground">제출률</p>
              <p className="text-2xl leading-none font-extrabold text-primary">{submitRate}%</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[110px]">
              <p className="text-xs mb-2 text-muted-foreground">제출 인원</p>
              <p className="text-2xl leading-none font-extrabold text-foreground">
                {effectiveSubmitted}<span className="text-sm ml-1 font-normal text-muted-foreground">/ {quiz.totalStudents}명</span>
              </p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[110px]">
              <p className="text-xs mb-2 text-muted-foreground">채점 완료</p>
              <p className="text-2xl leading-none font-extrabold text-foreground">
                {effectiveGraded}<span className="text-sm ml-1 font-normal text-muted-foreground">/ {quiz.totalStudents}명</span>
              </p>
            </div>
          </div>
        </div>

        {/* 채점 진행률 */}
        <div className="mt-4 pt-4 border-t border-secondary">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">채점 진행률</span>
            <span className="font-bold text-primary">{gradeProgress}%</span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden bg-border">
            <div
              className="h-full rounded-full transition-all bg-primary"
              style={{ width: `${gradeProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
