import { useState, useMemo, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { mockStudents } from '../data/mockData'
import { Button } from '@/components/ui/button'

const STUDENT_OPTIONS = mockStudents.slice(0, 30).map(s => ({
  type: 'student', id: s.id, label: s.name, sub: s.studentId,
}))

const GROUP_OPTIONS = Array.from(new Set(mockStudents.map(s => s.department))).map(dep => ({
  type: 'group', id: `g_${dep}`, label: dep, sub: '학과',
}))

const ALL_OPTIONS = [...GROUP_OPTIONS, ...STUDENT_OPTIONS]

function AssignToSelector({ selected, onChange, excludeStudentIds = new Set() }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedKeys = useMemo(() => new Set(selected.map(s => `${s.type}:${s.id}`)), [selected])

  const filtered = ALL_OPTIONS.filter(opt => {
    const key = `${opt.type}:${opt.id}`
    if (selectedKeys.has(key)) return false
    if (opt.type === 'student' && excludeStudentIds.has(opt.id)) return false
    if (query === '') return true
    const q = query.toLowerCase()
    return opt.label.toLowerCase().includes(q) || (opt.sub || '').toLowerCase().includes(q)
  })

  const addItem = (opt) => {
    onChange([...selected, { type: opt.type, id: opt.id, label: opt.label }])
    setQuery('')
  }
  const removeItem = (key) => onChange(selected.filter(s => `${s.type}:${s.id}` !== key))

  return (
    <div className="relative" ref={wrapRef}>
      <div
        className="min-h-10 flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 cursor-text border border-border rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-primary transition-all"
        onClick={() => setOpen(true)}
      >
        {selected.map(s => {
          const key = `${s.type}:${s.id}`
          const isGroup = s.type === 'group'
          return (
            <span
              key={key}
              className={isGroup
                ? 'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent text-primary border border-blue-200'}
            >
              {isGroup && <span className="text-[10px] font-bold">G</span>}
              {s.label}
              <button
                onClick={e => { e.stopPropagation(); removeItem(key) }}
                className="ml-0.5 leading-none opacity-60 hover:opacity-100"
                aria-label="제거"
              >
                <X size={12} />
              </button>
            </span>
          )
        })}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? '학생 이름/학번 또는 학과 검색' : ''}
          className="flex-1 min-w-24 text-sm bg-transparent focus:outline-none py-0.5"
        />
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-md overflow-hidden border border-border shadow-lg max-h-[220px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">검색 결과가 없습니다</div>
          ) : (
            filtered.map(opt => {
              const key = `${opt.type}:${opt.id}`
              return (
                <button
                  key={key}
                  onMouseDown={e => { e.preventDefault(); addItem(opt) }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {opt.type === 'group' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">그룹</span>
                    )}
                    <span>{opt.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.sub}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function AssignmentOverrides({ assignments, onChange, baseDueDate, baseAvailableFrom, baseAvailableUntil }) {
  const update = (id, field, val) => onChange(assignments.map(a => a.id === id ? { ...a, [field]: val } : a))
  const remove = (id) => onChange(assignments.filter(a => a.id !== id))
  const add = () => onChange([
    ...assignments,
    { id: `a${Date.now()}`, assignTo: [], dueDate: '', availableFrom: '', availableUntil: '' },
  ])

  const allStudentIds = useMemo(() => {
    const map = new Map()
    assignments.forEach(a => a.assignTo.filter(t => t.type === 'student').forEach(t => {
      map.set(t.id, (map.get(t.id) || 0) + 1)
    }))
    return map
  }, [assignments])

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        특정 학생 또는 학과(그룹)에 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다.
      </p>
      {assignments.map((a, idx) => {
        const usedStudents = new Set()
        assignments.forEach(other => {
          if (other.id !== a.id) other.assignTo.filter(t => t.type === 'student').forEach(t => usedStudents.add(t.id))
        })
        return (
          <div key={a.id} className="p-3 rounded-md space-y-3 border border-border bg-slate-50/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">추가 대상 {idx + 1}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(a.id)}
                className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-red-50"
              >
                삭제
              </Button>
            </div>
            <div>
              <label className="block text-xs mb-1 text-muted-foreground">대상 학생/그룹</label>
              <AssignToSelector
                selected={a.assignTo}
                onChange={val => update(a.id, 'assignTo', val)}
                excludeStudentIds={usedStudents}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">마감 일시</label>
                <input
                  type="datetime-local"
                  value={a.dueDate}
                  onChange={e => update(a.id, 'dueDate', e.target.value)}
                  placeholder={baseDueDate || ''}
                  className="w-full text-xs px-2.5 py-2 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">열람 시작</label>
                <input
                  type="datetime-local"
                  value={a.availableFrom}
                  onChange={e => update(a.id, 'availableFrom', e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">열람 마감</label>
                <input
                  type="datetime-local"
                  value={a.availableUntil}
                  onChange={e => update(a.id, 'availableUntil', e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            {a.dueDate && a.availableFrom && new Date(a.dueDate) <= new Date(a.availableFrom) && (
              <p className="text-xs text-destructive">마감 일시는 열람 시작 이후여야 합니다.</p>
            )}
          </div>
        )
      })}
      <button
        onClick={add}
        className="w-full text-sm py-2 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/40 transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus size={14} />
        대상 추가
      </button>
    </div>
  )
}

export function hasDuplicateStudent(assignments) {
  const seen = new Set()
  for (const a of assignments) {
    for (const t of a.assignTo) {
      if (t.type !== 'student') continue
      if (seen.has(t.id)) return true
      seen.add(t.id)
    }
  }
  return false
}

export function sanitizeAssignments(assignments) {
  return (assignments || [])
    .filter(a => a.assignTo.length > 0)
    .map(a => ({
      id: a.id,
      assignTo: a.assignTo,
      dueDate: a.dueDate || null,
      availableFrom: a.availableFrom || null,
      availableUntil: a.availableUntil || null,
    }))
}
