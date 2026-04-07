import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { downloadGradesXlsx, downloadItemAnalysisXlsx } from '../utils/excelUtils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import Layout from '../components/Layout'
import { mockQuizzes, getQuizStudents, QUIZ_TYPES, getQuizQuestions } from '../data/mockData'

function TypeBadge({ type }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <span
      className="inline-block font-medium px-1.5 py-0.5 rounded text-xs"
      style={{ background: '#F5F5F5', color: '#616161' }}
    >
      {cfg.label}
    </span>
  )
}

// ─── 헬퍼: 분산 계산 ─────────────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState('grades')

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: quiz.title },
      { label: '결과 보기' },
    ]}>
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 xl:px-16 py-6 pb-10">

        {/* 퀴즈 정보 헤더 */}
        <div className="card p-4 sm:p-5 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-block mb-2 px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#EEF2FF', color: '#4F46E5' }}>{quiz.week}주차 {quiz.session}차시</span>
              <h2 className="text-base font-bold" style={{ color: '#222222' }}>{quiz.title}</h2>
              {quiz.description && (
                <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>{quiz.description}</p>
              )}
              <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>{quiz.startDate} ~ {quiz.dueDate}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                to={`/quiz/${quiz.id}/grade`}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-md transition-colors"
              >
                채점 대시보드
              </Link>
              <Link
                to="/"
                className="text-xs font-medium px-3.5 py-2 transition-colors"
                style={{ color: '#616161', border: '1px solid #E0E0E0', borderRadius: 4 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                목록으로
              </Link>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex mb-5" style={{ borderBottom: '1px solid #E0E0E0' }}>
          {[
            { key: 'grades', label: '학생별 성적 조회' },
            { key: 'stats',  label: '퀴즈 통계' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={
                activeTab === tab.key
                  ? { borderBottomColor: '#6366f1', color: '#6366f1' }
                  : { borderBottomColor: 'transparent', color: '#9E9E9E' }
              }
              onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#424242' }}
              onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#9E9E9E' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'grades' && <GradesTab quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />}
        {activeTab === 'stats'  && <StatsTab  quiz={quiz} quizQuestions={quizQuestions} students={quizStudents} />}

      </div>
    </Layout>
  )
}

/* ─── 소요 시간 계산 ───────────────────────────────────────────── */
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

/* ─── Tab 1: 학생별 성적 조회 ─────────────────────────────────── */
function GradesTab({ quiz, students: allStudents }) {
  const [search, setSearch] = useState('')
  const [onlyUngraded, setOnlyUngraded] = useState(false)
  const [sortKey, setSortKey] = useState(null)   // null | 'name' | 'studentId' | 'department' | 'elapsed' | 'submittedAt' | 'score'
  const [sortDir, setSortDir] = useState('desc') // 'desc' | 'asc'

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
      {/* 상단: 요약 카드 */}
      <div className="inline-flex items-center gap-0 mb-5" style={{ border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        {[
          { label: '제출',    value: students.length, alert: false },
          { label: '채점 완료', value: gradedCount,     alert: false },
          { label: '미채점',  value: ungradedCount,   alert: ungradedCount > 0 },
        ].map(({ label, value, alert }, idx) => (
          <div key={label} className="flex items-center">
            {idx > 0 && <span style={{ width: 1, height: 28, background: '#E5E7EB', display: 'inline-block' }} />}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>{label}</span>
              <span className="text-sm font-bold" style={{ color: alert ? '#EF4444' : '#111827' }}>{value}명</span>
            </div>
          </div>
        ))}
      </div>

      {/* 중단: 필터 + 다운로드 — 같은 행 */}
      <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
          <input
            type="text"
            placeholder="이름 또는 학번 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8 py-2 text-sm w-full"
          />
        </div>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <span
            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
            style={onlyUngraded
              ? { background: '#4F46E5' }
              : { background: '#fff', border: '1.5px solid #D1D5DB' }
            }
            onClick={() => setOnlyUngraded(v => !v)}
          >
            {onlyUngraded && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span className="text-sm" style={{ color: '#6B7280' }} onClick={() => setOnlyUngraded(v => !v)}>
            미채점만 보기
          </span>
          {ungradedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 11 }}>
              {ungradedCount}
            </span>
          )}
        </label>
      </div>
        <button onClick={downloadCSV} className="btn-secondary text-xs">
          <Download size={13} />
          성적 다운로드
        </button>
      </div>

      {/* 하단: 데이터 테이블 — 외부 테두리 제거 */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: 8, border: '1px solid #F3F4F6' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {[
                  { key: 'name',        label: '이름',                         align: 'left'   },
                  { key: 'studentId',   label: '학번',                         align: 'center' },
                  { key: 'department',  label: '학과',                         align: 'left'   },
                  { key: 'elapsed',     label: '소요 시간',                    align: 'center' },
                  { key: 'submittedAt', label: '제출 일시',                    align: 'center' },
                  { key: 'score',       label: `점수 / ${quiz.totalPoints}점`, align: 'center' },
                  { key: null,          label: '상태',                         align: 'center' },
                  { key: null,          label: '',                              align: 'center' },
                ].map(({ key, label, align }) => (
                  <th
                    key={label || '_action'}
                    className={`px-4 py-3 font-medium whitespace-nowrap text-${align}`}
                    style={{ fontSize: 12 }}
                  >
                    {key ? (
                      <button
                        onClick={() => handleSort(key)}
                        className={`group inline-flex items-center gap-1 transition-colors ${align === 'center' ? 'justify-center' : ''}`}
                        style={{ color: sortKey === key ? '#4F46E5' : '#6B7280' }}
                      >
                        {label}
                        {sortKey !== key && (
                          <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                        {sortKey === key && sortDir === 'desc' && <ArrowDown size={11} />}
                        {sortKey === key && sortDir === 'asc'  && <ArrowUp size={11} />}
                      </button>
                    ) : (
                      <span style={{ color: '#6B7280' }}>{label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const scorePct = s.score !== null ? Math.round((s.score / quiz.totalPoints) * 100) : null
                const scoreColor = scorePct === null ? '#9CA3AF'
                  : scorePct >= 80 ? '#4F46E5'
                  : scorePct >= 60 ? '#6B7280'
                  : '#EF4444'
                const elapsed = calcElapsed(s.startTime, s.submittedAt)

                return (
                  <tr
                    key={s.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid #F3F4F6', background: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8F9FF'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: '#111827' }}>{s.name}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: '#6B7280' }}>{s.studentId}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#6B7280' }}>{s.department}</td>
                    <td className="px-3 py-3 text-sm text-center whitespace-nowrap" style={{ color: '#374151' }}>
                      {elapsed ?? <span style={{ color: '#D1D5DB' }}>-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap" style={{ color: '#374151' }}>
                      {s.submittedAt ? s.submittedAt.split(' ')[1] : <span style={{ color: '#D1D5DB' }}>-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {s.score !== null
                        ? <span className="font-semibold" style={{ color: scoreColor }}>{s.score}점</span>
                        : <span style={{ color: '#D1D5DB' }}>-</span>
                      }
                    </td>
                    {/* 상태 */}
                    <td className="px-4 py-3 text-center">
                      {s.score !== null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#86EFAC' }} />
                          채점 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#FFF7ED', color: '#C2410C' }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#FCA5A5' }} />
                          미채점
                        </span>
                      )}
                    </td>
                    {/* 액션 버튼 */}
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        to={`/quiz/${quiz.id}/grade`}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                        style={{ background: '#1D4ED8', color: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1E40AF' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#1D4ED8' }}
                      >
                        답안 확인
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: '#D1D5DB' }}>검색 결과가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab 2: 퀴즈 통계 ───────────────────────────────────────── */
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
  const timeLimit = quiz.timeLimit ?? null
  const timePressureCount = timeLimit ? durations.filter(d => d >= timeLimit * 0.95).length : 0
  const timePressureRate  = durations.length ? Math.round((timePressureCount / durations.length) * 100) : 0


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
    // 난이도: 득점률 기준 (≥70% 쉬움 / 40~69% 보통 / <40% 어려움)
    const difficulty = rate == null ? null
      : rate >= 70 ? { label: '쉬움' }
      : rate >= 40 ? { label: '보통' }
      : { label: '어려움' }
    return { ...q, rate, difficulty }
  })

  return (
    <div className="space-y-4">
      {/* 요약 지표 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '평균 점수', value: avg.toFixed(1), unit: `/ ${quiz.totalPoints}점`, accent: true },
          { label: '최고 점수', value: maxScore, unit: '점' },
          { label: '최저 점수', value: minScore, unit: '점' },
          { label: '표준편차', value: `±${stdev.toFixed(1)}`, unit: '점' },
          { label: '응시율', value: submitRate, unit: '%' },
          { label: '평균 응시시간', value: avgDuration ?? '-', unit: '분' },
        ].map(item => (
          <div
            key={item.label}
            className="bg-white p-3 text-center"
            style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}
          >
            <div className="flex items-baseline justify-center gap-1 leading-none">
              <span className="text-xl font-bold" style={{ color: item.accent ? '#6366f1' : '#222222' }}>{item.value}</span>
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{item.unit}</span>
            </div>
            <div className="text-xs mt-1.5" style={{ color: '#616161' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 점수 분포 + 응시 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#222222' }}>점수 분포</h3>
            <span className="text-xs" style={{ color: '#9E9E9E' }}>
              제출 {quiz.submitted}명 중 채점 완료 {graded.length}명 기준 (미채점 {quiz.submitted - graded.length}명 제외)
            </span>
          </div>
          {graded.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs" style={{ color: '#BDBDBD' }}>채점 완료된 학생이 없습니다</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 12 }}
                  formatter={(val) => [`${val}명`, '인원']}
                />
                <ReferenceLine
                  x={`${Math.round(avg)}점`}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  label={{ value: '평균', position: 'top', fontSize: 10, fill: '#6366f1' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.raw === Math.round(avg) ? '#6366f1' : d.raw > Math.round(avg) ? '#c7d2fe' : '#e0e7ff'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-4" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#222222' }}>응시 현황</h3>
          <div className="space-y-3">
            {[
              { label: '수강 인원',  value: quiz.totalStudents,                   barColor: '#BDBDBD' },
              { label: '제출 완료',  value: quiz.submitted,                       barColor: '#6366f1', rate: submitRate },
              { label: '미제출',     value: quiz.totalStudents - quiz.submitted,  barColor: '#f59e0b', rate: (100 - parseFloat(submitRate)).toFixed(1) },
              { label: '채점 완료',  value: quiz.graded,                          barColor: '#01A900', rate: gradeRate },
              { label: '채점 대기',  value: quiz.pendingGrade,                    barColor: '#EF2B2A' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#616161' }}>{item.label}</span>
                  <span className="font-semibold" style={{ color: '#424242' }}>
                    {item.value}명{item.rate ? ` (${item.rate}%)` : ''}
                  </span>
                </div>
                <div className="h-1.5 rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${(item.value / quiz.totalStudents) * 100}%`, background: item.barColor }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid #EEEEEE' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#616161' }}>점수 분포 구간 (채점 완료 기준)</p>
            {[
              { label: '상위 27%', value: `${p73}점 이상`,    styleColor: '#018600' },
              { label: '중위 46%', value: `${p27}~${p73}점`, styleColor: '#424242' },
              { label: '하위 27%', value: `${p27}점 미만`,    styleColor: '#EF2B2A' },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span style={{ color: '#9E9E9E' }}>{row.label}</span>
                <span className="font-medium" style={{ color: row.styleColor }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 문항별 득점률 */}
      <div className="bg-white p-4" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: '#222222' }}>문항별 득점률</h3>
          <span className="text-xs" style={{ color: '#9E9E9E' }}>채점된 학생 기준 실시간 집계</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={qRateData} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 12 }}
              formatter={(val, _name, props) => [
                props.payload.hasData ? `${val}%` : '채점 데이터 없음',
                `${props.payload.label} 득점률`,
              ]}
            />
            <ReferenceLine x={70} stroke="#34d399" strokeDasharray="3 3" label={{ value: '70%', position: 'right', fontSize: 10, fill: '#34d399' }} />
            <ReferenceLine x={40} stroke="#f87171" strokeDasharray="3 3" label={{ value: '40%', position: 'right', fontSize: 10, fill: '#f87171' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8', formatter: v => `${v}%` }}>
              {qRateData.map((q, i) => (
                <Cell
                  key={i}
                  fill={!q.hasData ? '#e2e8f0' : q.rate >= 70 ? '#34d399' : q.rate >= 40 ? '#fbbf24' : '#f87171'}
                />
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
            <div key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: '#616161' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* 문항별 상세 통계 테이블 */}
      <div className="bg-white overflow-hidden" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#222222' }}>문항별 상세 통계</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#9E9E9E' }}>총 {quizQuestions.length}문항 · {quiz.totalPoints}점 만점</span>
            <button
              onClick={() => downloadItemAnalysisXlsx(quiz, quizQuestions, allStudents)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ border: '1px solid #E0E0E0', color: '#616161', background: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <Download size={12} />
              문항 분석 (.xlsx)
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #E0E0E0' }}>
                {[
                  { label: '문항',      center: true  },
                  { label: '유형',      center: false },
                  { label: '배점',      center: true  },
                  { label: '평균 점수', center: true  },
                  { label: '득점률',    center: false },
                  { label: '난이도',    center: true, tip: '득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움' },
                  { label: '채점 현황', center: true  },
                ].map(({ label, center, tip }) => (
                  <th
                    key={label}
                    title={tip ?? ''}
                    className={`px-4 py-2.5 font-semibold whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}
                    style={{ color: '#616161', fontSize: 11, cursor: tip ? 'help' : 'default' }}
                  >
                    {label}{tip && <span style={{ color: '#BDBDBD', marginLeft: 2 }}>ⓘ</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qTableData.map((q, i) => (
                  <tr
                    key={q.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid #EEEEEE', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F4FF'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    {/* 문항 번호 */}
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-bold text-xs px-1.5 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#4338ca' }}>
                        Q{q.order}
                      </span>
                    </td>

                    {/* 유형 */}
                    <td className="px-4 py-2.5"><TypeBadge type={q.type} /></td>

                    {/* 배점 */}
                    <td className="px-4 py-2.5 text-center font-medium" style={{ color: '#424242' }}>{q.points}점</td>

                    {/* 평균 점수 */}
                    <td className="px-4 py-2.5 text-center" style={{ color: '#424242' }}>
                      {q.avgScore != null ? `${q.avgScore}점` : <span style={{ color: '#BDBDBD' }}>-</span>}
                    </td>

                    {/* 득점률 */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${q.rate ?? 0}%`,
                              background: !q.rate ? '#BDBDBD' : q.rate >= 70 ? '#01A900' : q.rate >= 40 ? '#f59e0b' : '#EF2B2A',
                            }}
                          />
                        </div>
                        <span className="font-medium" style={{ color: q.avgScore != null ? '#424242' : '#BDBDBD' }}>
                          {q.avgScore != null ? `${q.rate}%` : '-'}
                        </span>
                      </div>
                    </td>

                    {/* 난이도 */}
                    <td className="px-4 py-2.5 text-center">
                      {q.difficulty ? (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={
                            q.difficulty.label === '쉬움'   ? { background: '#E5FCE3', color: '#018600' }
                            : q.difficulty.label === '보통' ? { background: '#FFF6F2', color: '#B43200' }
                            : { background: '#FFF5F5', color: '#BF0A03' }
                          }
                        >
                          {q.difficulty.label}
                        </span>
                      ) : (
                        <span style={{ color: '#BDBDBD' }}>-</span>
                      )}
                    </td>

                    {/* 채점 현황 */}
                    <td className="px-4 py-2.5 text-center">
                      {q.gradedCount >= q.totalCount ? (
                        <span className="font-medium" style={{ color: '#018600' }}>완료</span>
                      ) : (
                        <span style={{ color: '#B43200' }}>{q.gradedCount}/{q.totalCount}명</span>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 난이도 기준 가이드 */}
        <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1" style={{ borderTop: '1px solid #EEEEEE', background: '#FAFAFA' }}>
          <span className="text-xs" style={{ color: '#9E9E9E' }}>
            난이도(득점률 기준): <span style={{ color: '#018600' }}>≥70%</span> 쉬움 / <span style={{ color: '#B43200' }}>40~69%</span> 보통 / <span style={{ color: '#BF0A03' }}>&lt;40%</span> 어려움
          </span>
        </div>
      </div>
    </div>
  )
}
