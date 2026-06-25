import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, Check } from 'lucide-react'
import { mockStudents } from '../data/mockData'
import { cn } from '@/lib/utils'
import CustomSelect from './CustomSelect'

const STUDENT_POOL = mockStudents.slice(0, 30).map(s => ({
  type: 'student',
  id: s.id,
  name: s.name,
  studentId: s.studentId,
  department: s.department,
}))

const GROUP_POOL = Array.from(new Set(mockStudents.map(s => s.department))).map(dep => ({
  type: 'group',
  id: `g_${dep}`,
  name: dep,
}))

const STUDENT_SORT_OPTIONS = [
  { value: 'name', label: '이름순' },
  { value: 'studentId', label: '학번순' },
  { value: 'department', label: '학과순' },
]

const compareKo = (a, b) => (a || '').localeCompare(b || '', 'ko')

export default function AssignTargetModal({ open, onOpenChange, initialSelected = [], excludeStudentIds = new Set(), onConfirm }) {
  const [tab, setTab] = useState('student')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [picked, setPicked] = useState(() => new Set(initialSelected.map(s => `${s.type}:${s.id}`)))

  // open 될 때마다 초기 선택값 동기화
  useEffect(() => {
    if (open) {
      setPicked(new Set(initialSelected.map(s => `${s.type}:${s.id}`)))
      setQuery('')
      setTab('student')
      setSortKey('name')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedStudents = useMemo(() => {
    const arr = [...STUDENT_POOL]
    if (sortKey === 'name') arr.sort((a, b) => compareKo(a.name, b.name))
    if (sortKey === 'studentId') arr.sort((a, b) => compareKo(a.studentId, b.studentId))
    if (sortKey === 'department') arr.sort((a, b) => compareKo(a.department, b.department) || compareKo(a.name, b.name))
    return arr
  }, [sortKey])

  const sortedGroups = useMemo(() => [...GROUP_POOL].sort((a, b) => compareKo(a.name, b.name)), [])

  const filteredStudents = useMemo(() => {
    if (!query.trim()) return sortedStudents
    const q = query.toLowerCase()
    return sortedStudents.filter(s =>
      s.name.toLowerCase().includes(q)
      || s.studentId.toLowerCase().includes(q)
      || s.department.toLowerCase().includes(q)
    )
  }, [sortedStudents, query])

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return sortedGroups
    const q = query.toLowerCase()
    return sortedGroups.filter(g => g.name.toLowerCase().includes(q))
  }, [sortedGroups, query])

  const toggle = (key) => {
    setPicked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleAllStudents = () => {
    const availableKeys = filteredStudents.filter(s => !excludeStudentIds.has(s.id)).map(s => `student:${s.id}`)
    const allOn = availableKeys.every(k => picked.has(k))
    setPicked(prev => {
      const next = new Set(prev)
      if (allOn) availableKeys.forEach(k => next.delete(k))
      else availableKeys.forEach(k => next.add(k))
      return next
    })
  }

  const handleConfirm = () => {
    const result = []
    sortedGroups.forEach(g => {
      if (picked.has(`group:${g.id}`)) result.push({ type: 'group', id: g.id, label: g.name })
    })
    sortedStudents.forEach(s => {
      if (picked.has(`student:${s.id}`)) result.push({ type: 'student', id: s.id, label: s.name })
    })
    onConfirm(result)
    onOpenChange(false)
  }

  const pickedStudentCount = [...picked].filter(k => k.startsWith('student:')).length
  const pickedGroupCount = [...picked].filter(k => k.startsWith('group:')).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>추가 할당 대상 선택</DialogTitle>
          <DialogDescription>
            추가 할당을 적용할 학생 또는 학과(그룹)를 선택합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 탭 */}
        <div className="flex items-center gap-1 border-b border-border -mt-2">
          {[
            { key: 'student', label: `학생`, count: pickedStudentCount },
            { key: 'group', label: `학과 그룹`, count: pickedGroupCount },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px cursor-pointer',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-accent text-primary tabular-nums">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 + 정렬 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'student' ? '이름·학번·학과로 검색' : '학과명으로 검색'}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
            />
          </div>
          {tab === 'student' && (
            <div className="w-32 shrink-0">
              <CustomSelect
                value={sortKey}
                onChange={setSortKey}
                options={STUDENT_SORT_OPTIONS}
                placeholder="정렬"
              />
            </div>
          )}
        </div>

        {/* 표 영역 */}
        <div className="flex-1 min-h-0 border border-border rounded-md overflow-hidden flex flex-col">
          {tab === 'student' ? (
            <>
              <div className="grid grid-cols-[40px_1.4fr_1fr_1.4fr] items-center px-4 py-2 bg-slate-50 border-b border-border text-xs font-semibold text-muted-foreground">
                <button
                  type="button"
                  onClick={toggleAllStudents}
                  className="w-5 h-5 rounded border-[1.5px] border-slate-300 bg-white flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  aria-label="전체 선택"
                >
                  {filteredStudents.filter(s => !excludeStudentIds.has(s.id)).every(s => picked.has(`student:${s.id}`)) && filteredStudents.length > 0 && (
                    <Check size={12} className="text-primary" />
                  )}
                </button>
                <span>이름</span>
                <span>학번</span>
                <span>학과</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>
                ) : (
                  filteredStudents.map(s => {
                    const key = `student:${s.id}`
                    const isChecked = picked.has(key)
                    const isExcluded = excludeStudentIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isExcluded}
                        onClick={() => toggle(key)}
                        title={isExcluded ? '다른 추가 할당에 이미 포함된 학생입니다' : ''}
                        className={cn(
                          'w-full grid grid-cols-[40px_1.4fr_1fr_1.4fr] items-center px-4 py-2.5 text-sm text-left border-b border-secondary last:border-b-0 transition-colors',
                          isChecked ? 'bg-accent/50' : 'hover:bg-secondary/40',
                          isExcluded && 'opacity-40 cursor-not-allowed',
                          !isExcluded && 'cursor-pointer',
                        )}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors',
                          isChecked ? 'bg-primary border-primary' : 'bg-white border-slate-300',
                        )}>
                          {isChecked && <Check size={12} className="text-white" />}
                        </span>
                        <span className="font-medium text-foreground truncate">{s.name}</span>
                        <span className="text-muted-foreground tabular-nums truncate">{s.studentId}</span>
                        <span className="text-muted-foreground truncate">{s.department}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[40px_1fr] items-center px-4 py-2 bg-slate-50 border-b border-border text-xs font-semibold text-muted-foreground">
                <span></span>
                <span>학과명</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>
                ) : (
                  filteredGroups.map(g => {
                    const key = `group:${g.id}`
                    const isChecked = picked.has(key)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggle(key)}
                        className={cn(
                          'w-full grid grid-cols-[40px_1fr] items-center px-4 py-2.5 text-sm text-left border-b border-secondary last:border-b-0 transition-colors cursor-pointer',
                          isChecked ? 'bg-accent/50' : 'hover:bg-secondary/40',
                        )}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors',
                          isChecked ? 'bg-primary border-primary' : 'bg-white border-slate-300',
                        )}>
                          {isChecked && <Check size={12} className="text-white" />}
                        </span>
                        <span className="font-medium text-foreground truncate flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">그룹</span>
                          {g.name}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-sm text-secondary-foreground">
            <span className="font-bold text-foreground">{picked.size}</span>개 선택됨
            {(pickedStudentCount > 0 || pickedGroupCount > 0) && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({pickedStudentCount > 0 && `학생 ${pickedStudentCount}명`}
                {pickedStudentCount > 0 && pickedGroupCount > 0 && ', '}
                {pickedGroupCount > 0 && `그룹 ${pickedGroupCount}개`})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button onClick={handleConfirm}>완료</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
