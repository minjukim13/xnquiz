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
          'w-full flex items-center justify-between gap-2 px-2.5 rounded-md border transition-all focus:outline-none',
          s.height, s.text,
          disabled && 'bg-muted text-muted-foreground cursor-not-allowed',
          !disabled && isActive && 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold',
          !disabled && !isActive && 'border-border bg-white text-foreground hover:border-muted-foreground/40',
          !disabled && !isActive && !selected && 'text-muted-foreground',
          open && !isActive && 'border-indigo-500 ring-2 ring-indigo-100',
        )}
      >
        <span className={cn(!selected && !disabled && 'text-muted-foreground')}>
          {disabled ? placeholder : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown
          size={11}
          className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && !disabled && options.length > 0 && (
        <div className="absolute left-0 top-full mt-1 bg-white z-40 py-1 border border-border rounded-md shadow-lg min-w-full w-max max-h-80 overflow-y-auto">
          {options.map(o => {
            const isSel = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 whitespace-nowrap transition-colors focus:outline-none',
                  s.text, s.optionPy,
                  isSel ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-foreground hover:bg-muted',
                )}
              >
                <span>{o.label}</span>
                <span className="w-4 shrink-0 flex items-center justify-center">
                  {isSel && <Check size={12} className="text-indigo-600" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
