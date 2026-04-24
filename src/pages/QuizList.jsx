import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, AlertCircle, FolderInput, Copy, Search, Settings2, Lock, Trash2, MoreVertical, Eye, ArrowUpDown, Pencil, ClipboardCheck } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { mockQuizzes, MOCK_COURSES } from '../data/mockData'
import { useRole } from '../context/role'
import { getStudentAttempts } from '../data/mockData'
import { listQuizzes, getQuizQuestions, setQuizQuestions, createQuiz, deleteQuiz, listAttempts, isApiMode, listCourses, listTeacherCourses } from '@/lib/data'
import { currentLtiCourseCode } from '@/lib/data/_common'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
    <div className="flex gap-2">
      <DropdownSelect
        value={filterWeek}
        onChange={v => { onWeekChange(v); onSessionChange('all') }}
        options={weekOptions}
        size="md"
        filterMode
        ghost
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
        ghost
        style={{ width: 108 }}
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

// startDate 기반 예약 발행 판별 — status를 바꾸지 않고 조건 분기로 처리
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
    const ltiCode = currentLtiCourseCode()
    return ltiCode ? [...mockQuizzes] : mockQuizzes.filter(q => q.course === CURRENT_COURSE)
  })

  // 데이터 레이어 경유 — mock/api 모드 자동 분기
  // LTI 모드: 서버가 이미 Canvas courseCode 로 필터링하므로 클라이언트 필터 skip
  const reload = async () => {
    try {
      const all = await listQuizzes()
      const ltiCode = currentLtiCourseCode()
      setQuizzes(ltiCode ? all : all.filter(q => q.course === CURRENT_COURSE))
    } catch (err) {
      console.error('[QuizList] listQuizzes 실패', err)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const all = await listQuizzes().catch(() => [])
      if (!mounted) return
      const ltiCode = currentLtiCourseCode()
      setQuizzes(ltiCode ? all : all.filter(q => q.course === CURRENT_COURSE))
    })()
    return () => { mounted = false }
  }, [])

  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')
  const [sortKey, setSortKey] = useState('recent')
  const [copySourceQuiz, setCopySourceQuiz] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
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
        ? `'${imported[0].title}' 가져오기 완료 — 목록에서 편집하세요`
        : `퀴즈 ${imported.length}개 가져오기 완료 — 임시저장 상태로 추가되었습니다`
      showToast(msg)
    } catch (err) {
      console.error('[QuizList] import 실패', err)
      showToast('가져오기 중 오류가 발생했습니다')
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
      <div className="max-w-5xl mx-auto pb-6">
        <div className="flex items-center justify-between gap-4 pt-8 pb-5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-bold text-foreground leading-tight">퀴즈 관리</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowGlobalSettings(true)}
              title="퀴즈 전역 설정"
            >
              <Settings2 size={18} />
            </Button>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
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

        <div className="flex items-center justify-between mt-1 mb-3">
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
            style={{ width: 140 }}
          />
        </div>

        {sortedQuizzes.length > 0 ? (
          <div className="grid gap-3">
            {sortedQuizzes.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} onCopy={setCopySourceQuiz} onDelete={handleDeleteQuiz} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">해당 조건에 맞는 퀴즈가 없습니다.</p>
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

// 응시중일 때만 D-day 배지 반환 (예약 발행 퀴즈는 제외)
function getDdayBadge(quiz) {
  if (quiz.status !== 'open' || isScheduled(quiz)) return null
  const now = new Date()
  const due = quiz.dueDate ? new Date(quiz.dueDate) : null
  if (!due) return null
  const diff = Math.ceil((due - now) / 86400000)
  if (diff < 0) return null
  return { label: diff === 0 ? 'D-0' : `D-${diff}`, urgent: diff === 0 }
}

function QuizCard({ quiz, onCopy, onDelete }) {
  const ddayBadge = getDdayBadge(quiz)
  const navigate = useNavigate()
  const scheduled = isScheduled(quiz)
  const displayStatus = resolveDisplayStatus(quiz)

  const canGrade = !scheduled && (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow cursor-pointer hover:shadow-md',
        quiz.status === 'draft' ? 'bg-slate-50 opacity-85' : 'bg-white'
      )}
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <div className="flex items-start gap-4 px-6 pt-3 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={displayStatus} />
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs text-muted-foreground">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug mb-1 truncate text-slate-900">{quiz.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {quiz.startDate || quiz.dueDate ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}` : '응시 기간 제한 없음'}
              {quiz.lockDate && (
                <>
                  <span className="text-muted-foreground">{' | '}</span>
                  <span className="text-gray-500">이용 종료: {quiz.lockDate}{new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}</span>
                </>
              )}
            </p>
            {ddayBadge && (
              <span className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                ddayBadge.urgent ? 'text-red-700 bg-red-50' : 'text-amber-600 bg-amber-50'
              )}>
                {ddayBadge.label}
              </span>
            )}
          </div>
          {quiz.allowLateSubmit && quiz.lateSubmitDeadline && (
            <p className="text-xs text-amber-600 mt-0.5">지각 제출: {quiz.lateSubmitDeadline.replace('T', ' ')}까지</p>
          )}
          {quiz.allowLateSubmit && !quiz.lateSubmitDeadline && quiz.dueDate && (
            <p className="text-xs text-amber-600 mt-0.5">지각 제출: 무제한 허용</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
          {canGrade && (
            <>
              <Button asChild variant="outline" className="border-gray-200 text-gray-900 bg-white hover:bg-gray-50">
                <Link to={`/quiz/${quiz.id}/grade`}>채점</Link>
              </Button>
              <Button asChild>
                <Link to={`/quiz/${quiz.id}/stats`}>통계</Link>
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-gray-900">
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
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(quiz)}>
                <Trash2 size={14} />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        {quiz.status === 'draft' || scheduled ? (
          <DraftSpecs quiz={quiz} />
        ) : (
          <ActiveStats quiz={quiz} />
        )}
      </div>
    </Card>
  )
}


function DraftSpecs({ quiz }) {
  // quiz.questions / quiz.totalPoints 는 API 응답에서 서버가 실시간 집계해 내려주는 요약 필드(스탬프가 아님).
  // 목록 화면에서는 개별 문항 배열을 로드하지 않으므로 이 집계값을 사용한다.
  const cols = [
    { label: '문항 수',   value: `${quiz.questions}개` },
    { label: '총점',       value: `${quiz.totalPoints}점` },
    { label: '제한시간',   value: !quiz.timeLimit ? '없음' : `${quiz.timeLimit}분` },
  ]

  return (
    <div className="grid grid-cols-3">
      {cols.map((item, idx) => (
        <div key={item.label} className={cn('text-center px-4 first:pl-0 last:pr-0', idx < cols.length - 1 && 'border-r border-slate-100')}>
          <p className="text-base font-semibold leading-none text-slate-700">{item.value}</p>
          <p className="text-xs mt-1 text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}


function ActiveStats({ quiz }) {
  // 집계값(submitted · totalStudents · avgScore) 은 listQuizzes 응답에서 서버/mock 이 제공
  // — 프론트에서 재계산하면 mock 학생 배열(120명 등) 과 api totalStudents(45) 가 섞여 왜곡됨
  const submitted = quiz.submitted ?? 0
  const totalStudents = quiz.totalStudents ?? 0
  const submitRate = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0
  const unsubmitted = Math.max(0, totalStudents - submitted)
  const isClosed = quiz.status === 'closed' || quiz.status === 'grading' || isDeadlinePassed(quiz)

  const cols = [
    { label: '응시율',   value: `${submitRate}%`,   cls: 'text-slate-900' },
    { label: '응시인원', value: `${submitted}명`,   cls: 'text-slate-900' },
    { label: '미제출',   value: `${unsubmitted}명`, cls: unsubmitted > 0 ? 'text-red-500' : 'text-muted-foreground' },
    ...(isClosed ? [{ label: '평균점수', value: quiz.avgScore != null ? `${quiz.avgScore}점` : '-', cls: 'text-primary' }] : []),
  ]

  return (
    <div className={cn('grid', cols.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {cols.map((item, idx) => (
        <div key={item.label} className={cn('text-center px-4 first:pl-0 last:pr-0', idx < cols.length - 1 && 'border-r border-slate-100')}>
          <p className={cn('text-lg font-bold leading-none', item.cls)}>{item.value}</p>
          <p className="text-xs mt-1 text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
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
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3">
      <p className="text-[11.5px] text-slate-500 mb-3">
        퀴즈를 {action} 후 아래 항목들은 초기화되므로 다시 설정해 주세요.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-700">{label}</span>
            <span className="text-[11px] text-muted-foreground bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">{value}</span>
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
      <DialogContent className="max-w-md">
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
              className="w-full text-xs py-1.5 pl-8 pr-3 border border-slate-200 rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-slate-700"
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
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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

  // 현재 과목 식별: LTI 모드면 Canvas courseCode, 아니면 CURRENT_COURSE 라벨
  const ltiCourseCode = currentLtiCourseCode()
  const isLti = !!ltiCourseCode
  const currentCourseCode = (ltiCourseCode || CURRENT_COURSE.split(' ')[0]).toUpperCase()
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // LTI 모드: Canvas REST 경유로 교수자가 가르치는 실제 과목 전체 조회.
        // 비 LTI 모드: xnquiz DB 의 과목 목록.
        const all = isLti
          ? await listTeacherCourses({ excludeCourseCode: currentCourseCode })
          : await listCourses()
        if (!mounted) return
        // LTI 모드는 서버에서 이미 현재 과목 제외. 비 LTI 모드는 클라에서 제외.
        const others = isLti ? all : all.filter(c => {
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
  }, [isLti, currentCourseCode])

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
      // LTI 과목은 courseCode(예: "CANVAS_173"), 비 LTI 는 code(예: "CS301") 사용.
      // xnquiz 에 한 번도 런치된 적 없는 Canvas 과목은 Course 레코드가 없어 빈 배열이 반환됨.
      const code = (course.courseCode || course.code || course.name.split(' ')[0] || '').toUpperCase()
      const list = await listQuizzes({ courseCode: code, bypassLtiCourseFilter: true })
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
        <DialogHeader className="px-6 py-5 border-b border-slate-100 shrink-0">
          <DialogTitle>다른 과목 퀴즈 가져오기</DialogTitle>
          <p className="text-[15px] text-muted-foreground">가져온 퀴즈는 임시저장 상태로 추가됩니다</p>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 왼쪽: 과목 목록 — LTI 과목명이 길어서 폭 여유 확보 */}
          <div className={cn('shrink-0 flex flex-col border-r border-slate-100', isLti ? 'w-64' : 'w-44')}>
            <div className="p-3 pb-2 border-b border-slate-50">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="과목 검색"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-full text-[11.5px] py-1.5 pl-6 pr-2 border border-slate-200 rounded outline-none focus:border-blue-400 text-slate-700"
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
                // LTI(Canvas) 과목은 courseCode 가 "CANVAS_173" 형태라 배지로 노출할 가치가 없음.
                // 비 LTI 과목만 "CS301" 같은 코드 배지 표시.
                const ltiCourse = !!course.canvasId
                const badge = ltiCourse ? null : (course.code || course.name.split(' ')[0])
                const label = ltiCourse
                  ? course.name
                  : (course.shortName || course.name.split(' ').slice(1).join(' ') || course.name)
                return (
                  <button
                    key={course.id ?? course.canvasId ?? course.code ?? course.name}
                    onClick={() => handleSelectCourse(course)}
                    title={course.name}
                    className={cn(
                      'w-full flex items-center gap-1.5 text-left px-3 py-2.5 rounded transition-colors',
                      isSelected
                        ? 'bg-accent text-primary font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
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
                        <p className="text-[15px] font-medium truncate text-slate-900">{quiz.title}</p>
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
          <div className="px-4 pt-3 border-t border-slate-100">
            <ResetNotice mode="import" />
          </div>
        )}

        <div className={cn('flex items-center justify-between px-6 py-4', checkedIds.size === 0 && 'border-t border-slate-100')}>
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
      <div className="max-w-5xl mx-auto pb-6">
        <div className="flex items-center justify-between gap-4 pt-8 pb-5">
          <h1 className="text-[24px] font-bold text-foreground leading-tight">내 퀴즈</h1>
        </div>

        <div className="flex items-center justify-between mt-1 mb-3">
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
            style={{ width: 140 }}
          />
        </div>

        {hasAny ? (
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
  // api 모드면 부모가 내려준 실제 응시 기록, 아니면 mock localStorage 에서 조회
  // api 모드는 서버가 이미 본인 것만 반환 → studentId 추가 필터 스킵 (LTI 유저 ID 매칭 오류 방지)
  const attempts = apiAttempts ?? getStudentAttempts(quiz.id)
  const myAttempts = apiAttempts ? apiAttempts : attempts.filter(a => a.studentId === studentId)
  const myAttempt = myAttempts[myAttempts.length - 1] ?? null
  const attemptCount = myAttempts.length
  const [showHistory, setShowHistory] = useState(false)
  const maxAttempts = quiz.allowAttempts ?? 1
  const isAttemptExceeded = maxAttempts !== -1 && attemptCount >= maxAttempts
  const pastDue = isDeadlinePassed(quiz)
  const isOpen = quiz.status === 'open' && !scheduled && !pastDue
  const displayStatus = resolveDisplayStatus(quiz)
  const ddayBadge = getDdayBadge(quiz)

  // 학생 혼란 방지 — 채점 상태(대기/완료)는 학생 목록 배지에 표시하지 않음.
  // 응시 여부만 표시: 미응시(마감) = 미제출, 그 외(응시중 / 응시 완료)는 배지 없음.
  const myBadge = (!myAttempt && !isOpen)
    ? { label: '미제출', cls: 'text-muted-foreground bg-slate-100' }
    : null

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 px-6 pt-3 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={displayStatus} />
            {myBadge && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md', myBadge.cls)}>
                {myBadge.label}
              </span>
            )}
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs text-muted-foreground">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold leading-snug mb-1 truncate text-slate-900">{quiz.title}</h3>

          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {quiz.startDate || quiz.dueDate ? `${quiz.startDate || '제한 없음'} ~ ${quiz.dueDate || '제한 없음'}` : '응시 기간 제한 없음'}
              {quiz.lockDate && (
                <>
                  <span className="text-muted-foreground">{' | '}</span>
                  <span className="text-gray-500">이용 종료: {quiz.lockDate}{new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}</span>
                </>
              )}
            </p>
            {ddayBadge && (
              <span className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                ddayBadge.urgent ? 'text-red-700 bg-red-50' : 'text-amber-600 bg-amber-50'
              )}>
                {ddayBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {scheduled && (
            <span className="text-xs text-amber-600 font-medium">
              {quiz.startDate} 시작
            </span>
          )}
          {!scheduled && isOpen && !isAttemptExceeded && (
            <Button asChild>
              <Link to={`/quiz/${quiz.id}/attempt`}>
                {attemptCount > 0 ? '재응시' : '응시하기'}
              </Link>
            </Button>
          )}
          {!scheduled && isOpen && isAttemptExceeded && (
            <div className="relative group">
              <Button disabled>응시하기</Button>
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap text-xs px-2.5 py-1.5 rounded pointer-events-none z-10 bg-slate-700 text-white">
                응시 가능 횟수({maxAttempts}회)를 초과했습니다
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 카드 하단: 퀴즈 메타 정보 or 성적 */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        {!myAttempt ? (
          <div className="grid grid-cols-3">
            {[
              { label: '문항 수', value: `${quiz.questions}개` },
              { label: '총점', value: `${quiz.totalPoints}점` },
              { label: '제한시간', value: !quiz.timeLimit ? '없음' : `${quiz.timeLimit}분` },
            ].map((item, idx) => (
              <div key={item.label} className={cn('text-center px-4 first:pl-0 last:pr-0', idx < 2 && 'border-r border-slate-100')}>
                <p className="text-lg font-bold leading-none text-slate-900">{item.value}</p>
                <p className="text-xs mt-1 text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <StudentScoreFooter quiz={quiz} myAttempt={myAttempt} myAttempts={myAttempts} showHistory={showHistory} setShowHistory={setShowHistory} />
        )}
      </div>
    </Card>
  )
}

function StudentScoreFooter({ quiz, myAttempt, myAttempts, showHistory, setShowHistory }) {
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

  return (
    <div>
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {released ? (
          <span className="text-primary font-semibold">
            {totalScore}점 / {totalPossible}점
            {myAttempt.manualPending > 0 && <span className="text-muted-foreground font-normal"> (수동채점 대기 0점 반영)</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {quiz.scoreRevealEnabled === false || quiz.scoreReleasePolicy === null ? '성적 비공개' : '공개 예정'}
          </span>
        )}
        {myAttempt.manualPending > 0 && released && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle size={11} />
            수동채점 {myAttempt.manualPending}문항 대기 중
          </span>
        )}
        <span className="text-muted-foreground">제출 {myAttempt.submittedAt}</span>

        {myAttempts.length > 1 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn('text-xs ml-auto transition-colors', showHistory ? 'text-primary' : 'text-muted-foreground')}
          >
            응시 기록 {myAttempts.length}회 {showHistory ? '▲' : '▼'}
          </button>
        )}
      </div>

      {showHistory && myAttempts.length > 1 && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1">
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
                  <span className={cn(isLast ? 'text-primary font-semibold' : 'text-slate-500')}>
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
