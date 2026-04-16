import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades, PAGE_SIZE_OPTIONS } from './utils'
import { getStudentAnswer, isAnswerCorrect } from '../../data/mockData'
import StudentRow from './StudentRow'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpDown } from 'lucide-react'
import { DropdownSelect } from '../../components/DropdownSelect'

function ResponsesTab({ question, students, search, onSearch, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, changedStudentIds, onStudentChanged }) {
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [pendingScores, setPendingScores] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'graded' | 'ungraded' | 'unsubmitted'
  const isFirstRender = useRef(true)

  useEffect(() => { setPage(1) }, [search, pageSize, sortBy, sortDir, filterStatus])

  useEffect(() => {
    setPendingScores({})
    setSaveStatus('idle')
    setSortBy('name')
    setSortDir('asc')
    setFilterStatus('all')
    isFirstRender.current = true
  }, [question?.id])

  useEffect(() => {
    if (!excelRows?.length) return
    const merged = {}
    excelRows.forEach(row => {
      const student = students.find(s => s.studentId === row.studentId)
      if (student) merged[student.id] = row.score
    })
    setPendingScores(prev => ({ ...prev, ...merged }))
    onExcelRowsConsumed?.()
  }, [excelRows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const list = [...students]
    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'ko')
      if (sortBy === 'studentId') cmp = a.studentId.localeCompare(b.studentId)
      if (sortBy === 'score') cmp = (a.score ?? -1) - (b.score ?? -1)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [students, sortBy, sortDir])

  const filtered = useMemo(() => {
    if (filterStatus === 'graded') return sorted.filter(s => s.submitted && s.score !== null)
    if (filterStatus === 'ungraded') return sorted.filter(s => s.submitted && s.score === null)
    if (filterStatus === 'unsubmitted') return sorted.filter(s => !s.submitted)
    return sorted
  }, [sorted, filterStatus])

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / pageSize)
  const visible = pageSize === 'all' ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSortClick = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const handleScoreChange = useCallback((studentId, score) => {
    setPendingScores(prev => ({ ...prev, [studentId]: score }))
    setSaveStatus('idle')
  }, [])

  const pendingCount = Object.values(pendingScores).filter(v => v !== '' && !isNaN(Number(v)) && Number(v) >= 0).length

  const handleBulkSave = () => {
    const grades = getLocalGrades()
    const savedIds = []
    for (const [studentId, score] of Object.entries(pendingScores)) {
      if (score === '' || isNaN(Number(score)) || Number(score) < 0) continue
      const student = students.find(s => s.id === studentId)
      if (!student) continue
      const storageKey = `${quizId}_${studentId}_${question.id}`
      grades[storageKey] = Number(score)
      if (!student.manualScores) student.manualScores = {}
      student.manualScores[question.id] = Number(score)
      const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
      const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
      student.score = autoTotal + manualTotal
      savedIds.push(studentId)
    }
    setLocalGrades(grades)
    setPendingScores({})
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
    onGradeSaved?.()
    savedIds.forEach(id => onStudentChanged?.(id))
  }

  const gradedCount = students.filter(s => s.submitted && s.score !== null).length
  const ungradedCount = students.filter(s => s.submitted && s.score === null).length
  const unsubmittedCount = students.filter(s => !s.submitted).length

  const SortTh = ({ col, children, className = '' }) => {
    const isActive = sortBy === col
    return (
      <button
        onClick={() => handleSortClick(col)}
        className={cn('flex items-center justify-center gap-0.5 w-full transition-colors text-[14px] font-semibold', isActive ? 'text-primary' : 'text-gray-500', className)}
      >
        {children}
        <ArrowUpDown size={11} className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-gray-300')} style={isActive && sortDir === 'desc' ? { transform: 'scaleY(-1)' } : undefined} />
      </button>
    )
  }

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col border border-slate-200 rounded-lg">
      {/* 툴바 */}
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
          value={pageSize}
          onChange={v => setPageSize(v === 'all' ? 'all' : Number(v))}
          options={PAGE_SIZE_OPTIONS}
          ghost
          className="w-20"
        />
        <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-2">
          {saveStatus === 'saved' && (
            <span className="text-xs font-medium text-emerald-600">저장 완료</span>
          )}
          <Button size="xs" onClick={handleBulkSave} disabled={pendingCount === 0}>
            일괄 저장
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="px-3 py-2 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 inline-flex">
          {[
            { key: 'all',          label: '전체',    count: students.length,  dotCls: null },
            { key: 'graded',       label: '채점완료', count: gradedCount,      dotCls: 'bg-emerald-500' },
            { key: 'ungraded',     label: '미채점',   count: ungradedCount,    dotCls: 'bg-amber-500' },
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
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center px-3 py-2 gap-2 border-b-2 border-slate-200 bg-slate-50">
        <div className="w-28 shrink-0 text-center"><SortTh col="name">이름</SortTh></div>
        <div className="w-28 shrink-0 text-center"><SortTh col="studentId">학번</SortTh></div>
        <div className="flex-1 text-[14px] font-semibold text-gray-500">{question.type === 'file_upload' ? '제출 파일' : '제출 답안'}</div>
        {question.type === 'file_upload' && <div className="w-12 shrink-0 text-center text-[14px] font-semibold text-gray-500" />}
        <div className="w-28 shrink-0 text-center text-[14px] font-semibold text-gray-500">제출 일시</div>
        {question.autoGrade && <div className="w-16 shrink-0 text-center text-[14px] font-semibold text-gray-500">정답 여부</div>}
        <div className="w-40 shrink-0 text-center"><SortTh col="score">점수</SortTh></div>
      </div>

      {/* 행 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">검색 결과가 없습니다</div>
        ) : (
          visible.map(s => (
            <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} isChanged={changedStudentIds?.has(s.id)} />
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
