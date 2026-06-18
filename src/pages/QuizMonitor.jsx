import { useState, useMemo } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import {
  Users, Hourglass, AlertTriangle, RefreshCw, Search,
  CheckCircle2, Activity, Info, ShieldCheck,
} from 'lucide-react'
import { mockQuizzes } from '../data/mockData'
import { getQuizQuestions, getQuizStudents } from '../data/mockData'
import { useRole } from '../context/role'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownSelect } from '../components/DropdownSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { buildActivityLogKey, loadActivityLog, summarizeActivityLog } from '@/utils/activityLog'
import PageHeader from '../components/PageHeader'
import ActivityLogPanel from './GradingDashboard/ActivityLogPanel'
import { isDeadlinePassed, getEffectiveDeadline } from '@/utils/deadlineUtils'

const FOCUS_LOSS_ANOMALY_THRESHOLD = 3
const IDLE_ANOMALY_THRESHOLD_SEC = 10 * 60

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch {
    return String(value)
  }
}

function formatElapsed(startTimeIso, nowMs) {
  if (!startTimeIso) return '-'
  const start = new Date(startTimeIso).getTime()
  if (!Number.isFinite(start)) return '-'
  const sec = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

function classifyStudent(student) {
  if (student.submitted) return 'submitted'
  if (student.startTime) return 'in_progress'
  return 'not_started'
}

const STATUS_META = {
  in_progress: { label: '응시 중', className: 'bg-accent text-primary border-primary/30' },
  not_started: { label: '미시작', className: 'bg-secondary text-secondary-foreground border-border' },
  submitted:   { label: '제출 완료', className: 'bg-success-bg text-success-foreground border-success-border' },
}

const FILTER_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'in_progress', label: '응시 중' },
  { value: 'not_started', label: '미시작' },
  { value: 'submitted', label: '제출 완료' },
  { value: 'anomaly', label: '이상 후보' },
]

