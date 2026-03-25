import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import Layout from '../components/Layout'
import { mockQuizzes, mockQuestions, mockStudents, QUIZ_TYPES } from '../data/mockData'

const LIGHT_COLORS = {
  multiple_choice:         'bg-blue-50 text-blue-700',
  true_false:              'bg-purple-50 text-purple-700',
  multiple_answers:        'bg-indigo-50 text-indigo-700',
  short_answer:            'bg-amber-50 text-amber-700',
  essay:                   'bg-orange-50 text-orange-700',
  numerical:               'bg-teal-50 text-teal-700',
  matching:                'bg-pink-50 text-pink-700',
  fill_in_blank:           'bg-cyan-50 text-cyan-700',
  fill_in_multiple_blanks: 'bg-sky-50 text-sky-700',
  multiple_dropdowns:      'bg-violet-50 text-violet-700',
  ordering:                'bg-lime-50 text-lime-700',
  file_upload:             'bg-rose-50 text-rose-700',
}

function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  const colorClass = LIGHT_COLORS[type] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium ${colorClass} ${small ? 'text-[10px]' : ''}`}>
      {cfg.label}
    </span>
  )
}

export default function QuizStats() {
  const { id } = useParams()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]

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

  // 평균 응시시간
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

  // 점수 분포
  const scoreFreq = {}
  scores.forEach(s => { scoreFreq[s] = (scoreFreq[s] || 0) + 1 })
  const distData = scores.length
    ? Array.from({ length: maxScore - minScore + 1 }, (_, i) => {
        const s = minScore + i
        return { score: `${s}점`, count: scoreFreq[s] || 0, raw: s }
      })
    : []

  // 문항별 득점률
  const qRateData = mockQuestions.map(q => ({
    label: `Q${q.order}`,
    rate: q.avgScore != null ? Math.round((q.avgScore / q.points) * 100) : 0,
    hasData: q.avgScore != null,
    type: q.type,
    gradedCount: q.gradedCount,
    totalCount: q.totalCount,
  }))

  // 상위/중위/하위 구간
  const sortedScores = [...scores].sort((a, b) => a - b)
  const p27 = sortedScores[Math.floor(sortedScores.length * 0.27)] ?? '-'
  const p73 = sortedScores[Math.floor(sortedScores.length * 0.73)] ?? '-'

  // 문항별 테이블
  const qTableData = mockQuestions.map(q => {
    const rate = q.avgScore != null ? Math.round((q.avgScore / q.points) * 100) : null
    const difficulty = rate == null ? null
      : rate >= 80 ? { label: '쉬움', color: 'text-emerald-600 bg-emerald-50' }
      : rate >= 60 ? { label: '보통', color: 'text-amber-600 bg-amber-50' }
      : { label: '어려움', color: 'text-red-600 bg-red-50' }
    return { ...q, rate, difficulty }
  })

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: quiz.title },
      { label: '퀴즈 통계' },
    ]}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-4 pb-10">

        {/* 퀴즈 정보 헤더 */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 mb-1">{quiz.week}주차 {quiz.session}차시 · {quiz.course}</p>
              <h2 className="text-base font-bold text-gray-900">{quiz.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{quiz.startDate} ~ {quiz.dueDate}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                to={`/quiz/${quiz.id}/grade`}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition-colors"
                style={{ boxShadow: '0 1px 2px rgba(99,102,241,0.3)' }}
              >
                채점 대시보드
              </Link>
              <Link
                to="/"
                className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3.5 py-2 rounded-xl transition-colors border border-gray-200"
              >
                목록으로
              </Link>
            </div>
          </div>
        </div>

        {/* 요약 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: '평균 점수', value: avg.toFixed(1), unit: `/ ${quiz.totalPoints}점`, accent: true },
            { label: '최고 점수', value: maxScore, unit: '점' },
            { label: '최저 점수', value: minScore, unit: '점' },
            { label: '표준편차', value: `±${stdev.toFixed(1)}`, unit: '점' },
            { label: '응시율', value: submitRate, unit: '%' },
          ].map(item => (
            <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
              <div className={`text-xl font-bold leading-none ${item.accent ? 'text-indigo-600' : 'text-slate-900'}`}>
                {item.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.unit}</div>
              <div className="text-xs text-slate-500 mt-1.5">{item.label}</div>
            </div>
          ))}
          {/* 평균 응시시간 — 마감 임박 서브 정보 포함 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-bold leading-none text-slate-900">{avgDuration ?? '-'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">분</div>
            <div className="text-xs text-slate-500 mt-1.5">평균 응시시간</div>
            {timeLimit && timePressureCount > 0 && (
              <div className="mt-1.5 text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                마감 임박({Math.round(timeLimit * 0.95)}분↑) {timePressureRate}%
              </div>
            )}
          </div>
        </div>

        {/* 점수 분포 + 응시 현황 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">점수 분포</h3>
              <span className="text-xs text-slate-400">
                제출 {quiz.submitted}명 중 채점 완료 {graded.length}명 기준 (미채점 {quiz.submitted - graded.length}명 제외)
              </span>
            </div>
            {graded.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-slate-400">채점 완료된 학생이 없습니다</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={distData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="score" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
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

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">응시 현황</h3>
            <div className="space-y-3">
              {[
                { label: '수강 인원',  value: quiz.totalStudents,                   color: 'bg-slate-200' },
                { label: '제출 완료',  value: quiz.submitted,                       color: 'bg-indigo-400', rate: submitRate },
                { label: '미제출',     value: quiz.totalStudents - quiz.submitted,  color: 'bg-amber-300',  rate: (100 - parseFloat(submitRate)).toFixed(1) },
                { label: '채점 완료',  value: quiz.graded,                          color: 'bg-emerald-400', rate: gradeRate },
                { label: '채점 대기',  value: quiz.pendingGrade,                    color: 'bg-rose-300' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-700">
                      {item.value}명{item.rate ? ` (${item.rate}%)` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${(item.value / quiz.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-medium text-slate-500 mb-2">점수 분포 구간 (채점 완료 기준)</p>
              {[
                { label: '상위 27%', value: `${p73}점 이상`,    color: 'text-emerald-600' },
                { label: '중위 46%', value: `${p27}~${p73}점`, color: 'text-slate-600' },
                { label: '하위 27%', value: `${p27}점 미만`,    color: 'text-rose-500' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-slate-400">{row.label}</span>
                  <span className={`font-medium ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 문항별 득점률 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">문항별 득점률</h3>
            <span className="text-xs text-slate-400">채점된 학생 기준 실시간 집계</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={qRateData} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
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
              { color: 'bg-emerald-400', label: '80% 이상 (쉬움)' },
              { color: 'bg-amber-400',   label: '60~79% (보통)' },
              { color: 'bg-red-400',     label: '60% 미만 (어려움)' },
              { color: 'bg-slate-200',   label: '채점 전' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* 문항별 상세 통계 테이블 */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">문항별 상세 통계</h3>
            <span className="text-xs text-slate-400">총 {mockQuestions.length}문항 · {quiz.totalPoints}점 만점</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['문항', '유형', '배점', '평균 점수', '득점률', '난이도', '채점 현황'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qTableData.map((q, i) => (
                  <tr key={q.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-2.5 font-bold text-slate-500">Q{q.order}</td>
                    <td className="px-4 py-2.5"><TypeBadge type={q.type} small /></td>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">{q.points}점</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {q.avgScore != null ? `${q.avgScore}점` : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${!q.rate ? 'bg-slate-200' : q.rate >= 80 ? 'bg-emerald-400' : q.rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${q.rate ?? 0}%` }}
                          />
                        </div>
                        <span className={`font-medium ${q.avgScore != null ? 'text-slate-700' : 'text-slate-300'}`}>
                          {q.avgScore != null ? `${q.rate}%` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {q.difficulty ? (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${q.difficulty.color}`}>
                          {q.difficulty.label}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {q.gradedCount >= q.totalCount ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={11} />완료
                        </span>
                      ) : (
                        <span className="text-amber-600">{q.gradedCount}/{q.totalCount}명</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  )
}
