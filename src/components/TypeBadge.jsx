import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { QUIZ_TYPES } from '../data/mockData'

const typeBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold',
  {
    variants: {
      size: {
        default: 'px-1.5 py-0.5 text-xs',
        sm: 'px-1.5 py-0.5 text-[11px]',
      },
      type: {
        multiple_choice:         'bg-indigo-50 text-indigo-500',
        true_false:              'bg-emerald-50 text-emerald-600',
        multiple_answers:        'bg-blue-50 text-blue-500',
        short_answer:            'bg-amber-50 text-amber-500',
        essay:                   'bg-red-50 text-red-500',
        numerical:               'bg-violet-50 text-violet-500',
        formula:                 'bg-teal-50 text-teal-600',
        matching:                'bg-cyan-50 text-cyan-600',
        fill_in_multiple_blanks: 'bg-orange-50 text-orange-600',
        multiple_dropdowns:      'bg-indigo-50 text-indigo-600',
        file_upload:             'bg-slate-50 text-slate-500',
        text:                    'bg-neutral-100 text-muted-foreground',
      },
    },
    defaultVariants: { size: 'default' },
  }
)

export default function TypeBadge({ type, small, className }) {
  const cfg = QUIZ_TYPES[type]
  return (
    <span
      data-slot="type-badge"
      className={cn(
        typeBadgeVariants({
          size: small ? 'sm' : 'default',
          type: QUIZ_TYPES[type] ? type : undefined,
        }),
        !QUIZ_TYPES[type] && 'bg-slate-50 text-slate-500',
        className
      )}
    >
      {cfg?.label || type}
    </span>
  )
}

export { typeBadgeVariants }
