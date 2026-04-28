import { cn } from '@/lib/utils'

// ─── 학생 중심: 학생 리스트 아이템 ────────────────────────────────────────
export default function StudentListItem({ student, selected, onClick }) {
  const isSubmitted = student.submitted

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left transition-all px-3 py-2.5 rounded-lg border-none mb-0.5',
        selected ? 'bg-accent' : 'bg-transparent',
        !isSubmitted && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'shrink-0 rounded-full flex items-center justify-center w-[30px] h-[30px] text-xs font-semibold',
            selected ? 'bg-primary text-white' : 'bg-border text-muted-foreground'
          )}
        >
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn('text-sm truncate', selected ? 'font-bold text-foreground' : 'font-medium text-secondary-foreground')}>
              {student.name}
            </p>
            {!isSubmitted && (
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground bg-secondary px-1.5 py-px rounded">미제출</span>
            )}
            {isSubmitted && student.isLate && (
              <span className="shrink-0 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-px rounded">지각</span>
            )}
            {isSubmitted && student.autoSubmitted && (
              <span className="shrink-0 text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-px rounded">자동 제출</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-px">
            <span className="inline-flex items-center px-1 py-px rounded bg-slate-100 text-slate-600 tabular-nums">{student.studentId}</span>
            <span className="ml-1.5">{student.department}</span>
          </p>
        </div>
        {isSubmitted && (
          <span
            className={cn(
              'shrink-0',
              student.score !== null
                ? 'text-sm font-bold text-foreground'
                : 'text-[11px] font-medium text-destructive'
            )}
          >
            {student.score !== null ? `${student.score}점` : '미채점'}
          </span>
        )}
      </div>
    </button>
  )
}
