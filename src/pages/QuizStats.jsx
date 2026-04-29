import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { AlertCircle, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, ListFilter } from 'lucide-react'
import { downloadGradesXlsx, downloadItemAnalysisXlsx } from '../utils/excelUtils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { QUIZ_TYPES } from '../data/mockData'
import { getQuiz, getQuizQuestions, listAttempts } from '@/lib/data'
import { getLateThreshold } from '../utils/deadlineUtils'
import { useRole } from '../context/role'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '../components/PageHeader'

function CollapsibleDescription({ text }) {
  const ref = useRef(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      if (!expanded) setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, expanded])

  return (
    <div>
      <p
        ref={ref}
        className={cn('text-xs text-muted-foreground whitespace-pre-line', !expanded && 'line-clamp-2')}
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline underline-offset-2"
        >
          {expanded ? '접기' : '펼치기'}
        </button>
      )}
    </div>
  )
}

function TypeBadge({ type }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
      {cfg.label}
    </Badge>
  )
}

function variance(arr) {
  if (arr.length < 2) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
}

// 문항 배열에 mock 의 avgScore / gradedCount / totalCount 필드가 없는 경우 (api 모드)
// attempts 에서 실시간 집계해 덧붙인다. mock 모드는 이미 포함된 값을 유지.
function enrichQuestions(questions, students) {
  const submittedStudents = students.filter(s => s.submitted)
  const totalCount = submittedStudents.length
  return questions.map(q => {
    if (q.avgScore != null || q.gradedCount != null) return q // mock
    let sum = 0
    let cnt = 0
    for (const s of submittedStudents) {
      const auto = s.autoScores?.[q.id]
      const manual = s.manualScores?.[q.id]
      if (auto == null && manual == null) continue
      sum += (auto ?? 0) + (manual ?? 0)
      cnt++
    }
    return {
      ...q,
      totalCount,
      gradedCount: cnt,
      avgScore: cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : null,
    }
  })
}