export default function QuizMonitor() {
  const { id } = useParams()
  const { role } = useRole()

  const quiz = mockQuizzes.find(q => q.id === id)
  const questions = useMemo(() => quiz ? getQuizQuestions(id) : [], [quiz, id])

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [refreshTick, setRefreshTick] = useState(0)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const students = useMemo(() => quiz ? getQuizStudents(id) : [], [quiz, id, refreshTick])

  const deadlinePassed = quiz ? isDeadlinePassed(quiz, new Date(nowMs)) : false

  const enrichedStudents = useMemo(() => students.map(s => {
    const status = classifyStudent(s)
    const logKey = buildActivityLogKey(id, s.id)
    const log = loadActivityLog(logKey)
    const summary = summarizeActivityLog(log)
    const lastActivityTs = log.length > 0 ? log[log.length - 1].ts : null
    const idleSec = lastActivityTs ? Math.floor((nowMs - lastActivityTs) / 1000) : null
    const anomalyReasons = []
    if (status === 'in_progress' && summary.focusLossCount >= FOCUS_LOSS_ANOMALY_THRESHOLD) {
      anomalyReasons.push(`포커스 이탈 ${summary.focusLossCount}회`)
    }
    if (status === 'in_progress' && idleSec != null && idleSec >= IDLE_ANOMALY_THRESHOLD_SEC) {
      const min = Math.floor(idleSec / 60)
      anomalyReasons.push(`최근 활동 없음 ${min}분`)
    }
    if (status === 'in_progress' && deadlinePassed) {
      anomalyReasons.push('마감 경과 후 응시 중')
    }
    return { ...s, _status: status, _summary: summary, _idleSec: idleSec, _anomaly: anomalyReasons }
  }), [students, id, nowMs, deadlinePassed])

  const counts = useMemo(() => {
    const c = { total: enrichedStudents.length, in_progress: 0, not_started: 0, submitted: 0, anomaly: 0 }
    enrichedStudents.forEach(s => {
      c[s._status]++
      if (s._anomaly.length > 0) c.anomaly++
    })
    return c
  }, [enrichedStudents])

  const filtered = useMemo(() => enrichedStudents.filter(s => {
    if (filter === 'anomaly') {
      if (s._anomaly.length === 0) return false
    } else if (filter !== 'all') {
      if (s._status !== filter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !String(s.studentId).toLowerCase().includes(q)) return false
    }
    return true
  }), [enrichedStudents, filter, search])

  if (role !== 'instructor') return <Navigate to="/" replace />
  if (!quiz) return <Navigate to="/" replace />

  const handleManualRefresh = () => {
    setNowMs(Date.now())
    setRefreshTick(t => t + 1)
  }

  return (
    <>
      <div className="pb-8">
        <PageHeader
          title={
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[22px] font-bold text-foreground leading-tight truncate">{quiz.title}</h1>
            </div>
          }
          description={`${quiz.course} · 응시 기간 ${formatDateTime(quiz.startDate)} ~ ${formatDateTime(quiz.dueDate)}`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleManualRefresh}>
                <RefreshCw size={14} />
                새로고침
              </Button>
            </>
          }
        />

        {/* 마감 경과 안내 */}
        {deadlinePassed && (
          <div className="mb-4 bg-warning-bg border border-warning-border rounded-md p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-warning-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-warning-foreground">
              <p className="font-medium">응시 가능 시간이 종료되었습니다.</p>
              <p className="text-xs mt-0.5">
                미제출 학생은 곧 자동 제출 처리됩니다. 채점은
                <Link to={`/quiz/${id}/grade`} className="underline mx-1">채점 대시보드</Link>
                에서 진행해 주세요.
              </p>
            </div>
          </div>
        )}

        {/* 응시 현황 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <SummaryCard
            label="응시 중"
            value={counts.in_progress}
            total={counts.total}
            icon={Activity}
            tone="primary"
          />
          <SummaryCard
            label="미시작"
            value={counts.not_started}
            total={counts.total}
            icon={Hourglass}
            tone="muted"
          />
          <SummaryCard
            label="제출 완료"
            value={counts.submitted}
            total={counts.total}
            icon={CheckCircle2}
            tone="success"
          />
          <SummaryCard
            label="이상 후보"
            value={counts.anomaly}
            total={counts.total}
            icon={AlertTriangle}
            tone={counts.anomaly > 0 ? 'warning' : 'muted'}
            hint={counts.anomaly > 0 ? '포커스 이탈/장시간 미활동 등' : undefined}
          />
        </div>

<div className="bg-accent border border-accent rounded-md p-3 mb-4 flex items-start gap-2">
          <ShieldCheck size={15} className="text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-secondary-foreground">
            <p className="font-medium text-foreground">학생 응시 로그 수집 안내</p>
            <p className="mt-0.5">
              학생 응시 중에는 시작/문항 이동/답변 변경/포커스 이탈/제출 시각이 자동 기록됩니다.
              본 화면의 이상 후보 표시는 단서이며 부정행위 단정이 아니므로 최종 판단은 강사가 수행합니다.
            </p>
          </div>
        </div>

        {/* 필터/검색 */}
        <div className="flex items-center gap-3 mb-3">
          <DropdownSelect
            value={filter}
            onChange={setFilter}
            options={FILTER_OPTIONS}
            filterMode
            ghost
            size="md"
            style={{ width: 140 }}
          />
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름 또는 학번 검색"
              className="w-full text-sm pl-9 pr-3 py-2.5 bg-white border border-border rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"
            />
          </div>
        </div>

        <p className="text-xs mb-2 px-1 text-muted-foreground">총 {filtered.length}명 노출</p>

        {/* 학생 테이블 */}
        <Card className="overflow-hidden py-0 gap-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {enrichedStudents.length === 0 ? '응시 대상 학생이 없습니다' : '조건에 해당하는 학생이 없습니다'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-secondary">
              <div className="hidden sm:grid grid-cols-[1fr_120px_120px_120px_160px_100px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-background text-center">
                <span className="text-left">학생</span>
                <span>상태</span>
                <span>시작 시각</span>
                <span>경과 시간</span>
                <span>이상 단서</span>
                <span>활동 로그</span>
              </div>
              {filtered.map(s => (
                <StudentRow
                  key={s.id}
                  student={s}
                  nowMs={nowMs}
                  onOpenLog={() => setSelectedStudent(s)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 활동 로그 모달 */}
      <Dialog open={!!selectedStudent} onOpenChange={(o) => { if (!o) setSelectedStudent(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
          {selectedStudent && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-secondary">
                <DialogTitle>{selectedStudent.name} ({selectedStudent.studentId})</DialogTitle>
                <DialogDescription>
                  {STATUS_META[selectedStudent._status].label} · 활동 로그 타임라인
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 flex flex-col">
                <ActivityLogPanel
                  student={selectedStudent}
                  quizId={id}
                  questions={questions}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SummaryCard({ label, value, total, icon: Icon, tone, hint }) {
  const toneClass = {
    primary: 'bg-accent border-primary/30 text-primary',
    success: 'bg-success-bg border-success-border text-success-foreground',
    warning: 'bg-warning-bg border-warning-border text-warning-foreground',
    muted:   'bg-secondary border-border text-secondary-foreground',
  }[tone] || 'bg-secondary border-border text-secondary-foreground'

  return (
    <Card className={cn('p-3 gap-1 border', toneClass)}>
      <div className="flex items-center gap-1.5 text-xs">
        <Icon size={13} />
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none mt-1">
        {value}
        <span className="text-sm font-medium ml-1 opacity-80">/ {total}명</span>
      </p>
      {hint && <p className="text-[11px] mt-1 opacity-80">{hint}</p>}
    </Card>
  )
}

function StudentRow({ student, nowMs, onOpenLog }) {
  const status = student._status
  const meta = STATUS_META[status]
  const anomalies = student._anomaly

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_120px_160px_100px] gap-3 px-4 py-3 items-center hover:bg-background transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
        <p className="text-xs text-muted-foreground truncate">{student.studentId} · {student.department}</p>
      </div>
      <div className="sm:text-center">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
          meta.className,
        )}>
          {meta.label}
        </span>
      </div>
      <div className="text-xs text-secondary-foreground tabular-nums sm:text-center">
        {student.startTime ? formatDateTime(student.startTime).slice(5) : '-'}
      </div>
      <div className="text-xs text-secondary-foreground tabular-nums sm:text-center">
        {status === 'in_progress' ? formatElapsed(student.startTime, nowMs) : '-'}
      </div>
      <div className="flex flex-wrap gap-1 sm:justify-center">
        {anomalies.length === 0 ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          anomalies.map((reason, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-warning-bg text-warning-foreground"
              title="이상 후보 단서"
            >
              <AlertTriangle size={10} />
              {reason}
            </span>
          ))
        )}
      </div>
      <div className="sm:text-center">
        <Button variant="ghost" size="sm" onClick={onOpenLog} className="text-xs">
          <Activity size={13} />
          로그 보기
        </Button>
      </div>
    </div>
  )
}
