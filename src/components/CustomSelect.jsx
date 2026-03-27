import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

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
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 text-sm transition-all focus:outline-none"
        style={{
          border: open ? '1px solid #6366f1' : '1px solid #E0E0E0',
          borderRadius: 4,
          boxShadow: open ? '0 0 0 2px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <span style={{ color: selected ? '#222222' : '#9E9E9E', fontWeight: selected ? 500 : 400 }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: '#9E9E9E' }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden py-1 max-h-60 overflow-y-auto scrollbar-thin"
          style={{ border: '1px solid #E0E0E0', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          {options.map(o => {
            const isSelected = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors"
                style={{
                  background: isSelected ? '#EEF2FF' : 'transparent',
                  color: isSelected ? '#4338ca' : '#424242',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F5F5F5' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontWeight: isSelected ? 500 : 400 }}>{o.label}</span>
                {isSelected && <Check size={14} className="shrink-0" style={{ color: '#6366f1' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
