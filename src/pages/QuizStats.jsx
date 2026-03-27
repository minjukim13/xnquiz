import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Download, Search } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import Layout from '../components/Layout'
import { mockQuizzes, mockStudents, QUIZ_TYPES, getQuizQuestions } from '../data/mockData'

function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <span
      className={`inline-block font-medium px-1.5 py-0.5 rounded ${small ? 'text-xs' : 'text-xs'}`}
      style={{ background: '#F5F5F5', color: '#616161' }}
    >
      {cfg.label}
    </span>
  )
}

export default function QuizStats() {
  const { id } = useParams()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const quizQuestions = getQuizQuestions(id)
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
              <p className="text-xs mb-1" style={{ color: '#9E9E9E' }}>{quiz.week}주차 {quiz.session}차시 · {quiz.course}</p>
              <h2 className="text-base font-bold" style={{ color: '#222222' }}>{quiz.title}</h2>
              <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{quiz.startDate} ~ {quiz.dueDate}</p>
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

        {activeTab === 'grades' && <GradesTab quiz={quiz} />}
        {activeTab === 'stats'  && <StatsTab  quiz={quiz} />}

      </div>
    </Layout>
  )
}

/* ─── Tab 1: 학생별 성적 조회 ─────────────────────────────────── */
function GradesTab({ quiz }) {
  const [search, setSearch] = useState('')

  const students = mockStudents.filter(s => s.submitted)
  const gradedCount = students.filter(s => s.score !== null).length

  const filtered = students.filter(s =>
    search === '' ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.includes(search)
  )

  const downloadCSV = () => {
    const header = ['이름', '학번', '학과', `점수(/${quiz.totalPoints}점)`, '채점 상태']
    const rows = students.map(s => [
      s.name,
      s.studentId,
      s.department,
      s.score ?? '-',
      s.score !== null ? '채점 완료' : '미채점',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `성적_${quiz.title}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* 상단 요약 + 액션 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm" style={{ color: '#616161' }}>
          <span>제출 <strong style={{ color: '#222222' }}>{students.length}명</strong></span>
          <span className="w-px h-4" style={{ background: '#EEEEEE' }} />
          <span>채점 완료 <strong style={{ color: '#018600' }}>{gradedCount}명</strong></span>
          <span className="w-px h-4" style={{ background: '#EEEEEE' }} />
          <span>미채점 <strong style={{ color: '#B43200' }}>{students.length - gradedCount}명</strong></span>
        </div>
        <button
          onClick={downloadCSV}
          className="btn-secondary text-xs"
        >
          <Download size={13} />
          성적 다운로드 (CSV)
        </button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
        <input
          type="text"
          placeholder="이름 또는 학번 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-8 py-2 text-xs"
        />
      </div>

      {/* 학생 테이블 */}
      <div className="bg-white overflow-hidden" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '1px solid #EEEEEE' }}>
                {['이름', '학번', '학과', `점수 / ${quiz.totalPoints}점`, '상태', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: '#616161' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #EEEEEE', background: i % 2 !== 0 ? '#FAFAFA' : '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 !== 0 ? '#FAFAFA' : '#fff'}
                >
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#222222' }}>{s.name}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: '#616161' }}>{s.studentId}</td>
                  <td className="px-4 py-2.5" style={{ color: '#616161' }}>{s.department}</td>
                  <td className="px-4 py-2.5">
                    {s.score !== null ? (
                      <span className="font-bold" style={{ color: '#222222' }}>{s.score}점</span>
                    ) : (
                      <span style={{ color: '#BDBDBD' }}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.score !== null ? (
                      <span className="flex items-center gap-1" style={{ color: '#018600' }}>
                        <CheckCircle2 size={11} />채점 완료
                      </span>
                    ) : (
                      <span style={{ color: '#B43200' }}>미채점</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/quiz/${quiz.id}/grade`}
                      className="font-medium text-indigo-500 hover:text-indigo-700"
                    >
                      답안 확인 / 점수 수정
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#BDBDBD' }}>검색 결과가 없습니다</td>
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
function StatsTab({ quiz }) {
  const submitted = mockStudents.filter(s => s.submitted)
  const graded    = submitted.filter(s => s.score !== null)
  const scores    = graded.map(s => s.score)

  const avg  = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const maxScore = scores.length ? Math.max(...scores) : 0
  const minScore = scores.length ? Math.min(...scores) : 0
  const stdev = useMemo(() => {
    if (!scores.length) return 0
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    return Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)
  }, [scores])

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
    const difficulty = rate == null ? null
      : rate >= 80 ? { label: '쉬움', color: 'text-emerald-600 bg-emerald-50' }
      : rate >= 60 ? { label: '보통', color: 'text-amber-600 bg-amber-50' }
      : { label: '어려움', color: 'text-red-600 bg-red-50' }
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
        ].map(item => (
          <div key={item.label} className="bg-white p-3 text-center" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
            <div className="text-xl font-bold leading-none" style={{ color: item.accent ? '#6366f1' : '#222222' }}>
              {item.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{item.unit}</div>
            <div className="text-xs mt-1.5" style={{ color: '#616161' }}>{item.label}</div>
          </div>
        ))}
        <div className="bg-white p-3 text-center" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
          <div className="text-xl font-bold leading-none" style={{ color: '#222222' }}>{avgDuration ?? '-'}</div>
          <div className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>분</div>
          <div className="text-xs mt-1.5" style={{ color: '#616161' }}>평균 응시시간</div>
          {timeLimit && timePressureCount > 0 && (
            <div className="mt-1.5 text-xs pt-1.5" style={{ color: '#9E9E9E', borderTop: '1px solid #EEEEEE' }}>
              마감 임박({Math.round(timeLimit * 0.95)}분↑) {timePressureRate}%
            </div>
          )}
        </div>
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
            <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60%', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8', formatter: v => `${v}%` }}>
              {qRateData.map((q, i) => (
                <Cell
                  key={i}
                  fill={!q.hasData ? '#e2e8f0' : q.rate >= 80 ? '#34d399' : q.rate >= 60 ? '#fbbf24' : '#f87171'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[
            { color: '#01A900', label: '80% 이상 (쉬움)' },
            { color: '#f59e0b', label: '60~79% (보통)' },
            { color: '#EF2B2A', label: '60% 미만 (어려움)' },
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
          <span className="text-xs" style={{ color: '#9E9E9E' }}>총 {quizQuestions.length}문항 · {quiz.totalPoints}점 만점</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '1px solid #EEEEEE' }}>
                {['문항', '유형', '배점', '평균 점수', '득점률', '난이도', '채점 현황'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: '#616161' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qTableData.map((q, i) => (
                <tr
                  key={q.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #EEEEEE', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                >
                  <td className="px-4 py-2.5 font-bold" style={{ color: '#9E9E9E' }}>Q{q.order}</td>
                  <td className="px-4 py-2.5"><TypeBadge type={q.type} small /></td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#424242' }}>{q.points}점</td>
                  <td className="px-4 py-2.5" style={{ color: '#424242' }}>
                    {q.avgScore != null ? `${q.avgScore}점` : <span style={{ color: '#BDBDBD' }}>-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${q.rate ?? 0}%`,
                            background: !q.rate ? '#BDBDBD' : q.rate >= 80 ? '#01A900' : q.rate >= 60 ? '#f59e0b' : '#EF2B2A',
                          }}
                        />
                      </div>
                      <span className="font-medium" style={{ color: q.avgScore != null ? '#424242' : '#BDBDBD' }}>
                        {q.avgScore != null ? `${q.rate}%` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {q.difficulty ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={
                          q.difficulty.label === '쉬움' ? { background: '#E5FCE3', color: '#018600' }
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
                  <td className="px-4 py-2.5">
                    {q.gradedCount >= q.totalCount ? (
                      <span className="flex items-center gap-1" style={{ color: '#018600' }}>
                        <CheckCircle2 size={11} />완료
                      </span>
                    ) : (
                      <span style={{ color: '#B43200' }}>{q.gradedCount}/{q.totalCount}명</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
