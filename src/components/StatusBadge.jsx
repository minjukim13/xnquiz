import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        open:      'bg-green-50 text-green-700',
        grading:   'bg-green-50 text-green-700',
        closed:    'bg-secondary text-muted-foreground',
        draft:     'bg-accent text-primary',
        scheduled: 'bg-amber-50 text-amber-600',
      },
    },
  }
)

const STATUS_LABELS = {
  open: '진행중',
  grading: '진행중',
  closed: '마감',
  draft: '임시저장',
  scheduled: '예정',
}

const DOT_VARIANTS = {
  open:      'bg-green-500',
  grading:   'bg-green-500',
  closed:    'bg-muted-foreground',
  draft:     'bg-primary',
  scheduled: 'bg-amber-500',
}

export default function StatusBadge({ status, showDot = true, className }) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status }), className)}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_VARIANTS[status])}
          aria-hidden="true"
        />
      )}
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export { statusBadgeVariants, STATUS_LABELS }
