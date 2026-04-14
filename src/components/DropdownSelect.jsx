import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZE_MAP = {
  sm: { height: 'h-[30px]', text: 'text-xs', optionPy: 'py-1.5' },
  md: { height: 'h-9', text: 'text-[13px]', optionPy: 'py-2' },
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = '선택',
  disabled = false,
  className = '',
  style = {},
  size = 'md',
  filterMode = false,
  ghost = false,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const s = SIZE_MAP[size] ?? SIZE_MAP.md
  const selected = options.find(o => String(o.value) === String(value))
  const isActive = filterMode && !disabled && selected && String(selected.value) !== 'all'

  return (
    <div ref={ref} className={cn('relative', className)} style={style}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 transition-all focus:outline-none',
          s.height, s.text,
          ghost ? 'px-3 rounded-lg border border-border' : 'px-2.5 rounded-md border',
          disabled && 'bg-muted text-muted-foreground cursor-not-allowed',
          !disabled && isActive && 'border-primary bg-accent text-primary font-semibold',
          !disabled && !isActive && ghost && 'bg-white text-secondary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
          !disabled && !isActive && !ghost && 'border-border bg-white text-foreground hover:border-muted-foreground/40',
          !disabled && !isActive && !selected && !ghost && 'text-muted-foreground',
          !disabled && !isActive && !selected && ghost && 'text-muted-foreground',
          open && !isActive && 'ring-2 ring-blue-100',
        )}
      >
        <span className={cn('whitespace-nowrap', !selected && !disabled && 'text-muted-foreground')}>
          {disabled ? placeholder : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown
          size={11}
          className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && !disabled && options.length > 0 && (
        <div className={cn(
          'absolute left-0 top-full mt-1.5 z-40 py-1.5 min-w-full w-max max-h-80 overflow-y-auto',
          'bg-white rounded-xl ring-1 ring-black/[0.06]',
          'shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0px_0px_1px_rgba(0,0,0,0.04)]',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-100',
        )}>
          {options.map(o => {
            const isSel = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 mx-0 whitespace-nowrap transition-colors focus:outline-none rounded-lg',
                  s.text, s.optionPy,
                  isSel
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-foreground hover:bg-secondary active:bg-secondary/80',
                )}
              >
                <span>{o.label}</span>
                <span className="w-4 shrink-0 flex items-center justify-center">
                  {isSel && <Check size={12} className="text-primary" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
