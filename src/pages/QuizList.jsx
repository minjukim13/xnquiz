import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, AlertCircle, FolderInput, Copy, Search, Settings2, Lock, Trash2, MoreVertical, Eye, EyeOff, ArrowUpDown, Pencil, ClipboardCheck, ClipboardList, BarChart3 } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { mockQuizzes, MOCK_COURSES } from '../data/mockData'
import { useRole } from '../context/role'
import { getStudentAttempts } from '../data/mockData'
import { listQuizzes, getQuizQuestions, setQuizQuestions, createQuiz, updateQuiz, deleteQuiz, listAttempts, isApiMode, listCourses } from '@/lib/data'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QuizSettingsDialog from '../components/QuizSettingsDialog'
import StatusBadge from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { isDeadlinePassed } from '@/utils/deadlineUtils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const CURRENT_COURSE = 'CS301 데이터베이스'

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
    <div className="flex gap-2 min-w-0">
      <DropdownSelect
        value={filterWeek}
        onChange={v => { onWeekChange(v); onSessionChange('all') }}
        options={weekOptions}
        size="md"
        filterMode
        ghost
        className="w-[100px] sm:w-[120px]"
      />
      <DropdownSelect
        value={filterSession}
        onChange={onSessionChange}
        options={sessionOptions}
        placeholder="차시 선택"
        disabled={filterWeek === 'all'}
        size="md"
        filterMode
        ghost
        className="w-[92px] sm:w-[108px]"
      />
    </div>
  )
}

function applyWeekSessionFilter(quizzes, filterWeek, filterSession) {
  return quizzes.filter(q => {
    if (filterWeek === 'unassigned') { if (q.week && q.week > 0) return false }
    else if (filterWeek !== 'all') { if (q.week !== filterWeek) return false }
    if (filterSession !== 'all' && q.session !== filterSession) return false
    return true
  })
}

// ─────────────────────────────── 정렬 옵션 ───────────────────────────────
const SORT_OPTIONS = [
  { value: 'recent', label: '최근생성순' },
  { value: 'week-asc', label: '주차 오름차순' },
  { value: 'week-desc', label: '주차 내림차순' },
  { value: 'deadline', label: '마감임박순' },
]

function sortQuizzes(quizzes, sortKey) {
  const sorted = quizzes.slice()
  switch (sortKey) {
    case 'week-asc':
      return sorted.sort((a, b) => {
        const aw = a.week || 999
        const bw = b.week || 999
        if (aw !== bw) return aw - bw
        const as = a.session || 0
        const bs = b.session || 0
        return as - bs
      })
    case 'week-desc':
      return sorted.sort((a, b) => {
        const aw = a.week || 0
        const bw = b.week || 0
        if (bw !== aw) return bw - aw
        const as = a.session || 0
        const bs = b.session || 0
        return bs - as
      })
    case 'deadline': {
      const now = new Date()
      return sorted.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate) : null
        const bd = b.dueDate ? new Date(b.dueDate) : null
        // 마감일 없는 항목은 뒤로
        if (!ad && !bd) return 0
        if (!ad) return 1
        if (!bd) return -1
        // 이미 지난 마감은 뒤로
        const aPast = ad < now
        const bPast = bd < now
        if (aPast && !bPast) return 1
        if (!aPast && bPast) return -1
        return ad - bd
      })
    }
    case 'recent':
    default:
      return sorted.sort((a, b) => {
        // createdAt 우선 (api 모드). 없으면 id 내림차순 (mock 모드 숫자 id 호환).
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }
        const aNum = Number(a.id)
        const bNum = Number(b.id)
        if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum
        return String(b.id).localeCompare(String(a.id))
      })
  }
}

// startDate 기반 예약 공개 판별 — status를 바꾸지 않고 조건 분기로 처리
function isScheduled(quiz) {
  if (quiz.status !== 'open' || !quiz.startDate) return false
  return new Date() < new Date(quiz.startDate)
}

// dueDate 기반 화면용 상태 결정 — DB status 는 유지, 표시만 마감으로 전환
// 지각 제출 허용 시 lateSubmitDeadline 까지는 '진행중' 으로 유지됨 (deadlineUtils)
function resolveDisplayStatus(quiz) {
  if (isScheduled(quiz)) return 'scheduled'
  if (quiz.status === 'open' && isDeadlinePassed(quiz)) return 'closed'
  return quiz.status
}

// STATUS_CONFIG 제거 → StatusBadge 컴포넌트로 통합

export default function QuizList() {
  const { role } = useRole()
  return role === 'student' ? <StudentQuizList /> : <InstructorQuizList />
}

