import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

export function GroupCombobox({ value = '', onChange, existingGroups = [], disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 열릴 때 검색어 초기화 + 포커스
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = existingGroups.filter(g =>
    g.toLowerCase().includes(query.toLowerCase())
  )
  const canCreate = query.trim() && !existingGroups.some(
    g => g.toLowerCase() === query.trim().toLowerCase()
  )

  const select = (group) => {
    onChange(group)
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={ref} className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between focus:outline-none"
        style={{
          border: open ? '1px solid #6366f1' : '1px solid #E0E0E0',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 14,
          color: disabled ? '#BDBDBD' : value ? '#222222' : '#BDBDBD',
          background: disabled ? '#FAFAFA' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: 36,
          transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{value || '그룹 선택 또는 추가'}</span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={clear}
              className="flex items-center justify-center rounded-full"
              style={{ color: '#BDBDBD', padding: 2 }}
              onMouseEnter={e => e.currentTarget.style.color = '#424242'}
              onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}
            >
              <X size={12} />
            </span>
          )}
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.6 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-white z-50"
          style={{
            border: '1px solid #E0E0E0',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            minWidth: '100%',
            maxHeight: 220,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 검색 입력 */}
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #F0F0F0' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="검색 또는 새 그룹 입력"
              className="w-full focus:outline-none"
              style={{
                fontSize: 13,
                color: '#222222',
                border: 'none',
                background: 'transparent',
                padding: '2px 4px',
              }}
            />
          </div>

          {/* 옵션 목록 */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* 그룹 없음 옵션 */}
            {!query && (
              <button
                type="button"
                onClick={() => select('')}
                className="w-full text-left px-3 py-2 transition-colors"
                style={{
                  fontSize: 13,
                  color: value === '' ? '#4338ca' : '#9E9E9E',
                  background: value === '' ? '#EEF2FF' : 'transparent',
                  fontWeight: value === '' ? 600 : 400,
                }}
                onMouseEnter={e => { if (value !== '') e.currentTarget.style.background = '#F5F5F5' }}
                onMouseLeave={e => { if (value !== '') e.currentTarget.style.background = 'transparent' }}
              >
                그룹 없음
              </button>
            )}

            {/* 기존 그룹 목록 */}
            {filtered.map(g => {
              const isSel = g === value
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => select(g)}
                  className="w-full flex items-center justify-between px-3 py-2 transition-colors"
                  style={{
                    fontSize: 13,
                    color: isSel ? '#4338ca' : '#424242',
                    background: isSel ? '#EEF2FF' : 'transparent',
                    fontWeight: isSel ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F5F5F5' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{g}</span>
                  {isSel && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}

            {/* 기존 그룹 없을 때 빈 상태 */}
            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-3 text-center" style={{ fontSize: 12, color: '#BDBDBD' }}>
                일치하는 그룹이 없습니다
              </p>
            )}

            {/* 새 그룹 추가 */}
            {canCreate && (
              <>
                {filtered.length > 0 && <div style={{ borderTop: '1px solid #F0F0F0', margin: '2px 0' }} />}
                <button
                  type="button"
                  onClick={() => select(query.trim())}
                  className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
                  style={{ fontSize: 13, color: '#6366f1' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>
                    <span style={{ color: '#9E9E9E' }}>&quot;</span>
                    {query.trim()}
                    <span style={{ color: '#9E9E9E' }}>&quot;</span>
                    <span style={{ color: '#6366f1' }}> 추가</span>
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