export default function QuizStats() {
  const { id } = useParams()
  const { role } = useRole()
  const [quiz, setQuiz] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizStudents, setQuizStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const [q, qq, qs] = await Promise.all([
          getQuiz(id),
          getQuizQuestions(id),
          listAttempts({ quizId: id }),
        ])
        if (!mounted) return
        setQuiz(q)
        setQuizQuestions(qq ?? [])
        setQuizStudents(qs ?? [])
      } catch (err) {
        console.error('[QuizStats] 로드 실패', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const enrichedQuestions = useMemo(
    () => enrichQuestions(quizQuestions, quizStudents),
    [quizQuestions, quizStudents]
  )

  if (role !== 'instructor') return <Navigate to="/" replace />

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">불러오는 중</p>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-700" />
        <p className="text-sm font-medium mb-1 text-foreground">퀴즈를 찾을 수 없습니다</p>
        <Link to="/" className="text-xs text-primary hover:underline">퀴즈 목록으로 돌아가기</Link>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto pb-10">
        <PageHeader
          ariaLabel="뒤로가기"
          title={
            <Link
              to={`/quiz/${quiz.id}`}
              className="block text-[22px] font-bold text-foreground leading-tight truncate"
            >
              {quiz.title}
            </Link>
          }
          actions={
            <Button asChild>
              <Link to={`/quiz/${quiz.id}/grade`}>채점</Link>
            </Button>
          }
          meta={
            <>
              <Badge className="bg-accent text-primary border-0">{quiz.week}주차 {quiz.session}차시</Badge>
              <span className="text-xs text-muted-foreground">
                {quiz.startDate || quiz.dueDate
                  ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}`
                  : '응시 기간 제한 없음'}
              </span>
            </>
          }
          description={quiz.description ? <CollapsibleDescription text={quiz.description} /> : null}
        />

        <StatsPageTabs quiz={quiz} quizQuestions={enrichedQuestions} quizStudents={quizStudents} />
      </div>
    </>
  )
}

function calcElapsed(startTime, submittedAt) {
  if (!startTime || !submittedAt) return null
  const start = new Date(startTime.replace(' ', 'T'))
  const end   = new Date(submittedAt.replace(' ', 'T'))
  const total = Math.round((end - start) / 1000)
  if (isNaN(total) || total < 0) return null
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

function StatsPageTabs({ quiz, quizQuestions, quizStudents }) {
  const [activeTab, setActiveTab] = useState('grades')
  return (
    <>
      <div className="flex items-center border-b border-border mb-5 h-11 px-2">
        <div className="flex items-center gap-6 h-full">
          {[
            { key: 'grades', label: '학생별 성적 조회' },
            { key: 'stats', label: '퀴즈 통계' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'h-full flex items-center text-sm -mb-px border-b-2 transition-colors',
                activeTab === key
                  ? 'border-black text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground font-medium hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-2">
        {activeTab === 'grades'
          ? <GradesTab quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />
          : <StatsTab quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />
        }
      </div>
    </>
  )
}

const SUBMIT_FILTER_OPTIONS = [
  { key: 'ontime', label: '정상제출' },
  { key: 'late', label: '지각제출' },
  { key: 'unsubmitted', label: '미제출' },
]
const GRADE_FILTER_OPTIONS = [
  { key: 'graded', label: '채점 완료' },
  { key: 'ungraded', label: '미채점' },
]

function ColumnFilter({ label, options, selected, onChange, isOpen, onToggle, containerRef }) {
  const isActive = selected.length > 0
  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group inline-flex items-center gap-1 text-[13px] font-medium transition-colors',
          isActive || isOpen ? 'text-primary' : 'text-secondary-foreground hover:text-foreground'
        )}
      >
        {label}
        <ListFilter
          size={12}
          className={cn(
            'transition-opacity',
            isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'
          )}
        />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-white rounded-md shadow-lg border border-border min-w-[140px] py-1"
          onClick={e => e.stopPropagation()}
        >
          {options.map(opt => {
            const checked = selected.includes(opt.key)
            return (
              <label
                key={opt.key}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/50 cursor-pointer text-[13px] font-normal text-foreground"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter(k => k !== opt.key) : [...selected, opt.key])}
                  className="sr-only"
                />
                <span className={cn(
                  'w-4 h-4 inline-flex items-center justify-center rounded border shrink-0',
                  checked ? 'bg-primary border-primary' : 'bg-white border-border'
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

function GradesTab({ quiz, quizQuestions, students: allStudents }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [submitFilter, setSubmitFilter] = useState([])
  const [gradeFilter, setGradeFilter] = useState([])
  const [openFilter, setOpenFilter] = useState(null)
  const submitFilterRef = useRef(null)
  const gradeFilterRef = useRef(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const totalPoints = quizQuestions.reduce((s, q) => s + (q.points || 0), 0)

  useEffect(() => {
    if (!openFilter) return
    const handler = (e) => {
      const ref = openFilter === 'submit' ? submitFilterRef : gradeFilterRef
      if (ref.current && !ref.current.contains(e.target)) setOpenFilter(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openFilter])

  // 응시 시작 여부 기준 분류 (자동 0점 처리된 미시작자도 '미제출' 로 유지)
  const submittedStarted = allStudents.filter(s => !!s.startTime)
  const unsubmitted = allStudents.filter(s => !s.startTime)

  const lateThreshold = getLateThreshold(quiz)
  const getSubmissionStatus = (s) => {
    if (!s.submittedAt) return 'unsubmitted'
    if (lateThreshold) {
      const submittedDate = new Date(s.submittedAt.replace(' ', 'T'))
      if (submittedDate > lateThreshold) return 'late'
    }
    return 'ontime'
  }

  const filtered = useMemo(() => {
    const submitOf = (s) => {
      if (!s.submittedAt) return 'unsubmitted'
      if (lateThreshold) {
        const submittedDate = new Date(s.submittedAt.replace(' ', 'T'))
        if (submittedDate > lateThreshold) return 'late'
      }
      return 'ontime'
    }
    let base = filterStatus === 'unsubmitted' ? unsubmitted
      : filterStatus === 'submitted' ? submittedStarted
      : allStudents
    if (submitFilter.length > 0) {
      base = base.filter(s => submitFilter.includes(submitOf(s)))
    }
    if (gradeFilter.length > 0) {
      base = base.filter(s => gradeFilter.includes(s.score !== null ? 'graded' : 'ungraded'))
    }
    let list = base.filter(s => {
      if (search !== '' && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.studentId.includes(search)) return false
      return true
    })
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let av, bv
        if (sortKey === 'name')        { av = a.name;        bv = b.name }
        if (sortKey === 'studentId')   { av = a.studentId;   bv = b.studentId }
        if (sortKey === 'department')  { av = a.department;  bv = b.department }
        if (sortKey === 'submittedAt') { av = a.submittedAt ?? ''; bv = b.submittedAt ?? '' }
        if (sortKey === 'elapsed') {
          const toSec = s => {
            if (!s.startTime || !s.submittedAt) return -1
            return Math.round((new Date(s.submittedAt.replace(' ', 'T')) - new Date(s.startTime.replace(' ', 'T'))) / 1000)
          }
          av = toSec(a); bv = toSec(b)
        }
        if (sortKey === 'score') { av = a.score ?? -1; bv = b.score ?? -1 }
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return sortDir === 'asc' ? av - bv : bv - av
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lateThreshold 는 quiz 변경 시에만 변하므로 allStudents 와 함께 무효화됨
  }, [allStudents, submittedStarted, unsubmitted, search, filterStatus, submitFilter, gradeFilter, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const downloadCSV = () => downloadGradesXlsx(quiz, allStudents.filter(s => s.submitted), quizQuestions)

  return (
    <div>
      {/* 요약 필터 */}
      <div className="flex items-center gap-2 mb-5">
        <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-secondary">
          {[
            { key: 'all', label: '전체', value: allStudents.length, dotCls: null },
            { key: 'submitted', label: '제출완료', value: submittedStarted.length, dotCls: 'bg-emerald-500' },
            { key: 'unsubmitted', label: '미제출', value: unsubmitted.length, dotCls: 'bg-gray-300' },
          ].map(({ key, label, value, dotCls }) => {
            const isActive = filterStatus === key
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all',
                  isActive ? 'bg-white shadow-sm' : 'bg-transparent'
                )}
              >
                {dotCls && <span className={cn('w-1.5 h-1.5 rounded-full', dotCls)} />}
                <span className={isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>{label}</span>
                <span className={cn('font-bold text-xs', isActive ? 'text-primary' : 'text-muted-foreground')}>{value}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 검색 + 다운로드 */}
      <div className="flex items-center justify-between mb-3">
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="학생 이름 또는 학번 검색"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full text-sm pl-8 py-2 border border-border rounded-md bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <Button variant="outline" onClick={downloadCSV}>
          <Download size={14} />
          성적 다운로드
        </Button>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: 'name', label: '이름', align: 'left', kind: 'sort' },
                  { key: 'studentId', label: '학번', align: 'center', kind: 'sort' },
                  { key: 'department', label: '학과', align: 'left', kind: 'sort' },
                  { key: 'elapsed', label: '소요 시간', align: 'center', kind: 'sort' },
                  { key: 'submit', label: '제출 상태', align: 'center', kind: 'filter' },
                  { key: 'submittedAt', label: '제출 일시', align: 'center', kind: 'sort' },
                  { key: 'score', label: `점수 / ${totalPoints}점`, align: 'center', kind: 'sort' },
                  { key: 'grade', label: '채점 상태', align: 'center', kind: 'filter' },
                  { key: null, label: '답안', align: 'center', kind: 'plain' },
                ].map(({ key, label, align, kind }) => (
                  <th key={label || '_action'} className={cn('px-4 py-2 whitespace-nowrap', `text-${align}`)}>
                    {kind === 'sort' ? (
                      <button
                        onClick={() => handleSort(key)}
                        className={cn('group inline-flex items-center gap-1 text-[13px] font-medium transition-colors', align === 'center' && 'justify-center', sortKey === key ? 'text-primary' : 'text-secondary-foreground')}
                      >
                        {label}
                        {sortKey !== key && <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
                        {sortKey === key && sortDir === 'desc' && <ArrowDown size={12} />}
                        {sortKey === key && sortDir === 'asc' && <ArrowUp size={12} />}
                      </button>
                    ) : kind === 'filter' ? (
                      <ColumnFilter
                        containerRef={key === 'submit' ? submitFilterRef : gradeFilterRef}
                        label={label}
                        options={key === 'submit' ? SUBMIT_FILTER_OPTIONS : GRADE_FILTER_OPTIONS}
                        selected={key === 'submit' ? submitFilter : gradeFilter}
                        onChange={key === 'submit' ? setSubmitFilter : setGradeFilter}
                        isOpen={openFilter === key}
                        onToggle={() => setOpenFilter(prev => prev === key ? null : key)}
                      />
                    ) : (
                      <span className="text-[13px] font-medium text-secondary-foreground">{label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const scorePct = s.score !== null ? Math.round((s.score / totalPoints) * 100) : null
                const elapsed = calcElapsed(s.startTime, s.submittedAt)
                const submitStatus = getSubmissionStatus(s)
                return (
                  <tr key={s.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.studentId}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.department}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap text-secondary-foreground">
                      {elapsed ?? <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {submitStatus === 'ontime' ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700">정상제출</span>
                      ) : submitStatus === 'late' ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700">지각제출</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground">미제출</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap text-secondary-foreground">
                      {s.submittedAt ? s.submittedAt.split(' ')[1] : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {s.score !== null
                        ? <span className={cn('font-semibold', scorePct >= 80 ? 'text-primary' : scorePct >= 60 ? 'text-secondary-foreground' : 'text-red-500')}>{s.score}점</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {s.score !== null ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground">채점 완료</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-600">미채점</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Button asChild variant="outline" size="xs">
                        <Link to={`/quiz/${quiz.id}/grade`}>답안 확인</Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">검색 결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatsTab({ quiz, quizQuestions, students: allStudents }) {
  const totalPoints = quizQuestions.reduce((s, q) => s + (q.points || 0), 0)
  // 응시 시작 여부 기준 분류 (자동 0점 처리된 미시작자도 '미제출' 로 유지)
  const submittedStarted = allStudents.filter(s => !!s.startTime)
  const unsubmittedList  = allStudents.filter(s => !s.startTime)
  const graded           = allStudents.filter(s => s.submitted && s.score !== null)
  const pendingGrade     = submittedStarted.filter(s => s.score === null)
  const scores           = graded.map(s => s.score)

  const avg  = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const maxScore = scores.length ? Math.max(...scores) : 0
  const minScore = scores.length ? Math.min(...scores) : 0
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler optimization miss, 수동 memoization 유지
  const stdev = useMemo(() => Math.sqrt(variance(scores)), [scores])

  const submitRate = quiz.totalStudents > 0 ? ((submittedStarted.length / quiz.totalStudents) * 100).toFixed(1) : 0
  const gradeRate  = quiz.totalStudents > 0 ? ((graded.length / quiz.totalStudents) * 100).toFixed(1) : 0

  const durations = submittedStarted
    .filter(s => s.endTime)
    .map(s => {
      const [sh, sm] = s.startTime.split(' ')[1].split(':').map(Number)
      const [eh, em] = s.endTime.split(' ')[1].split(':').map(Number)
      return (eh * 60 + em) - (sh * 60 + sm)
    })
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  // 점수 분포: totalPoints 에 따라 1점 단위 또는 5점/10점 단위로 자동 binning
  const binSize = totalPoints >= 80 ? 10 : totalPoints >= 30 ? 5 : 1
  const binFreq = {}
  scores.forEach(s => {
    const b = Math.floor(s / binSize) * binSize
    binFreq[b] = (binFreq[b] || 0) + 1
  })
  const minBin = Math.floor(minScore / binSize) * binSize
  const maxBin = Math.floor(maxScore / binSize) * binSize
  const distData = scores.length
    ? Array.from({ length: (maxBin - minBin) / binSize + 1 }, (_, i) => {
        const lo = minBin + i * binSize
        const label = binSize === 1 ? `${lo}점` : `${lo}~${lo + binSize - 1}점`
        return { score: label, count: binFreq[lo] || 0, raw: lo }
      })
    : []

  const qRateData = quizQuestions.map(q => ({
    label: `Q${q.order}`,
    rate: q.avgScore != null ? Math.round((q.avgScore / q.points) * 100) : 0,
    hasData: q.avgScore != null,
    type: q.type,
    gradedCount: q.gradedCount,
    totalCount: q.totalCount,
  }))

  const sortedScores = [...scores].sort((a, b) => a - b)
  const p27 = sortedScores[Math.floor(sortedScores.length * 0.27)] ?? '-'
  const p73 = sortedScores[Math.floor(sortedScores.length * 0.73)] ?? '-'

  const qTableData = quizQuestions.map(q => {
    const rate = q.avgScore != null ? Math.round((q.avgScore / q.points) * 100) : null
    const difficulty = rate == null ? null
      : rate >= 70 ? { label: '쉬움' }
      : rate >= 40 ? { label: '보통' }
      : { label: '어려움' }
    return { ...q, rate, difficulty }
  })

  return (
    <div className="space-y-4">
      {/* 요약 지표 — 평균 점수 메인 + 보조 메트릭 인라인 */}
      <Card className="px-6 py-5">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">평균 점수</p>
            <p className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[40px] font-bold text-primary">{avg.toFixed(1)}</span>
              <span className="text-base text-muted-foreground">/ {totalPoints}점</span>
            </p>
          </div>
          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
            {[
              { label: '최고', value: `${maxScore}점` },
              { label: '최저', value: `${minScore}점` },
              { label: '표준편차', value: `±${stdev.toFixed(1)}점` },
              { label: '응시율', value: `${submitRate}%` },
              { label: '평균 응시시간', value: avgDuration != null ? `${avgDuration}분` : '-' },
            ].map(m => (
              <div key={m.label} className="flex items-baseline gap-1.5">
                <dt className="text-xs text-muted-foreground">{m.label}</dt>
                <dd className="text-sm font-semibold text-foreground">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      {/* 점수 분포 + 응시 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">점수 분포</h3>
            <span className="text-xs text-muted-foreground">
              응시 {submittedStarted.length}명 중 채점 완료 {graded.length}명 기준 (미채점 {pendingGrade.length}명 제외)
            </span>
          </div>
          {graded.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/40">채점 완료된 학생이 없습니다</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} formatter={(val) => [`${val}명`, '인원']} />
                <ReferenceLine x={(() => {
                  const lo = Math.floor(Math.round(avg) / binSize) * binSize
                  return binSize === 1 ? `${lo}점` : `${lo}~${lo + binSize - 1}점`
                })()} stroke="var(--primary)" strokeDasharray="3 3" label={{ value: '평균', position: 'top', fontSize: 10, fill: 'var(--primary)' }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {distData.map((d, i) => {
                    const avgLo = Math.floor(Math.round(avg) / binSize) * binSize
                    return (
                      <Cell key={i} fill={d.raw === avgLo ? 'var(--primary)' : '#BFD6FF'} />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">응시 현황</h3>
          <div className="space-y-3">
            {[
              { label: '수강 인원', value: quiz.totalStudents, barColor: '#B0B8C1' },
              { label: '응시 완료', value: submittedStarted.length, barColor: 'var(--primary)', rate: submitRate },
              { label: '미제출', value: unsubmittedList.length, barColor: '#FDA4AF', rate: quiz.totalStudents > 0 ? ((unsubmittedList.length / quiz.totalStudents) * 100).toFixed(1) : 0 },
              { label: '채점 완료', value: graded.length, barColor: '#93C5FD', rate: gradeRate },
              { label: '채점 대기', value: pendingGrade.length, barColor: '#FDA4AF' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary-foreground">{item.label}</span>
                  <span className="font-semibold text-secondary-foreground">{item.value}명{item.rate ? ` (${item.rate}%)` : ''}</span>
                </div>
                <div className="h-1.5 rounded overflow-hidden bg-secondary">
                  <div className="h-full rounded" style={{ width: `${(item.value / quiz.totalStudents) * 100}%`, background: item.barColor }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 space-y-2 border-t border-border">
            <p className="text-xs font-medium mb-2 text-secondary-foreground">점수 분포 구간 (채점 완료 기준)</p>
            {[
              { label: '상위 27%', value: `${p73}점 이상`, cls: 'text-green-700' },
              { label: '중위 46%', value: `${p27}~${p73}점`, cls: 'text-secondary-foreground' },
              { label: '하위 27%', value: `${p27}점 미만`, cls: 'text-red-600' },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn('font-medium', row.cls)}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 문항별 득점률 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">문항별 득점률</h3>
          <span className="text-xs text-muted-foreground">채점된 학생 기준 실시간 집계</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={qRateData} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={32} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} formatter={(val, _name, props) => [props.payload.hasData ? `${val}%` : '채점 데이터 없음', `${props.payload.label} 득점률`]} />
            <ReferenceLine x={70} stroke="#86EFAC" strokeDasharray="3 3" label={{ value: '70%', position: 'right', fontSize: 10, fill: '#6BD895' }} />
            <ReferenceLine x={40} stroke="#FDA4AF" strokeDasharray="3 3" label={{ value: '40%', position: 'right', fontSize: 10, fill: '#F08D99' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', fontSize: 11, fill: 'var(--muted-foreground)', formatter: v => `${v}%` }}>
              {qRateData.map((q, i) => (
                <Cell key={i} fill={!q.hasData ? '#D1D5DB' : q.rate >= 70 ? '#86EFAC' : q.rate >= 40 ? '#FDBA74' : '#FDA4AF'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[
            { color: '#86EFAC', label: '70% 이상 (쉬움)' },
            { color: '#FDBA74', label: '40~69% (보통)' },
            { color: '#FDA4AF', label: '40% 미만 (어려움)' },
            { color: '#D1D5DB', label: '채점 전' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-secondary-foreground">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </Card>

      {/* 문항별 상세 통계 테이블 */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">문항별 상세 통계</h3>
            <span className="block text-xs text-muted-foreground mt-0.5">총 {quizQuestions.length}문항 · {totalPoints}점 만점</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadItemAnalysisXlsx(quiz, quizQuestions, allStudents)}>
            <Download size={12} />
            문항 분석 (.xlsx)
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary border-b-2 border-border">
                {[
                  { label: '문항', center: true },
                  { label: '유형', center: false },
                  { label: '배점', center: true },
                  { label: '평균 점수', center: true },
                  { label: '득점률', center: false },
                  { label: '난이도', center: true, tip: '득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움' },
                  { label: '채점 현황', center: true },
                ].map(({ label, center, tip }) => (
                  <th key={label} title={tip ?? ''} className={cn('px-4 py-2.5 font-semibold whitespace-nowrap text-[11px] text-secondary-foreground', center ? 'text-center' : 'text-left', tip && 'cursor-help')}>
                    {label}{tip && <span className="text-muted-foreground/40 ml-0.5">ⓘ</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qTableData.map((q, i) => (
                <tr key={q.id} className={cn('border-b border-border hover:bg-accent/30 transition-colors', i % 2 !== 0 && 'bg-secondary/50')}>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className="bg-accent text-primary border-0">Q{q.order}</Badge>
                  </td>
                  <td className="px-4 py-2.5"><TypeBadge type={q.type} /></td>
                  <td className="px-4 py-2.5 text-center font-medium text-secondary-foreground">{q.points}점</td>
                  <td className="px-4 py-2.5 text-center text-secondary-foreground">
                    {q.avgScore != null ? `${q.avgScore}점` : <span className="text-muted-foreground/40">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded overflow-hidden bg-secondary">
                        <div className={cn('h-full rounded', !q.rate ? 'bg-border' : q.rate >= 70 ? 'bg-correct' : q.rate >= 40 ? 'bg-amber-500' : 'bg-destructive')} style={{ width: `${q.rate ?? 0}%` }} />
                      </div>
                      <span className={cn('font-medium', q.avgScore != null ? 'text-secondary-foreground' : 'text-muted-foreground/40')}>
                        {q.avgScore != null ? `${q.rate}%` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {q.difficulty ? (
                      <Badge variant="secondary" className={cn('text-xs',
                        q.difficulty.label === '쉬움' && 'bg-green-50 text-green-700',
                        q.difficulty.label === '보통' && 'bg-orange-50 text-orange-700',
                        q.difficulty.label === '어려움' && 'bg-red-50 text-red-600',
                      )}>
                        {q.difficulty.label}
                      </Badge>
                    ) : <span className="text-muted-foreground/40">-</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {q.gradedCount >= q.totalCount ? (
                      <span className="font-medium text-green-700">완료</span>
                    ) : (
                      <span className="text-orange-700">{q.gradedCount}/{q.totalCount}명</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border bg-secondary">
          <span className="text-xs text-muted-foreground">
            난이도(득점률 기준): <span className="text-correct">≥70%</span> 쉬움 / <span className="text-amber-500">40~69%</span> 보통 / <span className="text-destructive">&lt;40%</span> 어려움
          </span>
        </div>
      </Card>
    </div>
  )
}
