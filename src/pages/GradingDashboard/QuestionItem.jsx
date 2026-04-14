import { cn } from '@/lib/utils'
import TypeBadge from '../../components/TypeBadge'

// ─── 문항 중심: 문항 아이템 ─────────────────────────────────────────────────
export default function QuestionItem({ question, selected, onClick, dimmed }) {
  const isComplete = question.gradedCount >= question.totalCount
  const progress = Math.round((question.gradedCount / question.totalCount) * 100)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded transition-all border',
        selected
          ? 'border-primary bg-accent'
          : dimmed
          ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
          : 'border-slate-200 bg-white hover:border-slate-400'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-[13px] font-bold', selected ? 'text-primary' : 'text-secondary-foreground')}>
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {isComplete && (
              <span className="text-xs px-1.5 py-0.5 rounded text-green-700 bg-green-50">완료</span>
            )}
          </div>
          <p className={cn('text-[13px] leading-relaxed line-clamp-2', dimmed ? 'text-slate-400' : 'text-foreground')}>
            {question.text}
          </p>
        </div>
        <span className="text-[13px] shrink-0 text-muted-foreground">{question.points}점</span>
      </div>

      {!isComplete && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
            <span>{question.gradedCount}/{question.totalCount}명</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded overflow-hidden bg-slate-200">
            <div className="h-full bg-primary rounded" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </button>
  )
}