// ─────────────────────────────── 교수자 뷰 ───────────────────────────────
function InstructorQuizList() {
  // mock 모드는 초기값을 동기로 채워 첫 렌더 깜빡임 제거 — api 모드는 서버 왕복 필요
  const [quizzes, setQuizzes] = useState(() => {
    if (isApiMode()) return []
    return mockQuizzes.filter(q => q.course === CURRENT_COURSE)
  })
  // api 모드는 서버 왕복이 끝날 때까지 skeleton 표시. mock 모드는 즉시 데이터 있어 skeleton 불필요
  const [loading, setLoading] = useState(() => isApiMode())

  // 데이터 레이어 경유 — mock/api 모드 자동 분기
  const reload = async () => {
    try {
      const all = await listQuizzes()
      setQuizzes(all.filter(q => q.course === CURRENT_COURSE))
    } catch (err) {
      console.error('[QuizList] listQuizzes 실패', err)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const all = await listQuizzes().catch(() => [])
      if (!mounted) return
      setQuizzes(all.filter(q => q.course === CURRENT_COURSE))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')
  const [sortKey, setSortKey] = useState('recent')
  const [copySourceQuiz, setCopySourceQuiz] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('modal') === 'global-settings') setShowGlobalSettings(true)
  }, [searchParams])
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // 다른 페이지에서 전달된 토스트 표시
  useEffect(() => {
    const msg = sessionStorage.getItem('xnq_toast')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot toast on mount
    if (msg) { showToast(msg); sessionStorage.removeItem('xnq_toast') }
  }, [])

  const cloneQuestions = async (srcId, newId) => {
    const srcQs = await getQuizQuestions(srcId)
    if (srcQs.length === 0) return
    const cloned = srcQs.map((q, i) => ({
      ...q,
      id: `${newId}_q${i + 1}`,
      gradedCount: 0,
      totalCount: 0,
      avgScore: undefined,
    }))
    await setQuizQuestions(newId, cloned)
  }

  const resetFields = (quiz, overrides = {}) => ({
    ...quiz,
    status: 'draft',
    week: null,
    session: null,
    startDate: '',
    dueDate: '',
    scoreRevealEnabled: false,
    scoreRevealScope: null,
    scoreRevealTiming: null,
    scoreRevealStart: null,
    scoreRevealEnd: null,
    assignments: [],
    accessCode: '',
    ipRestriction: '',
    allowLateSubmit: false,
    lateSubmitDeadline: null,
    submitted: 0,
    graded: 0,
    pendingGrade: 0,
    avgScore: undefined,
    ...overrides,
  })

  const handleCopyQuiz = async (quiz, targetCourse) => {
    const { id: _srcId, ...rest } = quiz   
    const draft = resetFields(rest, { course: targetCourse })
    try {
      const created = await createQuiz(draft)
      await cloneQuestions(quiz.id, created.id)
      await reload()
      const label = targetCourse === CURRENT_COURSE ? '현재 과목' : targetCourse
      showToast(`'${quiz.title}'을(를) ${label}으로 복사했습니다`)
    } catch (err) {
      console.error('[QuizList] copy 실패', err)
      showToast('복사 중 오류가 발생했습니다')
    }
    setCopySourceQuiz(null)
  }

  const handleImportQuizzes = async (selectedQuizzes) => {
    try {
      const imported = []
      for (const q of selectedQuizzes) {
        const { id: _srcId, ...rest } = q   
        const draft = resetFields(rest, { course: CURRENT_COURSE })
        const created = await createQuiz(draft)
        await cloneQuestions(q.id, created.id)
        imported.push(created)
      }
      await reload()
      setShowImportModal(false)
      const msg = imported.length === 1
        ? `'${imported[0].title}' 가져오기 완료. 목록에서 편집하세요`
        : `퀴즈 ${imported.length}개 가져오기 완료. 임시저장 상태로 추가되었습니다`
      showToast(msg)
    } catch (err) {
      console.error('[QuizList] import 실패', err)
      showToast('가져오기 중 오류가 발생했습니다')
    }
  }

  const handleToggleVisibility = async (quiz) => {
    if (quiz.status === 'draft') return
    const nextVisible = quiz.visible === false
    // XQ-D-02 R-011: 응시자가 있으면 비공개(숨기기) 전환 차단
    if (!nextVisible && (quiz.submitted ?? 0) > 0) {
      showToast(`'${quiz.title}'은(는) 이미 응시자가 있어 비공개로 전환할 수 없습니다`)
      return
    }
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, visible: nextVisible } : q))
    try {
      await updateQuiz(quiz.id, { ...quiz, visible: nextVisible })
      showToast(nextVisible
        ? `'${quiz.title}'을(를) 학생에게 공개했습니다`
        : `'${quiz.title}'을(를) 학생에게서 숨겼습니다`)
    } catch (err) {
      console.error('[QuizList] visibility toggle 실패', err)
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, visible: !nextVisible } : q))
      showToast('공개여부 변경 중 오류가 발생했습니다')
    }
  }

  const handleDeleteQuiz = (quiz) => {
    setDeleteConfirm(quiz)
  }

  const confirmDeleteQuiz = async () => {
    if (!deleteConfirm) return
    const target = deleteConfirm
    setDeleteConfirm(null)
    try {
      await deleteQuiz(target.id)
      await reload()
      showToast(`'${target.title}' 퀴즈가 삭제되었습니다`)
    } catch (err) {
      console.error('[QuizList] delete 실패', err)
      showToast('삭제 중 오류가 발생했습니다')
    }
  }

  const sortedQuizzes = useMemo(
    () => sortQuizzes(applyWeekSessionFilter(quizzes, filterWeek, filterSession), sortKey),
    [quizzes, filterWeek, filterSession, sortKey]
  )

  return (
    <>
      <div className="pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 sm:pt-8 pb-4 sm:pb-5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-bold text-foreground leading-tight truncate">퀴즈 관리</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowGlobalSettings(true)}
              title="퀴즈 기본 설정"
            >
              <Settings2 size={18} />
            </Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <FolderInput size={14} />
              가져오기
            </Button>
            <Button asChild>
              <Link to="/quiz/new">
                <Plus size={15} />
                새 퀴즈
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1 mb-3">
          <WeekSessionFilter
            quizzes={quizzes}
            filterWeek={filterWeek}
            filterSession={filterSession}
            onWeekChange={setFilterWeek}
            onSessionChange={setFilterSession}
          />
          <DropdownSelect
            value={sortKey}
            onChange={setSortKey}
            options={SORT_OPTIONS}
            size="md"
            ghost
            className="w-[120px] sm:w-[140px] shrink-0"
          />
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map(i => <QuizCardSkeleton key={i} />)}
          </div>
        ) : sortedQuizzes.length > 0 ? (
          <div className="grid gap-3">
            {sortedQuizzes.map(quiz => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onCopy={setCopySourceQuiz}
                onDelete={handleDeleteQuiz}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm mb-4">해당 조건에 맞는 퀴즈가 없습니다.</p>
            <Button asChild>
              <Link to="/quiz/new">
                <Plus size={15} />
                새 퀴즈 만들기
              </Link>
            </Button>
          </div>
        )}
      </div>

      {copySourceQuiz && (
        <QuizCopyModal
          quiz={copySourceQuiz}
          onClose={() => setCopySourceQuiz(null)}
          onCopy={handleCopyQuiz}
        />
      )}

      {showImportModal && (
        <QuizImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportQuizzes}
        />
      )}

      <QuizSettingsDialog open={showGlobalSettings} onOpenChange={setShowGlobalSettings} />

      {deleteConfirm && (
        <ConfirmDialog
          title="퀴즈 삭제"
          message={`'${deleteConfirm.title}' 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmDanger
          onConfirm={confirmDeleteQuiz}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  )
}

// 응시중일 때만 D-day 배지 반환 (예약 공개 퀴즈는 제외)
function getDdayBadge(quiz) {
  if (quiz.status !== 'open' || isScheduled(quiz)) return null
  const now = new Date()
  const due = quiz.dueDate ? new Date(quiz.dueDate) : null
  if (!due) return null
  const diff = Math.ceil((due - now) / 86400000)
  if (diff < 0) return null
  return { label: diff === 0 ? 'D-0' : `D-${diff}`, urgent: diff === 0 }
}

function QuizCard({ quiz, onCopy, onDelete, onToggleVisibility }) {
  const ddayBadge = getDdayBadge(quiz)
  const navigate = useNavigate()
  const scheduled = isScheduled(quiz)
  const displayStatus = resolveDisplayStatus(quiz)
  const isDraft = quiz.status === 'draft'
  // 임시저장은 학생 화면에 노출되지 않으므로 visible 값과 무관하게 항상 비공개로 표시
  const isVisible = !isDraft && quiz.visible !== false
  const hasTakers = (quiz.submitted ?? 0) > 0
  const hideBlocked = isVisible && hasTakers // 응시자 있으면 비공개 전환 불가 (XQ-D-02 R-011)

  const canGrade = !scheduled && (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
  const stats = getInlineStats(quiz, scheduled)

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow cursor-pointer hover:shadow-md',
        quiz.status === 'draft' ? 'bg-secondary opacity-85' : 'bg-white'
      )}
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
            {!isDraft && <VisibilityBadge isVisible={isVisible} />}
            <StatusBadge status={displayStatus} />
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug mb-1 truncate text-foreground">{quiz.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground break-keep">
              {quiz.startDate || quiz.dueDate ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}` : '응시 기간 제한 없음'}
              {quiz.lockDate && (
                <>
                  <span className="text-muted-foreground">{' | '}</span>
                  <span className="text-muted-foreground">이용 종료: {quiz.lockDate}{new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}</span>
                </>
              )}
            </p>
            {ddayBadge && (
              <span className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap',
                ddayBadge.urgent ? 'text-destructive bg-destructive-soft' : 'text-warning bg-warning-bg'
              )}>
                {ddayBadge.label}
              </span>
            )}
          </div>
          {quiz.allowLateSubmit && quiz.lateSubmitDeadline && (
            <p className="text-xs text-warning mt-0.5">지각 제출: {quiz.lateSubmitDeadline.replace('T', ' ')}까지</p>
          )}
          {quiz.allowLateSubmit && !quiz.lateSubmitDeadline && quiz.dueDate && (
            <p className="text-xs text-warning mt-0.5">지각 제출: 무제한 허용</p>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0" onClick={e => e.stopPropagation()}>
          <div className="hidden sm:flex items-center gap-3 sm:gap-5">
            {stats.map(s => (
              <InlineStat key={s.label} label={s.label} value={s.value} cls={s.cls} />
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/quiz/${quiz.id}/edit`)}>
                <Pencil size={14} />
                편집
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/quiz/${quiz.id}/attempt?preview=true`)}>
                <Eye size={14} />
                미리보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy(quiz)}>
                <Copy size={14} />
                복사
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isDraft || hideBlocked}
                onClick={() => !isDraft && !hideBlocked && onToggleVisibility(quiz)}
                title={isDraft ? '임시저장 상태에선 자동 비공개입니다' : hideBlocked ? '응시자가 있어 비공개로 전환할 수 없습니다' : undefined}
              >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                {isDraft ? '비공개 (임시저장)' : isVisible ? '학생에게 숨기기' : '학생에게 공개'}
              </DropdownMenuItem>
              {canGrade && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/quiz/${quiz.id}/grade`)}>
                    <ClipboardList size={14} />
                    채점
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/quiz/${quiz.id}/stats`)}>
                    <BarChart3 size={14} />
                    통계
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(quiz)}>
                <Trash2 size={14} />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}

