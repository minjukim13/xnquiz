import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, AlertCircle, FolderInput, Copy, Search, Settings2, Lock, Trash2, MoreVertical, Eye, ArrowUpDown } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import Layout from '../components/Layout'
import { mockQuizzes, MOCK_COURSES, getQuizQuestions, setQuizQuestions } from '../data/mockData'
import { useRole } from '../context/RoleContext'
import { getStudentAttempts } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QuizSettingsDialog from '../components/QuizSettingsDialog'
import StatusBadge from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
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
        const aNum = Number(a.id)
        const bNum = Number(b.id)
        if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum
        return String(b.id).localeCompare(String(a.id))
      })
  }
}

// STATUS_CONFIG 제거 → StatusBadge 컴포넌트로 통합

export default function QuizList() {
  const { role } = useRole()
  return role === 'student' ? <StudentQuizList /> : <InstructorQuizList />
}

// ─────────────────────────────── 교수자 뷰 ───────────────────────────────
function InstructorQuizList() {
  const [quizzes, setQuizzes] = useState(() => mockQuizzes.filter(q => q.course === CURRENT_COURSE))
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
    if (msg) { showToast(msg); sessionStorage.removeItem('xnq_toast') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cloneQuestions = (srcId, newId) => {
    const srcQs = getQuizQuestions(srcId)
    if (srcQs.length === 0) return
    const cloned = srcQs.map((q, i) => ({
      ...q,
      id: `${newId}_q${i + 1}`,
      gradedCount: 0,
      totalCount: 0,
      avgScore: undefined,
    }))
    setQuizQuestions(newId, cloned)
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

  const handleCopyQuiz = (quiz, targetCourse) => {
    const newId = `copy_${Date.now()}`
    const copy = resetFields(quiz, { id: newId, course: targetCourse })
    mockQuizzes.push(copy)
    cloneQuestions(quiz.id, newId)
    const label = targetCourse === CURRENT_COURSE ? '현재 과목' : targetCourse
    showToast(`"${quiz.title}"을(를) ${label}으로 복사했습니다`)
    setCopySourceQuiz(null)
  }

  const handleImportQuizzes = (selectedQuizzes) => {
    const imported = selectedQuizzes.map(q => {
      const newId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
      const copy = resetFields(q, { id: newId, course: CURRENT_COURSE })
      mockQuizzes.push(copy)
      cloneQuestions(q.id, newId)
      return copy
    })
    setQuizzes(prev => [...imported, ...prev])
    setShowImportModal(false)
    const msg = imported.length === 1
      ? `"${imported[0].title}" 가져오기 완료 — 목록에서 편집하세요`
      : `퀴즈 ${imported.length}개 가져오기 완료 — 임시저장 상태로 추가되었습니다`
    showToast(msg)
  }

  const handleDeleteQuiz = (quiz) => {
    setDeleteConfirm(quiz)
  }

  const confirmDeleteQuiz = () => {
    if (!deleteConfirm) return
    const globalIdx = mockQuizzes.findIndex(q => q.id === deleteConfirm.id)
    if (globalIdx !== -1) mockQuizzes.splice(globalIdx, 1)
    setQuizzes(prev => prev.filter(q => q.id !== deleteConfirm.id))
    showToast(`"${deleteConfirm.title}" 퀴즈가 삭제되었습니다`)
    setDeleteConfirm(null)
  }

  const sortedQuizzes = useMemo(
    () => sortQuizzes(applyWeekSessionFilter(quizzes, filterWeek, filterSession), sortKey),
    [quizzes, filterWeek, filterSession, sortKey]
  )

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-6">
        <div className="flex items-end justify-between gap-4 pt-8 pb-5">
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
          message={`"${deleteConfirm.title}" 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmDanger
          onConfirm={confirmDeleteQuiz}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {toast && <Toast message={toast} />}
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
  return { label: diff === 0 ? 'D-0' : `D-${diff}`, urgent: diff === 0 }
}

function QuizCard({ quiz, onCopy, onDelete }) {
  const ddayBadge = getDdayBadge(quiz)
  const navigate = useNavigate()

  const cardTarget = (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
    ? `/quiz/${quiz.id}/grade`
    : null

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow',
        cardTarget && 'cursor-pointer hover:shadow-md',
        quiz.status === 'draft' ? 'bg-slate-50 opacity-85' : 'bg-white'
      )}
      onClick={() => cardTarget && navigate(cardTarget)}
    >
      <div className="flex items-start gap-4 px-6 pt-3 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={quiz.status} />
            {(quiz.week > 0 || quiz.session > 0) && (
              <span className="text-xs text-muted-foreground">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug mb-1 truncate text-slate-900">{quiz.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {quiz.startDate} ~ {quiz.dueDate}
              {quiz.lockDate && (
                <>
                  <span className="text-gray-400">{' | '}</span>
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
          {quiz.allowLateSubmit && !quiz.lateSubmitDeadline && (
            <p className="text-xs text-amber-600 mt-0.5">지각 제출: 무제한 허용</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-900 bg-white hover:bg-gray-50"
          >
            <Link to={`/quiz/${quiz.id}/edit`}>편집</Link>
          </Button>

          {quiz.status !== 'draft' && (
            <Button
              asChild
              size="sm"
            >
              <Link to={`/quiz/${quiz.id}/stats`}>통계</Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-gray-900">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        {quiz.status === 'draft' ? (
          <p className="text-xs text-slate-500">
            문항 {quiz.questions}개 | 총점 {quiz.totalPoints}점 | 제한시간 {quiz.timeLimit === 0 ? '없음' : `${quiz.timeLimit}분`}
          </p>
        ) : (
          <ActiveStats quiz={quiz} />
        )}
      </div>
    </Card>
  )
}


function ActiveStats({ quiz }) {
  const newAttempts = getStudentAttempts(quiz.id)
  const submitted = quiz.submitted + newAttempts.length
  const submitRate = Math.round((submitted / quiz.totalStudents) * 100)
  const unsubmitted = Math.max(0, quiz.totalStudents - submitted)
  const isClosed = quiz.status === 'closed' || quiz.status === 'grading'

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">퀴즈 복사</DialogTitle>
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
            <p className="text-xs text-center py-4 text-muted-foreground">검색 결과가 없습니다</p>
          )}
          {filteredCourses.map(course => {
            const isCurrent = course.name === CURRENT_COURSE
            const isSelected = selected === course.name
            return (
              <button
                key={course.id}
                onClick={() => setSelected(course.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm text-left rounded-md border transition-colors',
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
  const otherCourses = MOCK_COURSES.filter(c => c.name !== CURRENT_COURSE)
  const filteredCourses = otherCourses.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const courseQuizzes = useMemo(() => {
    if (!selectedCourse) return []
    return mockQuizzes.filter(q => q.course === selectedCourse && q.status !== 'draft')
  }, [selectedCourse])

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectCourse = (courseName) => {
    setSelectedCourse(courseName)
    setCheckedIds(new Set())
  }

  const handleImport = () => {
    const selected = courseQuizzes.filter(q => checkedIds.has(q.id))
    if (selected.length === 0) return
    onImport(selected)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[660px] max-h-[82vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-sm font-semibold">타 과목 퀴즈 가져오기</DialogTitle>
          <p className="text-xs text-muted-foreground">가져온 퀴즈는 임시저장 상태로 추가됩니다</p>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 왼쪽: 과목 목록 */}
          <div className="w-44 shrink-0 flex flex-col border-r border-slate-100">
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
              {filteredCourses.length === 0 ? (
                <p className="text-xs text-center py-3 text-muted-foreground">없음</p>
              ) : filteredCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course.name)}
                  className={cn(
                    'w-full text-left text-xs px-3 py-2.5 rounded transition-colors',
                    selectedCourse === course.name
                      ? 'bg-accent text-primary font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>

          {/* 오른쪽: 퀴즈 목록 */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedCourse ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">좌측에서 과목을 선택하세요</p>
              </div>
            ) : courseQuizzes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">공개된 퀴즈가 없습니다</p>
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
                        <p className="text-sm font-medium truncate text-slate-900">{quiz.title}</p>
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

        <div className={cn('flex items-center justify-between px-5 py-3', checkedIds.size === 0 && 'border-t border-slate-100')}>
          <p className="text-xs text-muted-foreground">
            {checkedIds.size > 0 ? `${checkedIds.size}개 선택됨` : '가져올 퀴즈를 선택하세요'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
            <Button
              size="sm"
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

function StudentQuizList() {
  const { currentStudent } = useRole()
  const [filterWeek, setFilterWeek] = useState('all')
  const [filterSession, setFilterSession] = useState('all')

  const allQuizzes = mockQuizzes.filter(q => q.status !== 'draft' && q.visible !== false)

  const filteredAll = useMemo(
    () => applyWeekSessionFilter(allQuizzes, filterWeek, filterSession),
    [filterWeek, filterSession]
  )

  const openQuizzes   = filteredAll.filter(q => q.status === 'open' && !isLockDatePassed(q))
  const closedQuizzes = filteredAll.filter(q => (q.status === 'closed' || q.status === 'grading') && !isLockDatePassed(q))
  const lockedQuizzes = filteredAll.filter(q => isLockDatePassed(q))
  const hasAny = filteredAll.length > 0

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10">
        <div className="flex items-end justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-900">내 퀴즈</h1>
          <WeekSessionFilter
            quizzes={allQuizzes}
            filterWeek={filterWeek}
            filterSession={filterSession}
            onWeekChange={setFilterWeek}
            onSessionChange={setFilterSession}
          />
        </div>

        {openQuizzes.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold mb-3 text-green-700">응시 가능 ({openQuizzes.length})</p>
            <div className="space-y-3">
              {openQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {closedQuizzes.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold mb-3 text-muted-foreground">종료 ({closedQuizzes.length})</p>
            <div className="space-y-3">
              {closedQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {lockedQuizzes.length > 0 && (
          <section>
            <p className="text-xs font-semibold mb-3 text-muted-foreground/60">이용 종료 ({lockedQuizzes.length})</p>
            <div className="space-y-3">
              {lockedQuizzes.map(quiz => (
                <Card key={quiz.id} className="opacity-60">
                  <div className="px-5 py-4 flex items-center gap-3">
                    <Lock size={16} className="text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-muted-foreground truncate">{quiz.title}</h3>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">이용이 종료되어 퀴즈 정보를 확인할 수 없습니다</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {!hasAny && (
          <div className="text-center py-16 text-muted-foreground">
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
  const [showHistory, setShowHistory] = useState(false)
  const maxAttempts = quiz.allowAttempts ?? 1
  const isAttemptExceeded = maxAttempts !== -1 && attemptCount >= maxAttempts
  const isOpen   = quiz.status === 'open'
  const ddayBadge = getDdayBadge(quiz)

  const statusBadge = isOpen
    ? { label: '응시중', cls: 'text-green-700 bg-green-50' }
    : { label: '종료', cls: 'text-muted-foreground bg-slate-100' }

  const myBadge = (() => {
    if (!myAttempt) {
      if (isOpen) return null
      return { label: '미제출', cls: 'text-muted-foreground bg-slate-100', icon: false }
    }
    if (myAttempt.manualPending > 0) return { label: '채점 대기', cls: 'text-amber-700 bg-amber-50', icon: false }
    return { label: '채점 완료', cls: 'text-primary bg-accent', icon: true }
  })()

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', statusBadge.cls)}>
                {statusBadge.label}
              </span>
              {myBadge && (
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1', myBadge.cls)}>
                  {myBadge.icon && <CheckCircle2 size={11} />}
                  {myBadge.label}
                </span>
              )}
              {(quiz.week > 0 || quiz.session > 0) && (
                <span className="text-xs text-muted-foreground">
                  {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold mb-1.5 truncate text-slate-900">{quiz.title}</h3>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {quiz.startDate} ~ {quiz.dueDate}
                {quiz.lockDate && <><span className="text-gray-400">{' | '}</span><span className="text-gray-500">이용 종료: {quiz.lockDate}{new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}</span></>}
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

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {quiz.questions}문항 | {quiz.totalPoints}점 | {quiz.timeLimit === 0 ? '시간 제한 없음' : `${quiz.timeLimit ?? 30}분`}
            </p>
          </div>

          <div className="shrink-0 mt-0.5">
            {isOpen && !isAttemptExceeded && (
              <Button asChild size="xs">
                <Link to={`/quiz/${quiz.id}/attempt`}>
                  {attemptCount > 0 ? '재응시' : '응시하기'}
                </Link>
              </Button>
            )}
            {isOpen && isAttemptExceeded && (
              <div className="relative group">
                <button disabled className="text-xs font-semibold px-4 py-2 rounded cursor-not-allowed bg-slate-200 text-muted-foreground">
                  응시하기
                </button>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap text-xs px-2.5 py-1.5 rounded pointer-events-none z-10 bg-slate-700 text-white">
                  응시 가능 횟수({maxAttempts}회)를 초과했습니다
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
          <div className="border-t border-blue-100">
            <div className="px-5 py-3 bg-accent/30">
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
            </div>

            {showHistory && myAttempts.length > 1 && (
              <div className="px-5 pb-3 space-y-1.5 bg-accent/30">
                <div className="border-t border-blue-200 pt-2">
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
              </div>
            )}
          </div>
        )
      })()}
    </Card>
  )
}
