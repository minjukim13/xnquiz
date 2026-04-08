import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Clock, FileText, CheckCircle2, AlertCircle, Send, BarChart2 } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes } from '../data/mockData'
import { useRole } from '../context/RoleContext'
import { getStudentAttempts } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'

// ─────────────────────────────── 공통: 주차/차시 드롭다운 필터 ───────────────────────────────
const WEEK_OPTIONS = [
  { value: 'all', label: '전체 주차' },
  { value: 'unassigned', label: '미지정' },
  ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` })),
]

function WeekSessionFilter({ quizzes, filterWeek, filterSession, onWeekChange, onSessionChange, hideUnassigned = false }) {
  const weekOptions = hideUnassigned
    ? WEEK_OPTIONS.filter(o => o.value !== 'unassigned')
    : WEEK_OPTIONS

  // 선택한 주차에 실제 퀴즈가 있는 차시 표시. 번호 주차는 1차시 항상 포함. 주차 미선택이면 빈 목록.
  const sessionOptions = useMemo(() => {
    if (filterWeek === 'all') return []
    let base = quizzes
    if (filterWeek === 'unassigned') base = quizzes.filter(q => !q.week || q.week === 0)
    else base = quizzes.filter(q => q.week === filterWeek)
    const fromQuizzes = base.map(q => q.session).filter(s => s && s > 0)
    const withDefault = filterWeek !== 'unassigned' ? [1, ...fromQuizzes] : fromQuizzes
    const sessions = [...new Set(withDefault)].sort((a, b) => a - b)
    return [
      { value: 'all', label: '전체 차시' },
      ...sessions.map(s => ({ value: s, label: `${s}차시` })),
    ]
  }, [quizzes, filterWeek])

  return (
    <div className="flex gap-2">
      <DropdownSelect
        value={filterWeek}
        onChange={v => { onWeekChange(v); onSessionChange('all') }}
        options={weekOptions}
        size="md"
        filterMode
        style={{ width: 120 }}
      />
      <DropdownSelect
        value={filterSession}
        onChange={onSessionChange}
        options={sessionOptions}
        placeholder="차시 선택"
        disabled={filterWeek === 'all'}
        size="md"
        filterMode
        style={{ width: 108 }}
      />
    </div>
  )
}

// 필터 적용 함수
function applyWeekSessionFilter(quizzes, filterWeek, filterSession) {
  return quizzes.filter(q => {
    if (filterWeek === 'unassigned') { if (q.week && q.week > 0) return false }
    else if (filterWeek !== 'all') { if (q.week !== filterWeek) return false }
    if (filterSession !== 'all' && q.session !== filterSession) return false
    return true
  })
}

const STATUS_CONFIG = {
  open:    { label: '진행중',  badge: 'text-[#16A34A]', bgStyle: { background: '#F0FDF4' } },
  grading: { label: '진행중',  badge: 'text-[#16A34A]', bgStyle: { background: '#F0FDF4' } },
  closed:  { label: '마감',   badge: 'text-[#6B7280]', bgStyle: { background: '#F3F4F6' } },
  draft:   { label: '발행 전', badge: 'text-[#6366F1]', bgStyle: { background: '#EEF2FF' } },
  scheduled: { label: '예정', badge: 'text-[#D97706]', bgStyle: { background: '#FFFBEB' } },
}

export default function QuizList() {
  const { role } = useRole()
  return role === 'student' ? <StudentQuizList /> : <InstructorQuizList />
}

// ─────────────────────────────── 교수자 뷰 ───────────────────────────────
function InstructorQuizList() {
  const [quizzes, setQuizzes] = useState(() => [...mockQuizzes])
  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')

  const handlePublishQuiz = (quizId) => {
    const idx = quizzes.findIndex(q => q.id === quizId)
    if (idx === -1) return
    const updated = [...quizzes]
    updated[idx] = { ...updated[idx], status: 'open' }
    mockQuizzes[mockQuizzes.findIndex(q => q.id === quizId)] = updated[idx]
    setQuizzes(updated)
  }

  // 최근 생성 순(id 내림차순) 단일 목록
  const sortedQuizzes = useMemo(
    () => applyWeekSessionFilter(quizzes, filterWeek, filterSession)
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id)),
    [quizzes, filterWeek, filterSession]
  )

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-6">

        {/* 헤더: 제목 + 새 퀴즈 */}
        <div className="flex items-end justify-between mb-5 gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: '#222222' }}>퀴즈 관리</h1>
          </div>
          <Link to="/quiz/new" className="btn-primary shrink-0">
            <Plus size={15} />
            새 퀴즈
          </Link>
        </div>

        {/* 툴바: 필터 */}
        <div className="flex items-center mb-3 gap-2">
          <WeekSessionFilter
            quizzes={quizzes}
            filterWeek={filterWeek}
            filterSession={filterSession}
            onWeekChange={setFilterWeek}
            onSessionChange={setFilterSession}
          />
        </div>

        {sortedQuizzes.length > 0 ? (
          <div className="grid gap-3">
            {sortedQuizzes.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} onPublishQuiz={handlePublishQuiz} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#BDBDBD' }}>
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">해당 조건에 맞는 퀴즈가 없습니다.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

// 응시중일 때만 D-day 배지 반환
function getDdayBadge(quiz) {
  if (quiz.status !== 'open') return null
  const now = new Date()
  const due = quiz.dueDate ? new Date(quiz.dueDate) : null
  if (!due) return null
  const diff = Math.ceil((due - now) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return { label: 'D-0', color: '#B43200', bg: '#FFF6F2' }
  return { label: `D-${diff}`, color: '#B45309', bg: '#FFF9E6' }
}

function QuizCard({ quiz, onPublishQuiz }) {
  const cfg = STATUS_CONFIG[quiz.status]
  const [confirmPublish, setConfirmPublish] = useState(false)
  const ddayBadge = getDdayBadge(quiz)
  const navigate = useNavigate()

  const cardTarget = (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
    ? `/quiz/${quiz.id}/grade`
    : null

  return (
    <div
      className="card overflow-hidden transition-shadow"
      style={{
        cursor: cardTarget ? 'pointer' : 'default',
        background: quiz.status === 'draft' ? '#F9FAFB' : '#fff',
        opacity: quiz.status === 'draft' ? 0.85 : 1,
      }}
      onClick={() => cardTarget && navigate(cardTarget)}
      onMouseEnter={e => { if (cardTarget) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
    >
      <div className="flex items-start gap-4 px-6 pt-6 pb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}
              style={cfg.bgStyle}
            >
              {cfg.label}
            </span>
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs" style={{ color: '#9E9E9E' }}>
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug mb-1 truncate" style={{ color: '#222222' }}>{quiz.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs" style={{ color: '#BDBDBD' }}>{quiz.startDate} ~ {quiz.dueDate}</p>
            {ddayBadge && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ color: ddayBadge.color, background: ddayBadge.bg }}
              >
                {ddayBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
          {/* 텍스트 버튼 그룹: 미리보기, 편집 */}
          <div className="flex items-center">
            <Link
              to={`/quiz/${quiz.id}/attempt?preview=true`}
              className="text-xs font-medium px-2.5 py-2 rounded transition-colors"
              style={{ color: '#9E9E9E' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#616161' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9E9E9E' }}
            >
              미리보기
            </Link>
            <Link
              to={`/quiz/${quiz.id}/edit`}
              className="text-xs font-medium px-2.5 py-2 rounded transition-colors"
              style={{ color: '#9E9E9E' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#616161' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9E9E9E' }}
            >
              편집
            </Link>
          </div>

          {/* 구분선 */}
          {(quiz.status === 'draft' || quiz.status !== 'draft') && (
            <span className="w-px h-4 mx-2" style={{ background: '#E5E7EB' }} />
          )}

          {/* 주요 액션 버튼 */}
          {quiz.status === 'draft' && !confirmPublish && (
            <button
              onClick={() => setConfirmPublish(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md transition-colors"
              style={{ background: '#16A34A', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#15803D' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#16A34A' }}
            >
              <Send size={11} />
              발행
            </button>
          )}
          {quiz.status === 'draft' && confirmPublish && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#616161' }}>발행할까요?</span>
              <button
                onClick={() => { onPublishQuiz(quiz.id); setConfirmPublish(false) }}
                className="text-xs font-semibold text-white px-2.5 py-1.5 rounded transition-colors"
                style={{ background: '#16A34A' }}
              >
                확인
              </button>
              <button
                onClick={() => setConfirmPublish(false)}
                className="text-xs px-2 py-1.5 rounded"
                style={{ color: '#616161', border: '1px solid #E0E0E0' }}
              >
                취소
              </button>
            </div>
          )}
          {quiz.status !== 'draft' && (
            <Link
              to={`/quiz/${quiz.id}/stats`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md transition-colors"
              style={{ background: '#4F46E5', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4338CA' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4F46E5' }}
            >
              <BarChart2 size={11} />
              통계
            </Link>
          )}
        </div>
      </div>

      <div className="px-6 py-4" style={{ background: '#FAFAFA', borderTop: '1px solid #EEEEEE' }} onClick={e => e.stopPropagation()}>
        {quiz.status === 'draft' ? (
          <p style={{ fontSize: 12, color: '#757575' }}>
            문항 {quiz.questions}개 | 총점 {quiz.totalPoints}점 | 제한시간 {quiz.timeLimit === 0 ? '없음' : `${quiz.timeLimit}분`}
          </p>
        ) : (
          <ActiveStats quiz={quiz} />
        )}
      </div>
    </div>
  )
}


function ActiveStats({ quiz }) {
  const newAttempts = getStudentAttempts(quiz.id)
  const submitted = quiz.submitted + newAttempts.length
  const graded = quiz.graded + newAttempts.length
  const gradeProgress = submitted > 0 ? Math.round((graded / submitted) * 100) : 0
  const submitRate = Math.round((submitted / quiz.totalStudents) * 100)
  const unsubmitted = Math.max(0, quiz.totalStudents - submitted)
  const isClosed = quiz.status === 'closed' || quiz.status === 'grading'

  const cols = [
    { label: '응시율',   value: `${submitRate}%`,   color: '#222222' },
    { label: '응시인원', value: `${submitted}명`,   color: '#222222' },
    { label: '미제출',   value: `${unsubmitted}명`, color: unsubmitted > 0 ? '#EF4444' : '#9E9E9E' },
    ...(isClosed ? [{ label: '평균점수', value: quiz.avgScore != null ? `${quiz.avgScore}점` : '-', color: '#4f46e5' }] : []),
  ]

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
      {cols.map((item, idx) => (
        <div key={item.label} className="text-center px-4 first:pl-0 last:pr-0" style={idx < cols.length - 1 ? { borderRight: '1px solid #EEEEEE' } : {}}>
          <p className="text-lg font-bold leading-none" style={{ color: item.color }}>{item.value}</p>
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>{item.label}</p>
        </div>
      ))}
    </div>
  )
}


// ─────────────────────────────── 학생 뷰 ───────────────────────────────
function StudentQuizList() {
  const { currentStudent } = useRole()
  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')

  const allQuizzes = mockQuizzes.filter(q => q.status !== 'draft')

  const filteredAll = useMemo(
    () => applyWeekSessionFilter(allQuizzes, filterWeek, filterSession),
    [filterWeek, filterSession]
  )

  const openQuizzes   = filteredAll.filter(q => q.status === 'open')
  const closedQuizzes = filteredAll.filter(q => q.status === 'closed' || q.status === 'grading')
  const hasAny = filteredAll.length > 0

  return (
    <Layout>
      <div className="max-w-[760px] mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-end justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>내 퀴즈</h1>
          <WeekSessionFilter
            quizzes={allQuizzes}
            filterWeek={filterWeek}
            filterSession={filterSession}
            onWeekChange={setFilterWeek}
            onSessionChange={setFilterSession}
          />
        </div>

        {/* 응시 가능한 퀴즈 */}
        {openQuizzes.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold mb-3" style={{ color: '#018600' }}>응시 가능 ({openQuizzes.length})</p>
            <div className="space-y-3">
              {openQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {/* 종료된 퀴즈 */}
        {closedQuizzes.length > 0 && (
          <section>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9E9E9E' }}>종료 ({closedQuizzes.length})</p>
            <div className="space-y-3">
              {closedQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {!hasAny && (
          <div className="text-center py-16" style={{ color: '#9E9E9E' }}>
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {filterWeek !== 'all' || filterSession !== 'all'
                ? '해당 조건에 맞는 퀴즈가 없습니다.'
                : '현재 응시 가능한 퀴즈가 없습니다.'
              }
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StudentQuizCard({ quiz, studentId }) {
  const attempts = getStudentAttempts(quiz.id)
  const myAttempts = attempts.filter(a => a.studentId === studentId)
  const myAttempt = myAttempts[myAttempts.length - 1] ?? null
  const attemptCount = myAttempts.length
  const maxAttempts = quiz.allowAttempts ?? 1
  const isAttemptExceeded = maxAttempts !== -1 && attemptCount >= maxAttempts
  const isOpen   = quiz.status === 'open'
  const isClosed = quiz.status === 'closed' || quiz.status === 'grading'
  const ddayBadge = getDdayBadge(quiz)

  // 퀴즈 상태 뱃지 (1레이어)
  const statusBadge = isOpen
    ? { label: '응시중', color: '#018600', bg: '#E5FCE3' }
    : { label: '종료', color: '#9E9E9E', bg: '#F5F5F5' }

  // 내 응시 상태 뱃지 (2레이어: 내가 어떤 상태인지)
  const myBadge = (() => {
    if (!myAttempt) {
      if (isOpen) return null // 아직 미응시 → 버튼으로 유도
      return { label: '미제출', color: '#9E9E9E', bg: '#F5F5F5', icon: false }
    }
    if (myAttempt.manualPending > 0) return { label: '채점 대기', color: '#B45309', bg: '#FFF9E6', icon: false }
    return { label: '채점 완료', color: '#4f46e5', bg: '#EEF2FF', icon: true }
  })()

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* 뱃지 행 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: statusBadge.color, background: statusBadge.bg }}>
                {statusBadge.label}
              </span>
              {myBadge && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1" style={{ color: myBadge.color, background: myBadge.bg }}>
                  {myBadge.icon && <CheckCircle2 size={11} />}
                  {myBadge.label}
                </span>
              )}
              {(quiz.week > 0 || quiz.session > 0) && (
                <span className="text-xs" style={{ color: '#9E9E9E' }}>
                  {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold mb-1.5 truncate" style={{ color: '#222222' }}>{quiz.title}</h3>

            {/* 기간 + D-day */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs" style={{ color: '#BDBDBD' }}>{quiz.startDate} ~ {quiz.dueDate}</p>
              {ddayBadge && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: ddayBadge.color, background: ddayBadge.bg }}>
                  {ddayBadge.label}
                </span>
              )}
            </div>

            {/* 스펙 */}
            <p className="mt-1.5" style={{ fontSize: 11, color: '#BDBDBD' }}>
              {quiz.questions}문항 | {quiz.totalPoints}점 | {quiz.timeLimit === 0 ? '시간 제한 없음' : `${quiz.timeLimit ?? 30}분`}
            </p>
          </div>

          <div className="shrink-0 mt-0.5">
            {isOpen && !isAttemptExceeded && (
              <Link
                to={`/quiz/${quiz.id}/attempt`}
                className="text-xs font-semibold text-white px-4 py-2 rounded transition-colors"
                style={{ background: '#4f46e5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
              >
                {attemptCount > 0 ? '재응시' : '응시하기'}
              </Link>
            )}
            {isOpen && isAttemptExceeded && (
              <div className="relative group">
                <button disabled className="text-xs font-semibold px-4 py-2 rounded cursor-not-allowed" style={{ background: '#E0E0E0', color: '#9E9E9E' }}>
                  응시하기
                </button>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap text-xs px-2.5 py-1.5 rounded pointer-events-none z-10" style={{ background: '#424242', color: '#fff' }}>
                  응시 가능 횟수({maxAttempts}회)를 초과했습니다
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 내 응시 결과 */}
      {myAttempt && (() => {
        const now = new Date()
        const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null
        const inPeriod = (() => {
          const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
          const e = quiz.scoreRevealEnd   ? new Date(quiz.scoreRevealEnd)   : null
          return (!s || now >= s) && (!e || now <= e)
        })()
        let released
        if (quiz.scoreRevealEnabled !== undefined) {
          // 신규 필드
          const timingMet = quiz.scoreRevealTiming === 'immediately' ? true
                          : quiz.scoreRevealTiming === 'after_due'   ? (dueDate && now >= dueDate)
                          : quiz.scoreRevealTiming === 'period'      ? inPeriod
                          : false
          released = quiz.scoreRevealEnabled && timingMet
        } else if (quiz.scoreReleasePolicy !== undefined) {
          // 구형 필드 (하위 호환)
          const p = quiz.scoreReleasePolicy
          released = p === 'wrong_only' || p === 'with_answer' ? true
                   : p === 'after_due'  ? (dueDate && now >= dueDate)
                   : p === 'period'     ? inPeriod
                   : false
        } else {
          released = true // 필드 없는 기존 mock
        }

        // 수동채점 미완료 문항 점수는 0으로 포함 (정책 결정: §4-3)
        const autoScore = myAttempt.totalAutoScore ?? 0
        const manualScore = myAttempt.manualPending > 0 ? 0 : (myAttempt.totalManualScore ?? 0)
        const totalScore = autoScore + manualScore
        const totalPossible = myAttempt.totalPossibleAuto ?? quiz.totalPoints

        return (
          <div className="px-5 py-3" style={{ background: '#F5F7FF', borderTop: '1px solid #E8EBFF' }}>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {released ? (
                <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                  {totalScore}점 / {totalPossible}점
                  {myAttempt.manualPending > 0 && <span style={{ color: '#9E9E9E', fontWeight: 400 }}> (수동채점 대기 0점 반영)</span>}
                </span>
              ) : (
                <span style={{ color: '#9E9E9E' }}>
                  {quiz.scoreRevealEnabled === false || quiz.scoreReleasePolicy === null ? '성적 비공개' : '공개 예정'}
                </span>
              )}
              {myAttempt.manualPending > 0 && released && (
                <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                  <AlertCircle size={11} />
                  수동채점 {myAttempt.manualPending}문항 대기 중
                </span>
              )}
              <span style={{ color: '#9E9E9E' }}>제출 {myAttempt.submittedAt}</span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
