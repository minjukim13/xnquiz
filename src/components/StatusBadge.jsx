import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      status: {
        open:      'bg-green-50 text-green-700',
        closed:    'bg-secondary text-muted-foreground',
        ended:     'bg-slate-100 text-slate-500',
        draft:     'bg-accent text-primary',
        scheduled: 'bg-amber-50 text-amber-600',
      },
    },
  }
)

const STATUS_LABELS = {
  open: '진행중',
  closed: '마감',
  ended: '종료',
  draft: '임시저장',
  scheduled: '예정',
}

const DOT_VARIANTS = {
  open:      'bg-green-500',
  closed:    'bg-muted-foreground',
  ended:     'bg-slate-400',
  draft:     'bg-primary',
  scheduled: 'bg-amber-500',
}

// '채점중'(grading)은 공식 상태 enum에서 후행 Phase 예약 상태 (Glossary §5).
// 현재는 미활성이므로 grading 데이터가 들어와도 '마감'으로 표시한다.
function normalizeStatus(status) {
  return status === 'grading' ? 'closed' : status
}

export default function StatusBadge({ status, showDot = true, className }) {
  const display = normalizeStatus(status)
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status: display }), className)}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_VARIANTS[display])}
          aria-hidden="true"
        />
      )}
      {STATUS_LABELS[display] || display}
    </span>
  )
}
