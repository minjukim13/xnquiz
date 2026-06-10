import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getLocalFudgePoints, getInitScore, hasActualScoreChange } from './utils'
import { getStudentAnswer, isAnswerCorrect } from '../../data/mockData'
import {
  SubmitBadge,
  CorrectBadge,
  GradeStatusBadge,
  FudgeBadge,
  FileSubmissionView,
  formatAnswerForDisplay,
} from './StudentRow'

// ─── 문항 중심: 선택된 학생 답안 + 채점 패널 ────────────────────────────
export default function AnswerDetailView({ student, question, quizId, pendingScore, isChanged, onScoreChange, onRowSave }) {
  if (!student) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        학생을 선택하면 답안을 확인할 수 있습니다
      </div>
    )
  }

  const studentFudge = getLocalFudgePoints()[`${quizId}_${student.id}`] || 0
  const submitStatus = !student.submitted ? 'unsubmitted' : (student.isLate ? 'late' : 'ontime')

  let rawAnswer = null
  let autoCorrect = null
  let studentIdx = null
  if (student.submitted) {
    studentIdx = parseInt(student.id.replace('s', ''))
    rawAnswer = student.selections?.[question.id] ??
      (question.autoGrade
        ? getStudentAnswer(studentIdx, question.id)
        : (student.response || getStudentAnswer(studentIdx, question.id)))
    if (question.autoGrade) autoCorrect = isAnswerCorrect(rawAnswer, question.id)
  }

  let normalizedAnswer = rawAnswer
  if (student.submitted && question.type === 'true_false') {
    const lower = (typeof rawAnswer === 'string' ? rawAnswer : '').toLowerCase()
    normalizedAnswer = (lower === '참' || lower === 'true') ? '참'
      : (lower === '거짓' || lower === 'false') ? '거짓'
      : rawAnswer
  }
  const displayAnswer = student.submitted ? formatAnswerForDisplay(question, normalizedAnswer) : null

  const initScore = getInitScore(student, question, quizId, autoCorrect)
  const displayScore = pendingScore !== undefined ? pendingScore : initScore
  const isRowChanged = hasActualScoreChange(pendingScore, initScore)
  const isUngraded = initScore === '' || initScore === null

  return (
    <div className="flex flex-col h-full">
      {/* 학생 헤더 */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-bold text-foreground truncate">{student.name}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 tabular-nums shrink-0">
            {student.studentId}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SubmitBadge status={submitStatus} />
          {student.submittedAt && (
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {student.submittedAt.slice(5, 16)}
            </span>
          )}
          {autoCorrect !== null && <CorrectBadge correct={autoCorrect} />}
        </div>
      </div>

      {/* 답안 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 bg-slate-50/30">
        {!student.submitted ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center">
            <p className="text-[13px] text-muted-foreground italic">제출되지 않았습니다</p>
          </div>
        ) : question.type === 'file_upload' ? (
          <FileSubmissionView studentIdx={studentIdx} question={question} />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 mb-2">제출한 답안</span>
            <p className="text-[14px] leading-relaxed whitespace-pre-line break-words text-slate-900">
              {displayAnswer || <span className="text-muted-foreground italic">(답안 없음)</span>}
            </p>
          </div>
        )}

        {autoCorrect === false && question.correctAnswer != null && (
          <p className="mt-3 px-1 text-[13px] text-muted-foreground">
            <span className="font-medium text-slate-600">정답</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}
          </p>
        )}
      </div>

      {/* 채점 영역 */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-white">
        <FudgeBadge value={studentFudge} />
        <GradeStatusBadge ungraded={isUngraded && !isChanged} />
        <input
          type="number"
          value={displayScore}
          onChange={e => onScoreChange(student.id, e.target.value)}
          placeholder="-"
          min={0}
          max={question.points}
          step="any"
          className={cn(
            'w-20 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-center border tabular-nums text-slate-900',
            isRowChanged ? 'border-primary' : 'border-slate-200'
          )}
        />
        <span className="text-sm text-muted-foreground">/ {question.points}점</span>
        <Button size="sm" onClick={() => onRowSave?.(student.id)} disabled={!isRowChanged}>
          저장
        </Button>
      </div>
    </div>
  )
}