function VisibilityBadge({ isVisible }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        isVisible
          ? 'bg-accent text-primary'
          : 'bg-secondary text-muted-foreground ring-1 ring-border'
      )}
    >
      {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
      {isVisible ? '공개' : '비공개'}
    </span>
  )
}

function InlineStat({ label, value, cls, hideOnMobile = false }) {
  return (
    <div className={cn('flex-col items-center gap-1 min-w-[44px] sm:min-w-[56px]', hideOnMobile ? 'hidden sm:flex' : 'flex')}>
      <p className={cn('text-[14px] sm:text-[15px] font-bold leading-none whitespace-nowrap', cls || 'text-foreground')}>{value}</p>
      {label && <p className="text-[11px] text-muted-foreground leading-none whitespace-nowrap">{label}</p>}
    </div>
  )
}

function getInlineStats(quiz, scheduled) {
  if (quiz.status === 'draft' || scheduled) {
    return [
      { label: '문항 수',  value: `${quiz.questions}개` },
      { label: '총점',     value: `${quiz.totalPoints}점` },
      { label: '제한시간', value: !quiz.timeLimit ? '없음' : `${quiz.timeLimit}분` },
    ]
  }
  const submitted = quiz.submitted ?? 0
  const totalStudents = quiz.totalStudents ?? 0
  const submitRate = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0
  const unsubmitted = Math.max(0, totalStudents - submitted)
  return [
    { label: '응시율',   value: `${submitRate}%`, primary: true },
    { label: '응시인원', value: `${submitted}명` },
    { label: '미제출',   value: `${unsubmitted}명`, cls: unsubmitted > 0 ? 'text-warning' : 'text-muted-foreground' },
    { label: '평균점수', value: quiz.avgScore != null ? `${quiz.avgScore}점` : '-', cls: 'text-primary', primary: true },
  ]
}


function QuizCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="hidden sm:flex items-center gap-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </Card>
  )
}


// ─────────────────────────────── 공통: 초기화 안내 박스 ───────────────────────────────
function ResetNotice({ mode = 'import' }) {
  const items = [
    ['주차/차시', '미지정'],
    ['응시 기간', '설정 안함'],
    ['성적 공개 정책', '공개 안함'],
    ['지각 제출', '비활성화'],
    ['접근 코드·IP 제한', '제거'],
    ['추가 기간 설정', '설정 안함'],
  ]
  const action = mode === 'copy' ? '복사한' : '가져온'
  return (
    <div className="rounded-lg bg-secondary border border-border px-3.5 py-3">
      <p className="text-[11.5px] text-muted-foreground mb-3">
        퀴즈를 {action} 후 아래 항목들은 초기화되므로 다시 설정해 주세요.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-secondary-foreground">{label}</span>
            <span className="text-[11px] text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5 whitespace-nowrap">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────── 퀴즈 복사 모달 ───────────────────────────────
function QuizCopyModal({ quiz, onClose, onCopy }) {
  const [selected, setSelected] = useState(null)
  const [courseSearch, setCourseSearch] = useState('')
  const filteredCourses = MOCK_COURSES.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>퀴즈 복사</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{quiz.title}</p>
        </DialogHeader>

        <div className="space-y-2">
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="과목 검색"
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              className="w-full text-xs py-1.5 pl-8 pr-3 border border-border rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-secondary-foreground"
            />
          </div>
          {filteredCourses.length === 0 && (
            <p className="text-sm text-center py-4 text-muted-foreground">검색 결과가 없습니다</p>
          )}
          {filteredCourses.map(course => {
            const isCurrent = course.name === CURRENT_COURSE
            const isSelected = selected === course.name
            return (
              <button
                key={course.id}
                onClick={() => setSelected(course.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-[15px] text-left rounded-md border transition-colors',
                  isSelected
                    ? 'border-blue-400 bg-accent text-primary font-semibold'
                    : 'border-border bg-white text-secondary-foreground hover:bg-secondary'
                )}
              >
                <span className="flex-1">{course.name}</span>
                {isCurrent && (
                  <span className="text-xs font-normal text-muted-foreground shrink-0">현재 과목</span>
                )}
              </button>
            )
          })}
        </div>

        <ResetNotice mode="copy" />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => onCopy(quiz, selected)}
          >
            복사하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────── 퀴즈 가져오기 모달 ───────────────────────────────
function QuizImportModal({ onClose, onImport }) {
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [courseSearch, setCourseSearch] = useState('')
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [courseQuizzes, setCourseQuizzes] = useState([])
  const [quizzesLoading, setQuizzesLoading] = useState(false)

  const currentCourseCode = CURRENT_COURSE.split(' ')[0].toUpperCase()
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await listCourses()
        if (!mounted) return
        const others = all.filter(c => {
          const code = (c.code || c.name.split(' ')[0] || '').toUpperCase()
          return code !== currentCourseCode
        })
        setCourses(others)
      } catch (err) {
        console.error('[QuizImportModal] 과목 목록 로드 실패', err)
        setLoadError(err?.message || '과목 목록을 불러오지 못했습니다')
        setCourses([])
      } finally {
        if (mounted) setCoursesLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [currentCourseCode])

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course.name)
    setCheckedIds(new Set())
    setQuizzesLoading(true)
    try {
      const code = (course.code || course.name.split(' ')[0] || '').toUpperCase()
      const list = await listQuizzes({ courseCode: code })
      // 임시저장(draft) 제외 — 다른 사람이 가져와서 재사용할 수 있는 것만 노출
      setCourseQuizzes(list.filter(q => q.status !== 'draft'))
    } catch (err) {
      console.error('[QuizImportModal] listQuizzes 실패', err)
      setCourseQuizzes([])
    } finally {
      setQuizzesLoading(false)
    }
  }

  const handleImport = () => {
    const selected = courseQuizzes.filter(q => checkedIds.has(q.id))
    if (selected.length === 0) return
    onImport(selected)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl min-h-[600px] max-h-[82vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>다른 과목 퀴즈 가져오기</DialogTitle>
          <p className="text-[15px] text-muted-foreground">가져온 퀴즈는 임시저장 상태로 추가됩니다</p>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="shrink-0 flex flex-col border-r border-border w-44">
            <div className="p-3 pb-2 border-b border-border">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="과목 검색"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-full text-[11.5px] py-1.5 pl-6 pr-2 border border-border rounded outline-none focus:border-blue-400 text-secondary-foreground"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {coursesLoading ? (
                <p className="text-xs text-center py-3 text-muted-foreground">불러오는 중</p>
              ) : loadError ? (
                <p className="text-xs text-center py-3 text-destructive leading-relaxed px-2">{loadError}</p>
              ) : filteredCourses.length === 0 ? (
                <p className="text-xs text-center py-3 text-muted-foreground">
                  {courseSearch ? '검색 결과 없음' : '다른 과목이 없습니다'}
                </p>
              ) : filteredCourses.map(course => {
                const isSelected = selectedCourse === course.name
                const badge = course.code || course.name.split(' ')[0]
                const label = course.shortName || course.name.split(' ').slice(1).join(' ') || course.name
                return (
                  <button
                    key={course.id ?? course.code ?? course.name}
                    onClick={() => handleSelectCourse(course)}
                    title={course.name}
                    className={cn(
                      'w-full flex items-center gap-1.5 text-left px-3 py-2.5 rounded transition-colors',
                      isSelected
                        ? 'bg-accent text-primary font-semibold'
                        : 'text-secondary-foreground hover:bg-secondary'
                    )}
                  >
                    {badge && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                      )}>{badge}</span>
                    )}
                    <span className="text-xs truncate">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 오른쪽: 퀴즈 목록 */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedCourse ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-[15px]">좌측에서 과목을 선택하세요</p>
              </div>
            ) : quizzesLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-[15px]">불러오는 중</p>
              </div>
            ) : courseQuizzes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-[15px]">공개된 퀴즈가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {courseQuizzes.map(quiz => {
                  const checked = checkedIds.has(quiz.id)
                  return (
                    <label
                      key={quiz.id}
                      className={cn(
                        'flex items-start gap-3 p-3 cursor-pointer rounded-md border transition-colors',
                        checked ? 'border-primary/40 bg-accent' : 'border-border bg-white hover:bg-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCheck(quiz.id)}
                        className="mt-0.5 shrink-0 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <StatusBadge status={quiz.status} />
                        </div>
                        <p className="text-[15px] font-medium truncate text-foreground">{quiz.title}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {quiz.questions}문항 · {quiz.totalPoints}점
                          {quiz.dueDate ? ` · ${quiz.dueDate.split(' ')[0]}` : ''}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {checkedIds.size > 0 && (
          <div className="px-4 pt-3 border-t border-border">
            <ResetNotice mode="import" />
          </div>
        )}

        <div className={cn('flex items-center justify-between px-6 py-4', checkedIds.size === 0 && 'border-t border-border')}>
          <p className="text-[15px] text-muted-foreground">
            {checkedIds.size > 0 ? `${checkedIds.size}개 선택됨` : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button
              disabled={checkedIds.size === 0}
              onClick={handleImport}
              >
              가져오기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


// ─────────────────────────────── 학생 뷰 ───────────────────────────────
function isLockDatePassed(quiz) {
  if (!quiz.lockDate) return false
  return new Date() > new Date(quiz.lockDate)
}

const STUDENT_SORT_OPTIONS = [
  { value: 'recent', label: '최근생성순' },
  { value: 'week-asc', label: '주차 오름차순' },
  { value: 'week-desc', label: '주차 내림차순' },
  { value: 'deadline', label: '마감임박순' },
]

function StudentQuizList() {
  const { currentStudent } = useRole()
  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')
  const [sortKey, setSortKey] = useState('recent')

  // 데이터 레이어 경유 — api 모드에선 서버가 visible + 수강 과목 필터링까지 수행
  // mock 모드는 초기값을 동기로 채워 첫 렌더 깜빡임 제거
  const [allQuizzes, setAllQuizzes] = useState(() => {
    if (isApiMode()) return []
    return mockQuizzes.filter(q => q.status !== 'draft' && q.visible !== false)
  })
  const [loading, setLoading] = useState(() => isApiMode())
  // api 모드용 — 학생 본인 attempt 전체 (quiz.id 별 그룹핑용)
  // null = mock 모드 (StudentQuizCard 가 getStudentAttempts 로 직접 로드)
  const [apiAttempts, setApiAttempts] = useState(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const rows = await listQuizzes().catch(() => [])
      if (!mounted) return
      // 학생 뷰는 draft 제외 + visible !== false (api 모드는 서버에서 이미 처리되지만 mock 모드 호환)
      setAllQuizzes(rows.filter(q => q.status !== 'draft' && q.visible !== false))
      setLoading(false)
    })()
    if (isApiMode()) {
      ;(async () => {
        // 학생은 서버에서 본인 attempt 만 반환됨 — quizId 없이 호출
        const rows = await listAttempts({}).catch(() => [])
        if (!mounted) return
        setApiAttempts(rows.map(a => ({
          id: a.id,
          quizId: a.quizId,
          studentId: a.userId,
          submitted: a.submitted,
          submittedAt: a.submittedAt,
          totalScore: a.totalScore,
          autoScore: a.autoScore,
          manualScore: a.manualScore,
        })))
      })()
    }
    return () => { mounted = false }
  }, [])

  const filteredAll = useMemo(
    () => sortQuizzes(applyWeekSessionFilter(allQuizzes, filterWeek, filterSession), sortKey),
    [allQuizzes, filterWeek, filterSession, sortKey]
  )

  const hasAny = filteredAll.length > 0

  return (
    <>
      <div className="pb-6">
        <div className="flex items-center justify-between gap-4 pt-6 sm:pt-8 pb-4 sm:pb-5">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-foreground leading-tight">내 퀴즈</h1>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1 mb-3">
          <WeekSessionFilter
            quizzes={allQuizzes}
            filterWeek={filterWeek}
            filterSession={filterSession}
            onWeekChange={setFilterWeek}
            onSessionChange={setFilterSession}
          />
          <DropdownSelect
            value={sortKey}
            onChange={setSortKey}
            options={STUDENT_SORT_OPTIONS}
            size="md"
            ghost
            className="w-[120px] sm:w-[140px] shrink-0"
          />
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map(i => <QuizCardSkeleton key={i} />)}
          </div>
        ) : hasAny ? (
          <div className="grid gap-3">
            {filteredAll.map(quiz => (
              isLockDatePassed(quiz)
                ? <Card key={quiz.id} className="opacity-60">
                    <div className="flex items-start gap-4 px-6 pt-3 pb-3">
                      <Lock size={16} className="text-muted-foreground/50 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold leading-snug mb-1 truncate text-muted-foreground">{quiz.title}</h3>
                        <p className="text-xs text-muted-foreground/60">이용이 종료되어 퀴즈 정보를 확인할 수 없습니다</p>
                      </div>
                    </div>
                  </Card>
                : <StudentQuizCard
                    key={quiz.id}
                    quiz={quiz}
                    studentId={currentStudent.id}
                    scheduled={isScheduled(quiz)}
                    apiAttempts={apiAttempts ? apiAttempts.filter(a => a.quizId === quiz.id) : null}
                  />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">
              {filterWeek !== 'all' || filterSession !== 'all'
                ? '해당 조건에 맞는 퀴즈가 없습니다.'
                : '현재 응시 가능한 퀴즈가 없습니다.'
              }
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function StudentQuizCard({ quiz, studentId, scheduled = false, apiAttempts = null }) {
  const navigate = useNavigate()
  // api 모드면 부모가 내려준 실제 응시 기록, 아니면 mock localStorage 에서 조회
  // api 모드는 서버가 이미 본인 것만 반환 → studentId 추가 필터 스킵
  const attempts = apiAttempts ?? getStudentAttempts(quiz.id)
  const myAttempts = apiAttempts ? apiAttempts : attempts.filter(a => a.studentId === studentId)
  const myAttempt = myAttempts[myAttempts.length - 1] ?? null
  const [showHistory, setShowHistory] = useState(false)
  const ddayBadge = getDdayBadge(quiz)
  const pastDue = isDeadlinePassed(quiz)
  // 학생은 진행기간 내라면 grading 상태에서도 응시 가능
  const isOpen = (quiz.status === 'open' || quiz.status === 'grading') && !scheduled && !pastDue
  // 학생용 status 라벨은 진행중/마감/예정 으로만 단순화 — '채점중' 은 학생에게 노출하지 않음
  const studentDisplayStatus = scheduled ? 'scheduled' : isOpen ? 'open' : 'closed'

  // 응시완료/미응시 항상 표시 (예정 상태는 응시 전 단계라 배지 생략)
  const myBadge = scheduled
    ? null
    : myAttempt
      ? { label: '응시완료', cls: 'text-primary bg-accent' }
      : { label: '미응시', cls: 'text-muted-foreground bg-secondary' }

  const reveal = myAttempt ? computeScoreReveal(quiz, myAttempt) : null
  const showSubInfo = myAttempt && (myAttempt.manualPending > 0 || myAttempts.length > 1)

  return (
    <Card
      className="overflow-hidden transition-shadow cursor-pointer hover:shadow-md"
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={studentDisplayStatus} />
            {myBadge && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap', myBadge.cls)}>
                {myBadge.label}
              </span>
            )}
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold leading-snug mb-1 truncate text-foreground">{quiz.title}</h3>

          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground break-keep">
              {quiz.startDate || quiz.dueDate ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}` : '응시 기간 제한 없음'}
              {quiz.lockDate && (
                <>
                  <span className="text-muted-foreground">{' | '}</span>
                  <span className="text-muted-foreground">이용 종료: {quiz.lockDate}{new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}</span>
                </>
              )}
            </p>
            {ddayBadge && (
              <span className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap',
                ddayBadge.urgent ? 'text-destructive bg-destructive-soft' : 'text-warning bg-warning-bg'
              )}>
                {ddayBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          {!myAttempt ? (
            <div className="flex items-center gap-3 sm:gap-5">
              <InlineStat label="문항 수"   value={`${quiz.questions}개`} />
              <InlineStat label="총점"       value={`${quiz.totalPoints}점`} hideOnMobile />
              <InlineStat label="제한시간"   value={!quiz.timeLimit ? '없음' : `${quiz.timeLimit}분`} />
            </div>
          ) : (
            <InlineStat
              label={reveal.released ? '내 점수' : ''}
              value={reveal.released ? `${reveal.totalScore}/${reveal.totalPossible}점` : reveal.label}
              cls={reveal.released ? 'text-primary' : 'text-muted-foreground'}
            />
          )}
        </div>
      </div>

      {showSubInfo && (
        <div onClick={e => e.stopPropagation()}>
          <StudentScoreFooter
            quiz={quiz}
            myAttempt={myAttempt}
            myAttempts={myAttempts}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            reveal={reveal}
          />
        </div>
      )}
    </Card>
  )
}

function computeScoreReveal(quiz, myAttempt) {
  const now = new Date()
  const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null
  const inPeriod = (() => {
    const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
    const e = quiz.scoreRevealEnd   ? new Date(quiz.scoreRevealEnd)   : null
    return (!s || now >= s) && (!e || now <= e)
  })()
  let released
  if (quiz.scoreRevealEnabled !== undefined) {
    const timingMet = quiz.scoreRevealTiming === 'immediately' ? true
                    : quiz.scoreRevealTiming === 'after_due'   ? (dueDate && now >= dueDate)
                    : quiz.scoreRevealTiming === 'period'      ? inPeriod
                    : false
    released = quiz.scoreRevealEnabled && timingMet
  } else if (quiz.scoreReleasePolicy !== undefined) {
    const p = quiz.scoreReleasePolicy
    released = p === 'wrong_only' || p === 'with_answer' ? true
             : p === 'after_due'  ? (dueDate && now >= dueDate)
             : p === 'period'     ? inPeriod
             : false
  } else {
    released = true
  }

  const autoScore = myAttempt.totalAutoScore ?? 0
  const manualScore = myAttempt.manualPending > 0 ? 0 : (myAttempt.totalManualScore ?? 0)
  const totalScore = autoScore + manualScore
  const totalPossible = quiz.totalPoints ?? myAttempt.totalPossibleAuto
  const isHidden = quiz.scoreRevealEnabled === false || quiz.scoreReleasePolicy === null
  const label = isHidden ? '비공개' : '공개 예정'

  return { released, totalScore, totalPossible, label }
}

function StudentScoreFooter({ quiz, myAttempt, myAttempts, showHistory, setShowHistory, reveal }) {
  const { released, totalPossible } = reveal

  return (
    <div className="px-6 py-2.5 bg-secondary border-t border-border">
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {myAttempt.manualPending > 0 && released && (
          <span className="flex items-center gap-1 text-warning">
            <AlertCircle size={11} />
            수동채점 {myAttempt.manualPending}문항 대기 중 (0점 반영)
          </span>
        )}
        {myAttempts.length > 1 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn('ml-auto transition-colors', showHistory ? 'text-primary' : 'text-muted-foreground')}
          >
            응시 기록 {myAttempts.length}회 {showHistory ? '▲' : '▼'}
          </button>
        )}
      </div>

      {showHistory && myAttempts.length > 1 && (
        <div className="mt-2.5 pt-2.5 border-t border-border space-y-1">
          {myAttempts.map((att, idx) => {
            const attAuto = att.totalAutoScore ?? 0
            const attManual = att.manualPending > 0 ? 0 : (att.totalManualScore ?? 0)
            const attTotal = attAuto + attManual
            const isLast = idx === myAttempts.length - 1
            return (
              <div key={idx} className="flex items-center justify-between text-xs py-1">
                <span className={cn(isLast ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {idx + 1}회차 {isLast ? '(최근)' : ''}
                </span>
                <span className="text-muted-foreground">{att.submittedAt}</span>
                {released ? (
                  <span className={cn(isLast ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                    {attTotal}점 / {totalPossible}점
                    {att.manualPending > 0 && <span className="text-muted-foreground"> *</span>}
                  </span>
                ) : (
                  <span className="text-muted-foreground">비공개</span>
                )}
              </div>
            )
          })}
          {released && myAttempts.some(a => a.manualPending > 0) && (
            <p className="text-xs mt-1 text-muted-foreground">* 수동채점 대기 0점 반영</p>
          )}
        </div>
      )}
    </div>
  )
}
