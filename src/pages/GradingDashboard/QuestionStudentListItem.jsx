import { cn } from '@/lib/utils'
import { getInitScore, hasActualScoreChange } from './utils'
import { getStudentAnswer, isAnswerCorrect } from '../../data/mockData'

// ─── 문항 중심: 학생 리스트 아이템 ────────────────────────────────────────
export default function QuestionStudentListItem({ student, question, quizId, selected, isChanged, pendingScore, onClick }) {
  let autoCorrect = null
  if (student.submitted && question.autoGrade) {
    const studentIdx = parseInt(student.id.replace('s', ''))
    const rawAnswer = student.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
    autoCorrect = isAnswerCorrect(rawAnswer, question.id)
  }

  const initScore = getInitScore(student, question, quizId, autoCorrect)
  const displayScore = pendingScore !== undefined ? pendingScore : initScore
  const isRowChanged = hasActualScoreChange(pendingScore, initScore)
  const isUngraded = displayScore === '' || displayScore === null || displayScore === undefined

  const submitStatus = !student.submitted
    ? 'unsubmitted'
    : student.isLate ? 'late' : 'ontime'

  const submitLabel = submitStatus === 'unsubmitted' ? '미제출' : submitStatus === 'late' ? '지각' : '정상'
  const submitCls =
    submitStatus === 'unsubmitted' ? 'bg-slate-100 text-slate-500'
    : submitStatus === 'late' ? 'bg-warning-bg text-warning-foreground'
    : 'bg-success-bg text-success-foreground'

  const showAccent = isRowChanged || isChanged
  const accentBar = isRowChanged || isChanged ? 'bg-primary' : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-left px-3 py-2.5 border-b border-slate-100 transition-colors',
        selected ? 'bg-accent' : 'hover:bg-slate-50',
        !student.submitted && !selected && 'opacity-70'
      )}
    >
      {showAccent && (
        <span className={cn('absolute left-0 top-0 bottom-0 w-1', accentBar)} aria-hidden />
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-foreground truncate">
          {student.name}
        </span>
        <span className={cn('shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium', submitCls)}>
          {submitLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">{student.studentId}</span>
        <span className={cn(
          'text-[12px] tabular-nums font-semibold',
          isUngraded ? 'text-warning' : 'text-foreground'
        )}>
          {isUngraded ? '미채점' : `${displayScore} / ${question.points}`}
        </span>
      </div>
    </button>
  )
}
