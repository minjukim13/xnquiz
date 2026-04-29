import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades, getInitScore, hasActualScoreChange, PAGE_SIZE_OPTIONS } from './utils'
import { isAnswerCorrect, getStudentAnswer } from '../../data/mockData'
import StudentRow from './StudentRow'
import { Button } from '@/components/ui/button'
import { Search, Check, ListFilter } from 'lucide-react'
import { DropdownSelect } from '../../components/DropdownSelect'

const GRADE_STATUS_OPTIONS = [
  { key: 'graded', label: '채점 완료' },
  { key: 'ungraded', label: '미채점' },
]
const SORT_OPTIONS = [
  { value: 'name', label: '이름순' },
  { value: 'studentId', label: '학번순' },
  { value: 'submittedAt', label: '제출일시순' },
]

function ToolbarFilter({ label, options, selected, onChange, isOpen, onToggle, containerRef }) {
  const isActive = selected.length > 0
  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 h-[30px] px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap',
          isActive || isOpen
            ? 'bg-accent text-primary border-primary/30'
            : 'bg-white text-gray-700 border-slate-200 hover:bg-slate-50'
        )}
      >
        <ListFilter size={12} className={isActive ? 'text-primary' : 'text-slate-400'} />
        {label}
        {isActive && (
          <span className="text-[11px] font-bold text-primary">{selected.length}</span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 z-20 bg-white rounded-md shadow-lg border border-slate-200 min-w-[140px] py-1"
          onClick={e => e.stopPropagation()}
        >
          {options.map(opt => {
            const checked = selected.includes(opt.key)
            return (
              <label
                key={opt.key}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-[13px] font-normal text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter(k => k !== opt.key) : [...selected, opt.key])}
                  className="sr-only"
                />
                <span className={cn(
                  'w-4 h-4 inline-flex items-center justify-center rounded border shrink-0',
                  checked ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                )}>
                  {checked && <Check size={11} strokeWidth={3} className="text-white" />}
                </span>
                {opt.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResponsesTab({ question, students, search, onSearch, quizId, onGradeSaved, excelRows, onExcelRowsConsumed, changedStudentIds, onStudentChanged, clearPendingSignal }) {
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [pendingScores, setPendingScores] = useState({})
  const [sortBy, setSortBy] = useState('name')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'ontime' | 'late' | 'unsubmitted'
  const [gradeStatusFilter, setGradeStatusFilter] = useState([])
  const [openFilter, setOpenFilter] = useState(null)
  const gradeStatusFilterRef = useRef(null)

  useEffect(() => {
    if (!openFilter) return
    const handler = (e) => {
      if (gradeStatusFilterRef.current && !gradeStatusFilterRef.current.contains(e.target)) setOpenFilter(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page on filter change
    setPage(1)
  }, [search, pageSize, sortBy, filterStatus, gradeStatusFilter])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset per question change */
    setPendingScores({})
    setSortBy('name')
    setFilterStatus('all')
    setGradeStatusFilter([])
    setOpenFilter(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [question?.id])

  useEffect(() => {
    if (!excelRows?.length) return
    const merged = {}
    excelRows.forEach(row => {
      const student = students.find(s => s.studentId === row.studentId)
      if (student) merged[student.id] = row.score
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot excel merge
    setPendingScores(prev => ({ ...prev, ...merged }))
    onExcelRowsConsumed?.()
  }, [excelRows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clearPendingSignal) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- triggered by parent bulk grade
    setPendingScores({})
  }, [clearPendingSignal])

  const sorted = useMemo(() => {
    const list = [...students]
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko')
      if (sortBy === 'studentId') return a.studentId.localeCompare(b.studentId)
      if (sortBy === 'submittedAt') {
        const av = a.submittedAt ?? ''
        const bv = b.submittedAt ?? ''
        return av.localeCompare(bv)
      }
      return 0
    })
    return list
  }, [students, sortBy])

  const filtered = useMemo(() => {
    let list = sorted
    // 제출 상태 단일 선택 필터
    if (filterStatus === 'ontime') list = list.filter(s => s.submittedAt && !s.isLate)
    else if (filterStatus === 'late') list = list.filter(s => s.submittedAt && s.isLate)
    else if (filterStatus === 'unsubmitted') list = list.filter(s => !s.submittedAt)
    // 채점 상태 다중 선택 필터
    if (gradeStatusFilter.length > 0) {
      list = list.filter(s => gradeStatusFilter.includes(s.score !== null ? 'graded' : 'ungraded'))
    }
    return list
  }, [sorted, filterStatus, gradeStatusFilter])

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / pageSize)
  const visible = pageSize === 'all' ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleScoreChange = useCallback((studentId, score) => {
    setPendingScores(prev => ({ ...prev, [studentId]: score }))
  }, [])

  const computeAutoCorrect = useCallback((student) => {
    if (!student.submitted || !question.autoGrade) return null
    const studentIdx = parseInt(student.id.replace('s', ''))
    const rawAnswer = student.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
    return isAnswerCorrect(rawAnswer, question.id)
  }, [question])

  const persistScore = useCallback((student, score) => {
    const grades = getLocalGrades()
    const storageKey = `${quizId}_${student.id}_${question.id}`
    grades[storageKey] = Number(score)
    setLocalGrades(grades)
    if (!student.manualScores) student.manualScores = {}
    student.manualScores[question.id] = Number(score)
    const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
    const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
    student.score = autoTotal + manualTotal
  }, [quizId, question])

  const handleRowSave = useCallback((studentId) => {
    const score = pendingScores[studentId]
    const student = students.find(s => s.id === studentId)
    if (!student || score === undefined) return
    const autoCorrect = computeAutoCorrect(student)
    const initScore = getInitScore(student, question, quizId, autoCorrect)
    if (!hasActualScoreChange(score, initScore)) return
    persistScore(student, score)
    setPendingScores(prev => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
    onGradeSaved?.()
    onStudentChanged?.(studentId)
  }, [pendingScores, students, question, quizId, computeAutoCorrect, persistScore, onGradeSaved, onStudentChanged])

  const ontimeCount = students.filter(s => s.submittedAt && !s.isLate).length
  const lateCount = students.filter(s => s.submittedAt && s.isLate).length
  const unsubmittedCount = students.filter(s => !s.submittedAt).length

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col border border-slate-200 rounded-lg">
      {/* 필터: 제출 상태 세그먼트 + 채점 상태 필터 */}
      <div className="px-3 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 inline-flex flex-wrap">
          {[
            { key: 'all',          label: '전체',     count: students.length,  dotCls: null },
            { key: 'ontime',       label: '정상제출', count: ontimeCount,      dotCls: 'bg-emerald-500' },
            { key: 'late',         label: '지각제출', count: lateCount,        dotCls: 'bg-amber-500' },
            { key: 'unsubmitted',  label: '미제출',   count: unsubmittedCount, dotCls: 'bg-gray-300' },
          ].map(({ key, label, count, dotCls }) => {
            const isActive = filterStatus === key
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  isActive ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500'
                )}
              >
                {dotCls && (
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block', dotCls)} />
                )}
                {label}
                <span className={cn('text-xs font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <ToolbarFilter
          containerRef={gradeStatusFilterRef}
          label="채점 상태"
          options={GRADE_STATUS_OPTIONS}
          selected={gradeStatusFilter}
          onChange={setGradeStatusFilter}
          isOpen={openFilter === 'gradeStatus'}
          onToggle={() => setOpenFilter(prev => prev === 'gradeStatus' ? null : 'gradeStatus')}
        />
      </div>

      {/* 툴바: 검색 + 정렬 + 페이지 크기 */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="이름 또는 학번"
            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:outline-none"
          />
        </div>
        <DropdownSelect
          size="sm"
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          ghost
          className="w-28"
        />
        <DropdownSelect
          size="sm"
          value={pageSize}
          onChange={v => setPageSize(v === 'all' ? 'all' : Number(v))}
          options={PAGE_SIZE_OPTIONS}
          ghost
          className="w-20"
        />
      </div>

      {/* 학생 카드 리스트 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50/30">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">검색 결과가 없습니다</div>
        ) : (
          visible.map(s => (
            <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} isChanged={changedStudentIds?.has(s.id)} onRowSave={handleRowSave} />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
          <span className="text-xs text-muted-foreground">{page} / {totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>이전</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon-xs" onClick={() => setPage(p)}>
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponsesTab
