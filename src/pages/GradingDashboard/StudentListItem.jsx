import { cn } from '@/lib/utils'

// ─── 학생 중심: 학생 리스트 아이템 ────────────────────────────────────────
export default function StudentListItem({ student, selected, onClick }) {
  const isSubmitted = student.submitted
  const hasScore = student.score !== null

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left transition-colors px-3 py-2.5 rounded-lg border-none mb-0.5',
        selected ? 'bg-accent' : 'bg-transparent hover:bg-slate-50',
        !isSubmitted && !selected && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* 프로필 아이콘 */}
        <div
          className={cn(
            'shrink-0 rounded-full flex items-center justify-center w-[30px] h-[30px] text-xs font-semibold',
            selected ? 'bg-primary text-white' : 'bg-border text-muted-foreground'
          )}
        >
          {student.name[0]}
        </div>

        {/* 이름 · 학번 */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm truncate leading-tight',
            selected ? 'font-bold text-foreground' : 'font-semibold text-foreground'
          )}>
            {student.name}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums leading-tight mt-0.5">
            {student.studentId}
          </p>
        </div>

        {/* 점수 */}
        <span className={cn(
          'shrink-0 tabular-nums leading-tight',
          hasScore ? 'text-sm font-bold text-foreground' : 'text-[11px] font-medium text-muted-foreground'
        )}>
          {hasScore ? `${student.score}점` : '—'}
        </span>
      </div>
    </button>
  )
}
