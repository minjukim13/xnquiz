// 통합 커스텀 드롭다운
// size: 'sm' (30px/12px, 툴바 필터용) | 'md' (36px/13px, 폼용, 기본값)
// filterMode: true면 value !== 'all' 일 때 트리거 버튼 활성 스타일 표시
// disabled: 비활성 상태
import { useState, useRef, useEffect } from 'react'

const SIZE_MAP = {
  sm: { height: 30, padding: '0 10px', fontSize: 12, optionPadding: '6px 12px' },
  md: { height: 36, padding: '6px 10px', fontSize: 13, optionPadding: '8px 12px' },
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
    <div ref={ref} className={`relative ${className}`} style={style}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between focus:outline-none transition-all"
        style={{
          height: s.height,
          padding: s.padding,
          fontSize: s.fontSize,
          fontWeight: isActive ? 600 : 400,
          borderRadius: 6,
          border: isActive ? '1.5px solid #6366f1' : '1px solid #E0E0E0',
          background: disabled ? '#FAFAFA' : isActive ? '#EEF2FF' : '#fff',
          color: disabled ? '#BDBDBD' : isActive ? '#4338ca' : (selected ? '#222222' : '#BDBDBD'),
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span>{disabled ? placeholder : (selected?.label ?? placeholder)}</span>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 드롭다운 목록 */}
      {open && !disabled && options.length > 0 && (
        <div
          className="absolute left-0 top-full mt-1 bg-white z-40 py-1"
          style={{
            border: '1px solid #E0E0E0',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            minWidth: '100%',
            width: 'max-content',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {options.map(o => {
            const isSel = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className="w-full flex items-center justify-between transition-colors focus:outline-none"
                style={{
                  fontSize: s.fontSize,
                  padding: s.optionPadding,
                  background: isSel ? '#EEF2FF' : 'transparent',
                  color: isSel ? '#4338ca' : '#424242',
                  fontWeight: isSel ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F5F5F5' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{o.label}</span>
                {/* 체크마크 자리 고정 — 레이아웃 시프트 방지 */}
                <span style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSel && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
