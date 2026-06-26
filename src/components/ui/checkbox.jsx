import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Checkbox({ checked, onChange, indeterminate, className, 'aria-label': ariaLabel }) {
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={e => { e.stopPropagation(); onChange?.() }}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange?.() }
      }}
      className={cn(
        'inline-flex items-center justify-center w-[18px] h-[18px] rounded-[6px] border-2 shrink-0 cursor-pointer transition-colors',
        checked || indeterminate
          ? 'bg-primary border-primary text-white'
          : 'bg-white border-border hover:border-muted-foreground',
        className,
      )}
    >
      {indeterminate ? (
        <span className="w-2 h-0.5 rounded-full bg-white" />
      ) : checked ? (
        <Check size={12} strokeWidth={3} />
      ) : null}
    </span>
  )
}
