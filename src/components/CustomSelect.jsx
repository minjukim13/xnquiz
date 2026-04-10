import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CustomSelect({ value, onChange, options, placeholder = '선택', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 text-sm rounded-md border transition-all focus:outline-none',
          open ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-border',
        )}
      >
        <span className={cn(selected ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden py-1 max-h-60 overflow-y-auto border border-border rounded-md shadow-lg">
          {options.map(o => {
            const isSelected = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                  isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-foreground hover:bg-muted',
                )}
              >
                <span>{o.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-indigo-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
