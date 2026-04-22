import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades, getInitScore, hasActualScoreChange, PAGE_SIZE_OPTIONS } from './utils'
import { isAnswerCorrect, getStudentAnswer } from '../../data/mockData'
import StudentRow from './StudentRow'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpDown, Check } from 'lucide-react'
import { DropdownSelect } from '../../components/DropdownSelect'

function SortTh({ col, children, className = '', sortBy, sortDir, onSort }) {
  const active = sortBy === col
  return (
    <button
      onClick={() => onSort(col)}
      className={cn('flex items-center justify-center gap-0.5 w-full transition-colors text-[14px] font-semibold', active ? 'text-primary' : 'text-gray-500', className)}
    >
      {children}
      <ArrowUpDown size={11} className={cn('flex-shrink-0', active ? 'text-primary' : 'text-gray-300')} style={active && sortDir === 'desc' ? { transform: 'scaleY(-1)' } : undefined} />
    </button>
  )
}

function ResponsesTab({ question, students, search, onSearch, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, changedStudentIds, onStudentChanged }) {
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [pendingScores, setPendingScores] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'submitted' | 'unsubmitted'
  const [showUngradedOnly, setShowUngradedOnly] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page on filter change
    setPage(1)
  }, [search, pageSize, sortBy, sortDir, filterStatus, showUngradedOnly])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset per question change */
    setPendingScores({})
    setSaveStatus('idle')
    setSortBy('name')
    setSortDir('asc')
    setFilterStatus('all')
    setShowUngradedOnly(false)
    isFirstRender.current = true
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
    if (isFirstRender.current) { isFirstRender.current = false; return }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- transient "saved" flash
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [gradeVersion])

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
    let list = sorted
    // 탭 필터: 응시 시작 여부 기준 (자동 0점 처리된 미시작자도 "미제출" 로 유지)
    if (filterStatus === 'submitted') list = list.filter(s => !!s.startTime)
    else if (filterStatus === 'unsubmitted') list = list.filter(s => !s.startTime)
    // 미채점만 보기 토글 (score === null): 수동채점 대기 상태 학생만
    if (showUngradedOnly) list = list.filter(s => s.score === null)
    return list
  }, [sorted, filterStatus, showUngradedOnly])

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

  const computeAutoCorrect = useCallback((student) => {
    if (!student.submitted || !question.autoGrade) return null
    const studentIdx = parseInt(student.id.replace('s', ''))
    const rawAnswer = student.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
    return isAnswerCorrect(rawAnswer, question.id)
  }, [question])

  const changedIds = useMemo(() => {
    return Object.entries(pendingScores)
      .filter(([studentId, score]) => {
        const student = students.find(s => s.id === studentId)
        if (!student) return false
        const autoCorrect = computeAutoCorrect(student)
        const initScore = getInitScore(student, question, quizId, autoCorrect)
        return hasActualScoreChange(score, initScore)
      })
      .map(([id]) => id)
  }, [pendingScores, students, question, quizId, computeAutoCorrect])

  const pendingCount = changedIds.length

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

  const handleBulkSave = () => {
    const savedIds = []
    for (const studentId of changedIds) {
      const student = students.find(s => s.id === studentId)
      if (!student) continue
      persistScore(student, pendingScores[studentId])
      savedIds.push(studentId)
    }
    setPendingScores({})
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
    onGradeSaved?.()
    savedIds.forEach(id => onStudentChanged?.(id))
  }

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
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
    onGradeSaved?.()
    onStudentChanged?.(studentId)
  }, [pendingScores, students, question, quizId, computeAutoCorrect, persistScore, onGradeSaved, onStudentChanged])

  const submittedCount = students.filter(s => !!s.startTime).length
  const unsubmittedCount = students.filter(s => !s.startTime).length
  const ungradedCount = students.filter(s => s.score === null).length

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
      <div className="px-3 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 inline-flex">
          {[
            { key: 'all',          label: '전체',    count: students.length,  dotCls: null },
            { key: 'submitted',    label: '제출완료', count: submittedCount,   dotCls: 'bg-emerald-500' },
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
        <button
          type="button"
          onClick={() => setShowUngradedOnly(v => !v)}
          aria-pressed={showUngradedOnly}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            showUngradedOnly
              ? 'bg-accent text-primary border-primary/30'
              : 'bg-white text-gray-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <Check
            size={13}
            strokeWidth={3}
            className={showUngradedOnly ? 'text-primary' : 'text-slate-300'}
          />
          미채점만 보기
        </button>
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center px-3 py-2 gap-2 border-b-2 border-slate-200 bg-slate-50">
        <div className="w-28 shrink-0 text-center"><SortTh col="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSortClick}>이름</SortTh></div>
        <div className="w-28 shrink-0 text-center"><SortTh col="studentId" sortBy={sortBy} sortDir={sortDir} onSort={handleSortClick}>학번</SortTh></div>
        <div className="flex-1 text-[14px] font-semibold text-gray-500">{question.type === 'file_upload' ? '제출 파일' : '제출 답안'}</div>
        {question.type === 'file_upload' && <div className="w-12 shrink-0 text-center text-[14px] font-semibold text-gray-500" />}
        <div className="w-28 shrink-0 text-center text-[14px] font-semibold text-gray-500">제출 일시</div>
        {question.autoGrade && <div className="w-16 shrink-0 text-center text-[14px] font-semibold text-gray-500">정답 여부</div>}
        <div className="w-40 shrink-0 text-center"><SortTh col="score" sortBy={sortBy} sortDir={sortDir} onSort={handleSortClick}>점수</SortTh></div>
      </div>

      {/* 행 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
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
