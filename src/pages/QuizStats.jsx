import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { downloadGradesXlsx, downloadItemAnalysisXlsx } from '../utils/excelUtils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import Layout from '../components/Layout'
import { mockQuizzes, getQuizStudents, QUIZ_TYPES, getQuizQuestions } from '../data/mockData'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function TypeBadge({ type }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
      {cfg.label}
    </Badge>
  )
}

function variance(arr) {
  if (arr.length < 2) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
}

export default function QuizStats() {
  const { id } = useParams()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const quizQuestions = getQuizQuestions(id)
  const quizStudents = getQuizStudents(id)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-10 pt-6">

        {/* 퀴즈 정보 헤더 */}
        <div className="px-4 pt-2.5 pb-3.5 mb-4 border border-border rounded-xl">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <Badge className="bg-accent text-primary border-0">{quiz.week}주차 {quiz.session}차시</Badge>
            <div className="flex gap-2 shrink-0">
              <Button asChild className="font-semibold">
                <Link to={`/quiz/${quiz.id}/grade`}>채점 대시보드</Link>
              </Button>
              <Button asChild variant="secondary" className="font-semibold">
                <Link to="/">목록으로</Link>
              </Button>
            </div>
          </div>
          <h2 className="text-base font-bold">{quiz.title}</h2>
          {quiz.description && <p className="text-xs mt-1.5 text-slate-500">{quiz.description}</p>}
          <p className="text-xs mt-1 text-muted-foreground">{quiz.startDate} ~ {quiz.dueDate}</p>
        </div>

        {/* 탭 */}
        <StatsPageTabs quiz={quiz} quizQuestions={quizQuestions} quizStudents={quizStudents} />
      </div>
    </Layout>
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
      <div className="flex items-center border-b border-gray-200 mb-5 h-11 px-2">
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
                  ? 'border-black text-gray-900 font-semibold'
                  : 'border-transparent text-gray-500 font-medium hover:text-gray-700'
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

function GradesTab({ quiz, students: allStudents }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const submitted = allStudents.filter(s => s.submitted)
  const unsubmitted = allStudents.filter(s => !s.submitted)
  const gradedCount = submitted.filter(s => s.score !== null).length
  const ungradedCount = submitted.length - gradedCount

  const filtered = useMemo(() => {
    let base = filterStatus === 'unsubmitted' ? unsubmitted
      : filterStatus === 'graded' ? submitted.filter(s => s.score !== null)
      : filterStatus === 'ungraded' ? submitted.filter(s => s.score === null)
      : allStudents
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
  }, [allStudents, submitted, unsubmitted, search, filterStatus, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const downloadCSV = () => downloadGradesXlsx(quiz, submitted)

  return (
    <div>
      {/* 요약 필터 */}
      <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 mb-5">
        {[
          { key: 'all', label: '전체', value: allStudents.length, dotCls: null },
          { key: 'graded', label: '채점완료', value: gradedCount, dotCls: 'bg-emerald-500' },
          { key: 'ungraded', label: '미채점', value: ungradedCount, dotCls: 'bg-amber-500' },
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
              <span className={isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}>{label}</span>
              <span className={cn('font-bold text-xs', isActive ? 'text-primary' : 'text-gray-400')}>{value}</span>
            </button>
          )
        })}
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
              <tr className="bg-slate-50 border-b border-border">
                {[
                  { key: 'name', label: '이름', align: 'left' },
                  { key: 'studentId', label: '학번', align: 'center' },
                  { key: 'department', label: '학과', align: 'left' },
                  { key: 'elapsed', label: '소요 시간', align: 'center' },
                  { key: 'submittedAt', label: '제출 일시', align: 'center' },
                  { key: 'score', label: `점수 / ${quiz.totalPoints}점`, align: 'center' },
                  { key: null, label: '상태', align: 'center' },
                  { key: null, label: '답안', align: 'center' },
                ].map(({ key, label, align }) => (
                  <th key={label || '_action'} className={cn('px-4 py-2 whitespace-nowrap', `text-${align}`)}>
                    {key ? (
                      <button
                        onClick={() => handleSort(key)}
                        className={cn('group inline-flex items-center gap-1 text-[13px] font-medium transition-colors', align === 'center' && 'justify-center', sortKey === key ? 'text-primary' : 'text-slate-600')}
                      >
                        {label}
                        {sortKey !== key && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
                        {sortKey === key && sortDir === 'desc' && <ArrowDown size={12} />}
                        {sortKey === key && sortDir === 'asc' && <ArrowUp size={12} />}
                      </button>
                    ) : (
                      <span className="text-[13px] font-medium text-slate-600">{label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const scorePct = s.score !== null ? Math.round((s.score / quiz.totalPoints) * 100) : null
                const elapsed = calcElapsed(s.startTime, s.submittedAt)
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{s.studentId}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.department}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-700">
                      {elapsed ?? <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap text-slate-700">
                      {s.submittedAt ? s.submittedAt.split(' ')[1] : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {s.score !== null
                        ? <span className={cn('font-semibold', scorePct >= 80 ? 'text-primary' : scorePct >= 60 ? 'text-slate-600' : 'text-red-500')}>{s.score}점</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {s.score !== null ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-500">채점 완료</span>
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">검색 결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatsTab({ quiz, quizQuestions, students: allStudents }) {
  const submitted = allStudents.filter(s => s.submitted)
  const graded    = submitted.filter(s => s.score !== null)
  const scores    = graded.map(s => s.score)

  const avg  = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const maxScore = scores.length ? Math.max(...scores) : 0
  const minScore = scores.length ? Math.min(...scores) : 0
  const stdev = useMemo(() => Math.sqrt(variance(scores)), [scores])

  const submitRate = ((quiz.submitted / quiz.totalStudents) * 100).toFixed(1)
  const gradeRate  = quiz.submitted > 0 ? ((quiz.graded / quiz.submitted) * 100).toFixed(1) : 0

  const durations = submitted
    .filter(s => s.endTime)
    .map(s => {
      const [sh, sm] = s.startTime.split(' ')[1].split(':').map(Number)
      const [eh, em] = s.endTime.split(' ')[1].split(':').map(Number)
      return (eh * 60 + em) - (sh * 60 + sm)
    })
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  const scoreFreq = {}
  scores.forEach(s => { scoreFreq[s] = (scoreFreq[s] || 0) + 1 })
  const distData = scores.length
    ? Array.from({ length: maxScore - minScore + 1 }, (_, i) => {
        const s = minScore + i
        return { score: `${s}점`, count: scoreFreq[s] || 0, raw: s }
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
      {/* 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '평균 점수', value: avg.toFixed(1), unit: `/ ${quiz.totalPoints}점`, accent: true },
          { label: '최고 점수', value: maxScore, unit: '점' },
          { label: '최저 점수', value: minScore, unit: '점' },
          { label: '표준편차', value: `±${stdev.toFixed(1)}`, unit: '점' },
          { label: '응시율', value: submitRate, unit: '%' },
          { label: '평균 응시시간', value: avgDuration ?? '-', unit: '분' },
        ].map(item => (
          <Card key={item.label} className="p-3 text-center">
            <div className="flex items-baseline justify-center gap-1 leading-none">
              <span className={cn('text-xl font-bold', item.accent ? 'text-primary' : '')}>{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.unit}</span>
            </div>
            <div className="text-xs mt-1.5 text-slate-600">{item.label}</div>
          </Card>
        ))}
      </div>

      {/* 점수 분포 + 응시 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">점수 분포</h3>
            <span className="text-xs text-muted-foreground">
              제출 {quiz.submitted}명 중 채점 완료 {graded.length}명 기준 (미채점 {quiz.submitted - graded.length}명 제외)
            </span>
          </div>
          {graded.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-muted-foreground/40">채점 완료된 학생이 없습니다</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} formatter={(val) => [`${val}명`, '인원']} />
                <ReferenceLine x={`${Math.round(avg)}점`} stroke="var(--primary)" strokeDasharray="3 3" label={{ value: '평균', position: 'top', fontSize: 10, fill: 'var(--primary)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((d, i) => (
                    <Cell key={i} fill={d.raw === Math.round(avg) ? 'var(--primary)' : 'var(--accent)'} />
                  ))}
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
              { label: '제출 완료', value: quiz.submitted, barColor: 'var(--primary)', rate: submitRate },
              { label: '미제출', value: quiz.totalStudents - quiz.submitted, barColor: '#FDA4AF', rate: (100 - parseFloat(submitRate)).toFixed(1) },
              { label: '채점 완료', value: quiz.graded, barColor: '#93C5FD', rate: gradeRate },
              { label: '채점 대기', value: quiz.pendingGrade, barColor: '#FDA4AF' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-700">{item.value}명{item.rate ? ` (${item.rate}%)` : ''}</span>
                </div>
                <div className="h-1.5 rounded overflow-hidden bg-slate-200">
                  <div className="h-full rounded" style={{ width: `${(item.value / quiz.totalStudents) * 100}%`, background: item.barColor }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 space-y-2 border-t border-border">
            <p className="text-xs font-medium mb-2 text-slate-600">점수 분포 구간 (채점 완료 기준)</p>
            {[
              { label: '상위 27%', value: `${p73}점 이상`, cls: 'text-green-700' },
              { label: '중위 46%', value: `${p27}~${p73}점`, cls: 'text-slate-700' },
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
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">문항별 득점률</h3>
          <span className="text-xs text-muted-foreground">채점된 학생 기준 실시간 집계</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={qRateData} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} formatter={(val, _name, props) => [props.payload.hasData ? `${val}%` : '채점 데이터 없음', `${props.payload.label} 득점률`]} />
            <ReferenceLine x={70} stroke="#86EFAC" strokeDasharray="3 3" label={{ value: '70%', position: 'right', fontSize: 10, fill: '#6BD895' }} />
            <ReferenceLine x={40} stroke="#FDA4AF" strokeDasharray="3 3" label={{ value: '40%', position: 'right', fontSize: 10, fill: '#F08D99' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--muted-foreground)', formatter: v => `${v}%` }}>
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
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </Card>

      {/* 문항별 상세 통계 테이블 */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <h3 className="text-sm font-semibold">문항별 상세 통계</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">총 {quizQuestions.length}문항 · {quiz.totalPoints}점 만점</span>
            <Button variant="outline" size="sm" onClick={() => downloadItemAnalysisXlsx(quiz, quizQuestions, allStudents)}>
              <Download size={12} />
              문항 분석 (.xlsx)
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-border">
                {[
                  { label: '문항', center: true },
                  { label: '유형', center: false },
                  { label: '배점', center: true },
                  { label: '평균 점수', center: true },
                  { label: '득점률', center: false },
                  { label: '난이도', center: true, tip: '득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움' },
                  { label: '채점 현황', center: true },
                ].map(({ label, center, tip }) => (
                  <th key={label} title={tip ?? ''} className={cn('px-4 py-2.5 font-semibold whitespace-nowrap text-[11px] text-slate-600', center ? 'text-center' : 'text-left', tip && 'cursor-help')}>
                    {label}{tip && <span className="text-muted-foreground/40 ml-0.5">ⓘ</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qTableData.map((q, i) => (
                <tr key={q.id} className={cn('border-b border-slate-100 hover:bg-accent/30 transition-colors', i % 2 !== 0 && 'bg-slate-50/50')}>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className="bg-accent text-primary border-0">Q{q.order}</Badge>
                  </td>
                  <td className="px-4 py-2.5"><TypeBadge type={q.type} /></td>
                  <td className="px-4 py-2.5 text-center font-medium text-slate-700">{q.points}점</td>
                  <td className="px-4 py-2.5 text-center text-slate-700">
                    {q.avgScore != null ? `${q.avgScore}점` : <span className="text-muted-foreground/40">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded overflow-hidden bg-slate-200">
                        <div className={cn('h-full rounded', !q.rate ? 'bg-border' : q.rate >= 70 ? 'bg-correct' : q.rate >= 40 ? 'bg-amber-500' : 'bg-destructive')} style={{ width: `${q.rate ?? 0}%` }} />
                      </div>
                      <span className={cn('font-medium', q.avgScore != null ? 'text-slate-700' : 'text-muted-foreground/40')}>
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
        <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border bg-slate-50">
          <span className="text-xs text-muted-foreground">
            난이도(득점률 기준): <span className="text-correct">≥70%</span> 쉬움 / <span className="text-amber-500">40~69%</span> 보통 / <span className="text-destructive">&lt;40%</span> 어려움
          </span>
        </div>
      </Card>
    </div>
  )
}
