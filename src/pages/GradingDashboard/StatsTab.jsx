import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import StatCard from './StatCard'

function StatsTab({ question, students }) {
  // 문항별 득점 (총점이 아닌 해당 문항 점수)
  const getQScore = (s) => question.autoGrade
    ? s.autoScores?.[question.id]
    : s.manualScores?.[question.id]

  const scoredStudents = students.filter(s => getQScore(s) != null)
  const scores = scoredStudents.map(s => getQScore(s))
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
  const maxScore = scores.length ? Math.max(...scores) : '-'
  const minScore = scores.length ? Math.min(...scores) : '-'

  // 점수별 빈도 (0점 ~ 만점)
  const freqMap = {}
  scores.forEach(s => { freqMap[s] = (freqMap[s] || 0) + 1 })
  const distribution = Array.from({ length: question.points + 1 }, (_, i) => ({
    label: `${i}점`, score: i, count: freqMap[i] || 0,
  }))

  const correctCount = question.autoGrade
    ? scoredStudents.filter(s => (getQScore(s) ?? 0) === question.points).length
    : null
  const correctPct = correctCount != null && scoredStudents.length > 0
    ? Math.round((correctCount / scoredStudents.length) * 100) : null

  return (
    <div className="flex-1 bg-white overflow-y-auto scrollbar-thin border border-slate-200 rounded-lg">
      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3 p-4">
        <StatCard label="문항 평균" value={avg} unit="점" accent />
        <StatCard label="최고" value={maxScore} unit="점" />
        <StatCard label="최저" value={minScore} unit="점" />
        <StatCard label="채점 완료" value={scoredStudents.length} unit={`/ ${students.length}명`} />
      </div>

      <div className="mx-4 h-px bg-slate-100" />

      {/* 점수 분포 */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-700">점수 분포</span>
          <span className="text-xs text-muted-foreground">만점 {question.points}점</span>
        </div>
        {scoredStudents.length === 0 ? (
          <div className="flex items-center justify-center h-28 rounded bg-slate-50 border border-dashed border-slate-200">
            <span className="text-sm text-muted-foreground">채점 완료된 학생이 없습니다</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={distribution} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                formatter={(val) => [`${val}명`, '인원']}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {distribution.map((d, i) => (
                  <Cell key={i} fill={d.score === maxScore ? 'var(--primary)' : 'var(--accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 정답률 (자동채점 문항만) */}
      {correctPct != null && (
        <>
          <div className="mx-4 h-px bg-slate-100" />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">정답률</span>
              <span className={cn('text-sm font-bold', correctPct >= 70 ? 'text-green-700' : correctPct >= 40 ? 'text-orange-700' : 'text-red-600')}>
                {correctPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mb-2 bg-slate-200">
              <div
                className={cn('h-full rounded-full transition-all', correctPct >= 70 ? 'bg-correct' : correctPct >= 40 ? 'bg-amber-500' : 'bg-destructive')}
                style={{ width: `${correctPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              정답 {correctCount}명
              <span className="mx-1.5 text-slate-300">|</span>
              오답 {scoredStudents.length - correctCount}명
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default StatsTab
