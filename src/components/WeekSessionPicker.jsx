import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEK_STORAGE_PREFIX = 'xnq_week_options_v2__'
const SESSION_STORAGE_PREFIX = 'xnq_session_options_v2__'
const DEFAULT_WEEKS = [1]
const DEFAULT_SESSIONS = [1]
const MAX_N = 99

const slug = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w가-힣_-]/g, '') || 'default'
const weekKey = (courseKey) => `${WEEK_STORAGE_PREFIX}${slug(courseKey)}`
const sessionKey = (courseKey) => `${SESSION_STORAGE_PREFIX}${slug(courseKey)}`

function loadOptions(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...fallback]
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return [...fallback]
    const cleaned = [...new Set(arr.filter(n => Number.isInteger(n) && n >= 1 && n <= MAX_N))].sort((a, b) => a - b)
    return cleaned.length > 0 ? cleaned : [...fallback]
  } catch {
    return [...fallback]
  }
}

function saveOptions(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr))
  } catch { /* ignore */ }
}

export default function WeekSessionPicker({ week, session, onChange, courseKey }) {
  const useNone = week === null && session === null

  const setWeek = (val) => onChange({ week: val, session })
  const setSession = (val) => onChange({ week, session: val })
  const setNone = (none) => {
    if (none) onChange({ week: null, session: null })
    else onChange({ week: week ?? 1, session: session ?? 1 })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <RadioOption checked={!useNone} onClick={() => setNone(false)} label="주차/차시 선택" />
        <RadioOption checked={useNone} onClick={() => setNone(true)} label="선택 안 함" />
      </div>

      {!useNone && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">주차</label>
            <WeekDropdown value={week} onChange={setWeek} courseKey={courseKey} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">차시</label>
            <SessionList value={session} onChange={setSession} courseKey={courseKey} />
          </div>
        </div>
      )}
    </div>
  )
}

function RadioOption({ checked, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-sm cursor-pointer"
    >
      <span className={cn(
        'w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-colors',
        checked ? 'border-primary' : 'border-slate-300'
      )}>
        {checked && <span className="w-2 h-2 rounded-full bg-primary" />}
      </span>
      <span className={cn('font-medium', checked ? 'text-primary' : 'text-secondary-foreground')}>{label}</span>
    </button>
  )
}

function WeekDropdown({ value, onChange, courseKey }) {
  const storageKey = weekKey(courseKey)
  const [options, setOptions] = useState(() => loadOptions(storageKey, DEFAULT_WEEKS))
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { setOptions(loadOptions(storageKey, DEFAULT_WEEKS)) }, [storageKey])
  useEffect(() => { saveOptions(storageKey, options) }, [storageKey, options])

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  const maxWeek = options.length > 0 ? Math.max(...options) : 0
  const canAdd = maxWeek < MAX_N

  const handleAdd = () => {
    if (!canAdd) return
    const next = [...options, maxWeek + 1]
    setOptions(next)
    onChange(maxWeek + 1)
  }

  const handleDelete = (n, e) => {
    e.stopPropagation()
    if (n !== maxWeek || options.length <= 1) return
    const next = options.filter(x => x !== n)
    setOptions(next)
    if (value === n) onChange(next[next.length - 1] ?? null)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 text-sm rounded-md border transition-all focus:outline-none cursor-pointer',
          open ? 'border-primary ring-2 ring-blue-100' : 'border-border',
        )}
      >
        <span className={cn(value !== null ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {value !== null ? `${value}주차` : '주차 선택'}
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white py-1 max-h-72 overflow-y-auto border border-border rounded-md shadow-lg"
        >
          {options.map(n => {
            const isSelected = n === value
            const isLast = n === maxWeek
            const canDelete = isLast && options.length > 1
            return (
              <div
                key={n}
                onClick={() => { onChange(n); setOpen(false) }}
                className={cn(
                  'group/opt w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors cursor-pointer',
                  isSelected ? 'bg-accent text-primary font-medium' : 'text-foreground hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                  <span className={cn(!isSelected && 'ml-[22px]')}>{n}주차</span>
                </span>
                <button
                  type="button"
                  onClick={e => handleDelete(n, e)}
                  disabled={!canDelete}
                  title={!canDelete ? (isLast ? '최소 1개는 남겨야 합니다' : '마지막 주차만 삭제할 수 있습니다') : ''}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all cursor-pointer disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent disabled:opacity-30"
                  aria-label={`${n}주차 삭제`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            title={!canAdd ? `최대 ${MAX_N}주차까지 추가할 수 있습니다` : ''}
            className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-primary hover:bg-accent transition-colors border-t border-border cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Plus size={14} />
            주차 추가
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

function SessionList({ value, onChange, courseKey }) {
  const storageKey = sessionKey(courseKey)
  const [options, setOptions] = useState(() => loadOptions(storageKey, DEFAULT_SESSIONS))

  useEffect(() => { setOptions(loadOptions(storageKey, DEFAULT_SESSIONS)) }, [storageKey])
  useEffect(() => { saveOptions(storageKey, options) }, [storageKey, options])

  const maxSession = options.length > 0 ? Math.max(...options) : 0
  const canAdd = maxSession < MAX_N

  const handleAdd = () => {
    if (!canAdd) return
    const next = [...options, maxSession + 1]
    setOptions(next)
    onChange(maxSession + 1)
  }

  const handleDelete = (n) => {
    if (n !== maxSession || options.length <= 1) return
    const next = options.filter(x => x !== n)
    setOptions(next)
    if (value === n) onChange(next[next.length - 1] ?? null)
  }

  return (
    <div className="rounded-md border border-border bg-white overflow-hidden">
      <div className="max-h-[200px] overflow-y-auto">
        {options.length === 0 ? (
          <div className="px-3 py-3 text-xs text-center text-muted-foreground">차시가 없습니다. 아래에서 추가해주세요.</div>
        ) : (
          options.map(n => {
            const isSelected = n === value
            const isLast = n === maxSession
            const canDelete = isLast && options.length > 1
            return (
              <label
                key={n}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer transition-colors border-b border-border last:border-b-0',
                  isSelected ? 'bg-accent' : 'hover:bg-secondary',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="session-list"
                    checked={isSelected}
                    onChange={() => onChange(n)}
                    className="shrink-0 accent-primary cursor-pointer"
                  />
                  <span className={cn('font-medium', isSelected ? 'text-primary' : 'text-foreground')}>{n}차시</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleDelete(n) }}
                  disabled={!canDelete}
                  title={!canDelete ? (isLast ? '최소 1개는 남겨야 합니다' : '마지막 차시만 삭제할 수 있습니다') : ''}
                  className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                  aria-label={`${n}차시 삭제`}
                >
                  삭제
                </button>
              </label>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        title={!canAdd ? `최대 ${MAX_N}차시까지 추가할 수 있습니다` : ''}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-primary hover:bg-accent transition-colors border-t border-border cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus size={14} />
        차시 추가
      </button>
    </div>
  )
}
