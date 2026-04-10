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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

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
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: quiz.title },
      { label: '결과 보기' },
    ]}>
      <div className="max-w-7xl mx-auto py-4 pb-10">

        {/* 퀴즈 정보 헤더 */}
        <Card className="mb-4">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Badge className="mb-2 bg-[#E8F3FF] text-[#3182F6] border-0">{quiz.week}주차 {quiz.session}차시</Badge>
                <h2 className="text-base font-bold">{quiz.title}</h2>
                {quiz.description && <p className="text-xs mt-1.5 text-slate-500">{quiz.description}</p>}
                <p className="text-xs mt-1 text-muted-foreground">{quiz.startDate} ~ {quiz.dueDate}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild className="bg-[#3182F6] hover:bg-[#1B64DA]" size="sm">
                  <Link to={`/quiz/${quiz.id}/grade`}>채점 대시보드</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/">목록으로</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 */}
        <Tabs defaultValue="grades">
          <TabsList>
            <TabsTrigger value="grades">학생별 성적 조회</TabsTrigger>
            <TabsTrigger value="stats">퀴즈 통계</TabsTrigger>
          </TabsList>
          <TabsContent value="grades">
            <GradesTab quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />
          </TabsContent>
        </Tabs>
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

function GradesTab({ quiz, students: allStudents }) {
  const [search, setSearch] = useState('')
  const [onlyUngraded, setOnlyUngraded] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const students = allStudents.filter(s => s.submitted)
  const gradedCount = students.filter(s => s.score !== null).length

  const filtered = useMemo(() => {
    let list = students.filter(s => {
      if (onlyUngraded && s.score !== null) return false
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
  }, [students, search, onlyUngraded, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const downloadCSV = () => downloadGradesXlsx(quiz, students)
  const ungradedCount = students.length - gradedCount

  return (
    <div>
      {/* 요약 카드 */}
      <div className="inline-flex items-center gap-0 mb-5 border border-border rounded-lg bg-white overflow-hidden">
        {[
          { label: '제출', value: students.length, alert: false },
          { label: '채점 완료', value: gradedCount, alert: false },
          { label: '미채점', value: ungradedCount, alert: ungradedCount > 0 },
        ].map(({ label, value, alert }, idx) => (
          <div key={label} className="flex items-center">
            {idx > 0 && <span className="w-px h-7 bg-border" />}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={cn('text-sm font-bold', alert ? 'text-red-500' : '')}>{value}명</span>
            </div>
          </div>
        ))}
      </div>

      {/* 필터 + 다운로드 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="학생 이름 또는 학번 검색"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm pl-8 py-2 border border-border rounded-md bg-white focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox checked={onlyUngraded} onCheckedChange={setOnlyUngraded} />
            <span className="text-sm text-slate-500">미채점만 보기</span>
            {ungradedCount > 0 && (
              <Badge variant="secondary" className="bg-red-50 text-red-500 text-[11px]">{ungradedCount}</Badge>
            )}
          </label>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCSV}>
          <Download size={13} />
          성적 다운로드
        </Button>
      </div>

      {/* 테이블 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                  { key: null, label: '', align: 'center' },
                ].map(({ key, label, align }) => (
                  <th key={label || '_action'} className={cn('px-4 py-3 font-medium whitespace-nowrap text-xs', `text-${align}`)}>
                    {key ? (
                      <button
                        onClick={() => handleSort(key)}
                        className={cn('group inline-flex items-center gap-1 transition-colors', align === 'center' && 'justify-center', sortKey === key ? 'text-[#3182F6]' : 'text-slate-500')}
                      >
                        {label}
                        {sortKey !== key && <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
                        {sortKey === key && sortDir === 'desc' && <ArrowDown size={11} />}
                        {sortKey === key && sortDir === 'asc' && <ArrowUp size={11} />}
                      </button>
                    ) : (
                      <span className="text-slate-500">{label}</span>
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
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-[#E8F3FF]/30 transition-colors">
                    <td className="px-4 py-3 text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-500">{s.studentId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.department}</td>
                    <td className="px-3 py-3 text-sm text-center whitespace-nowrap text-slate-700">
                      {elapsed ?? <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap text-slate-700">
                      {s.submittedAt ? s.submittedAt.split(' ')[1] : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {s.score !== null
                        ? <span className={cn('font-semibold', scorePct >= 80 ? 'text-[#3182F6]' : scorePct >= 60 ? 'text-slate-600' : 'text-red-500')}>{s.score}점</span>
                        : <span className="text-slate-300">-</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.score !== null ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-600">채점 완료</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-50 text-orange-600">미채점</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Button asChild size="xs" className="bg-[#1B64DA] hover:bg-[#1B64DA]">
                        <Link to={`/quiz/${quiz.id}/grade`}>답안 확인</Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-300">검색 결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
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
              <span className={cn('text-xl font-bold', item.accent ? 'text-[#3182F6]' : '')}>{item.value}</span>
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
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} formatter={(val) => [`${val}명`, '인원']} />
                <ReferenceLine x={`${Math.round(avg)}점`} stroke="#6366f1" strokeDasharray="3 3" label={{ value: '평균', position: 'top', fontSize: 10, fill: '#6366f1' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((d, i) => (
                    <Cell key={i} fill={d.raw === Math.round(avg) ? '#6366f1' : d.raw > Math.round(avg) ? '#c7d2fe' : '#e0e7ff'} />
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
              { label: '수강 인원', value: quiz.totalStudents, barColor: '#BDBDBD' },
              { label: '제출 완료', value: quiz.submitted, barColor: '#6366f1', rate: submitRate },
              { label: '미제출', value: quiz.totalStudents - quiz.submitted, barColor: '#f59e0b', rate: (100 - parseFloat(submitRate)).toFixed(1) },
              { label: '채점 완료', value: quiz.graded, barColor: '#01A900', rate: gradeRate },
              { label: '채점 대기', value: quiz.pendingGrade, barColor: '#EF2B2A' },
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
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} formatter={(val, _name, props) => [props.payload.hasData ? `${val}%` : '채점 데이터 없음', `${props.payload.label} 득점률`]} />
            <ReferenceLine x={70} stroke="#34d399" strokeDasharray="3 3" label={{ value: '70%', position: 'right', fontSize: 10, fill: '#34d399' }} />
            <ReferenceLine x={40} stroke="#f87171" strokeDasharray="3 3" label={{ value: '40%', position: 'right', fontSize: 10, fill: '#f87171' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8', formatter: v => `${v}%` }}>
              {qRateData.map((q, i) => (
                <Cell key={i} fill={!q.hasData ? '#e2e8f0' : q.rate >= 70 ? '#34d399' : q.rate >= 40 ? '#fbbf24' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[
            { color: '#34d399', label: '70% 이상 (쉬움)' },
            { color: '#fbbf24', label: '40~69% (보통)' },
            { color: '#f87171', label: '40% 미만 (어려움)' },
            { color: '#BDBDBD', label: '채점 전' },
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
                <tr key={q.id} className={cn('border-b border-slate-100 hover:bg-[#E8F3FF]/30 transition-colors', i % 2 !== 0 && 'bg-slate-50/50')}>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className="bg-[#E8F3FF] text-[#1B64DA] border-0">Q{q.order}</Badge>
                  </td>
                  <td className="px-4 py-2.5"><TypeBadge type={q.type} /></td>
                  <td className="px-4 py-2.5 text-center font-medium text-slate-700">{q.points}점</td>
                  <td className="px-4 py-2.5 text-center text-slate-700">
                    {q.avgScore != null ? `${q.avgScore}점` : <span className="text-muted-foreground/40">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded overflow-hidden bg-slate-200">
                        <div className="h-full rounded" style={{ width: `${q.rate ?? 0}%`, background: !q.rate ? '#BDBDBD' : q.rate >= 70 ? '#01A900' : q.rate >= 40 ? '#f59e0b' : '#EF2B2A' }} />
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
            난이도(득점률 기준): <span className="text-green-700">≥70%</span> 쉬움 / <span className="text-orange-700">40~69%</span> 보통 / <span className="text-red-600">&lt;40%</span> 어려움
          </span>
        </div>
      </Card>
    </div>
  )
}
