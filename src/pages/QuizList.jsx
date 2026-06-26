import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, AlertCircle, FolderInput, FolderOutput, Copy, Search, Settings2, Lock, Trash2, MoreVertical, Eye, EyeOff, ArrowUpDown, Pencil, ClipboardCheck, ClipboardList, BarChart3, ChevronDown, ChevronRight, Check, Ban, Award, Clock } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { mockQuizzes, MOCK_COURSES } from '../data/mockData'
import { useRole } from '../context/role'
import { getStudentAttempts, hasAttemptSnapshot } from '../data/mockData'
import { listQuizzes, getQuizQuestions, setQuizQuestions, createQuiz, updateQuiz, deleteQuiz, listAttempts, isApiMode, listCourses } from '@/lib/data'
import { buildQti, parseQti } from '@/utils/qti'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QuizSettingsDialog from '../components/QuizSettingsDialog'
import StatusBadge from '../components/StatusBadge'
import TypeBadge from '../components/TypeBadge'
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

// ─────────────────────────────── 퀴즈 유형 그룹 (평가용/연습용) ───────────────────────────────
// 목록을 평가용/연습용 2그룹으로 묶어 그룹 헤더와 함께 표시한다 (FRD D-01 R-002).
// quizMode 가 있으면 우선 사용하고, 없으면 평가 그룹(assignmentGroupId) 유무로 추론한다.
function getQuizMode(quiz) {
  if (quiz.quizMode === 'graded' || quiz.quizMode === 'practice') return quiz.quizMode
  return quiz.assignmentGroupId ? 'graded' : 'practice'
}

const QUIZ_MODE_SECTIONS = [
  { mode: 'graded', label: '평가용' },
  { mode: 'practice', label: '연습용' },
]

function groupByQuizMode(quizzes) {
  const g = { graded: [], practice: [] }
  quizzes.forEach(q => { g[getQuizMode(q)].push(q) })
  return g
}

// 그룹 헤더 + 접기/펼치기. 비어 있어도 헤더는 유지하고 안내를 표시한다.
function QuizGroupSection({ label, count, collapsed, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex items-center gap-1.5 w-full text-left py-2 text-[13px] font-semibold text-secondary-foreground"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        <span>{label}</span>
        <span className="text-muted-foreground font-medium tabular-nums">{count}</span>
      </button>
      {!collapsed && (
        count > 0
          ? <div className="grid gap-3">{children}</div>
          : <p className="text-[13px] text-muted-foreground py-3 pl-6">해당 유형의 퀴즈 없음</p>
      )}
    </div>
  )
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

// 화면용 상태 결정 — DB status 는 유지, 표시만 전환.
// 이용 종료(lockDate 경과)는 '종료' 배지로 명시해 마감과 구분한다 (#3).
// 지각 제출 허용 시 lateSubmitDeadline 까지는 '진행중' 으로 유지됨 (deadlineUtils)
function resolveDisplayStatus(quiz) {
  return getProgressStatus(quiz)
}

// ─────────────────────────────── 진행 상태 필터 (FRD D-01 R-003) ───────────────────────────────
// 퀴즈를 진행 상태 단일 값으로 환산한다. 이용 종료(lockDate 경과)가 진행중보다 우선한다(R-006).
function getProgressStatus(quiz) {
  if (quiz.status === 'draft') return 'draft'
  if (isLockDatePassed(quiz)) return 'ended'
  if (isScheduled(quiz)) return 'scheduled'
  if (quiz.status === 'open') return isDeadlinePassed(quiz) ? 'closed' : 'open'
  if (quiz.status === 'closed' || quiz.status === 'grading') return 'closed'
  return quiz.status
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'scheduled', label: '예정' },
  { value: 'open', label: '진행중' },
  { value: 'closed', label: '마감' },
  { value: 'ended', label: '종료' },
]

function applyStatusFilter(quizzes, filterStatus) {
  if (filterStatus === 'all') return quizzes
  return quizzes.filter(q => getProgressStatus(q) === filterStatus)
}

// ─────────────────────────────── 제목 검색 (FRD D-01 R-004) ───────────────────────────────
// 제목만 대상, 대소문자 무관, 입력 토큰 전부 포함(AND 매칭).
function applyTitleSearch(quizzes, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return quizzes
  const tokens = q.split(/\s+/)
  return quizzes.filter(quiz => {
    const title = (quiz.title || '').toLowerCase()
    return tokens.every(t => title.includes(t))
  })
}

// 제목 검색 입력 — 입력 즉시 목록을 좁힌다.
function SearchInput({ value, onChange, placeholder = '퀴즈 제목 검색' }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
      />
    </div>
  )
}

// 상태 필터 — 드롭다운 대신 세그먼트 탭으로 직관성 향상 (#5)
function StatusFilterTabs({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto -mx-0.5 px-0.5 py-0.5">
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'shrink-0 h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-primary text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-border'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
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

  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState('recent')
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [copySourceQuiz, setCopySourceQuiz] = useState(null)
  const [exportSourceQuiz, setExportSourceQuiz] = useState(null)
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

  const handleExportQuiz = async (quiz, targetCourses) => {
    try {
      for (const targetCourse of targetCourses) {
        const { id: _srcId, ...rest } = quiz
        const draft = resetFields(rest, { course: targetCourse })
        const created = await createQuiz(draft)
        await cloneQuestions(quiz.id, created.id)
      }
      await reload()
      const msg = targetCourses.length === 1
        ? `'${quiz.title}'을(를) ${targetCourses[0]}으로 내보냈습니다`
        : `'${quiz.title}'을(를) ${targetCourses.length}개 과목으로 내보냈습니다`
      showToast(msg)
    } catch (err) {
      console.error('[QuizList] export 실패', err)
      showToast('내보내기 중 오류가 발생했습니다')
    }
    setExportSourceQuiz(null)
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

  // QTI 1.2 파일로 내보내기 (Canvas Classic Quizzes 호환 .zip)
  const handleExportQti = async (quiz) => {
    try {
      const questions = await getQuizQuestions(quiz.id)
      const blob = await buildQti([{ quiz, questions }], quiz.course || CURRENT_COURSE)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = (quiz.title || 'quiz').replace(/[\\/:*?"<>|]/g, '_').trim() || 'quiz'
      a.download = `${safe}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast(`'${quiz.title}' QTI 파일을 내보냈습니다`)
    } catch (err) {
      console.error('[QuizList] QTI export 실패', err)
      showToast('QTI 내보내기 중 오류가 발생했습니다')
    }
    setExportSourceQuiz(null)
  }

  // QTI 1.2 파일에서 가져오기 — 임시저장 상태로 추가
  const handleImportQti = async (bundles) => {
    try {
      const imported = []
      for (const b of bundles) {
        const draft = resetFields(b.quiz, { course: CURRENT_COURSE })
        const created = await createQuiz(draft)
        const qs = (b.questions || []).map((q, i) => ({
          ...q,
          id: `${created.id}_q${i + 1}`,
          gradedCount: 0, totalCount: 0, avgScore: undefined,
        }))
        await setQuizQuestions(created.id, qs)
        imported.push(created)
      }
      await reload()
      setShowImportModal(false)
      const msg = imported.length === 1
        ? `'${imported[0].title}' QTI 가져오기 완료. 목록에서 편집하세요`
        : `QTI 퀴즈 ${imported.length}개 가져오기 완료. 임시저장 상태로 추가되었습니다`
      showToast(msg)
    } catch (err) {
      console.error('[QuizList] QTI import 실패', err)
      showToast('QTI 가져오기 중 오류가 발생했습니다')
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
        ? `'${quiz.title}' 공개로 전환했습니다`
        : `'${quiz.title}' 비공개로 전환했습니다`)
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
    () => sortQuizzes(
      applyTitleSearch(
        applyStatusFilter(quizzes, filterStatus),
        searchQuery,
      ),
      sortKey,
    ),
    [quizzes, filterStatus, searchQuery, sortKey]
  )
  const groupedQuizzes = useMemo(() => groupByQuizMode(sortedQuizzes), [sortedQuizzes])

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

        <div className="mt-1 mb-3 space-y-2.5">
          <StatusFilterTabs
            value={filterStatus}
            onChange={setFilterStatus}
            options={STATUS_FILTER_OPTIONS}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
            </div>
            <DropdownSelect
              value={sortKey}
              onChange={setSortKey}
              options={SORT_OPTIONS}
              size="md"
              ghost
              className="w-[120px] sm:w-[140px] shrink-0"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map(i => <QuizCardSkeleton key={i} />)}
          </div>
        ) : sortedQuizzes.length > 0 ? (
          <div className="grid gap-5">
            {QUIZ_MODE_SECTIONS.map(({ mode, label }) => (
              <QuizGroupSection
                key={mode}
                label={label}
                count={groupedQuizzes[mode].length}
                collapsed={!!collapsedGroups[mode]}
                onToggle={() => setCollapsedGroups(c => ({ ...c, [mode]: !c[mode] }))}
              >
                {groupedQuizzes[mode].map(quiz => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onCopy={setCopySourceQuiz}
                    onExport={setExportSourceQuiz}
                    onDelete={handleDeleteQuiz}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </QuizGroupSection>
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

      {exportSourceQuiz && (
        <QuizExportModal
          quiz={exportSourceQuiz}
          onClose={() => setExportSourceQuiz(null)}
          onExport={handleExportQuiz}
          onExportQti={handleExportQti}
        />
      )}

      {showImportModal && (
        <QuizImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportQuizzes}
          onImportQti={handleImportQti}
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

function QuizCard({ quiz, onCopy, onExport, onDelete, onToggleVisibility }) {
  const ddayBadge = getDdayBadge(quiz)
  const navigate = useNavigate()
  const scheduled = isScheduled(quiz)
  const displayStatus = resolveDisplayStatus(quiz)
  const isDraft = quiz.status === 'draft'
  // 임시저장은 학생 화면에 노출되지 않으므로 visible 값과 무관하게 항상 비공개로 표시
  const isVisible = !isDraft && quiz.visible !== false
  // XQ-D-02 R-011: 응시본(동결 문제지) 생성 여부 기준. 시드 카운트 + 로컬 실제 응시본 존재를 함께 본다.
  const hasTakers = (quiz.submitted ?? 0) > 0 || hasAttemptSnapshot(quiz.id)
  const hideBlocked = isVisible && hasTakers // 응시본 있으면 비공개 전환 불가

  const canGrade = !scheduled && (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
  // 설정 정보 그룹 (#2)
  const hasWeekSession = quiz.week > 0 || quiz.session > 0
  // 응시 정보는 임시저장/예정에는 없음 — 그 외 상태에서만 우측에 표시 (#4·#6)
  const attempt = !isDraft && !scheduled ? getAttemptStats(quiz) : null

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow cursor-pointer hover:shadow-md',
        quiz.status === 'draft' ? 'bg-secondary opacity-85' : 'bg-white'
      )}
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
            {/* 상태 정보 그룹 (#2) */}
            {!isDraft && <VisibilityBadge isVisible={isVisible} />}
            <StatusBadge status={displayStatus} />
            <DdayBadge dday={ddayBadge} />
            {/* 설정 정보 그룹 (#2) */}
            {hasWeekSession && (
              <span className="w-px h-3 bg-border mx-0.5 hidden sm:inline-block" aria-hidden="true" />
            )}
            {hasWeekSession && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
                {quiz.week > 0 ? `${quiz.week}주차` : ''}{quiz.week > 0 && quiz.session > 0 ? ' ' : ''}{quiz.session > 0 ? `${quiz.session}차시` : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug mb-2 truncate text-foreground">{quiz.title}</h3>
          {/* 1줄: 일시(시작/마감/종료) — 텍스트 라벨 (#3) */}
          <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs">
            <QuizDateMeta quiz={quiz} />
          </div>
          {/* 2줄: 구성 정보(문항/총점/제한) — 배지로 일시와 시각 분리 (#4) */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <SpecPill icon={FileText}>{quiz.questions}문항</SpecPill>
            <SpecPill icon={Award}>{quiz.totalPoints}점</SpecPill>
            <SpecPill icon={Clock}>{quiz.timeLimit ? `${quiz.timeLimit}분` : '제한 없음'}</SpecPill>
          </div>
          {quiz.allowLateSubmit && quiz.lateSubmitDeadline && (
            <p className="text-xs text-warning mt-0.5">지각 제출: {quiz.lateSubmitDeadline.replace('T', ' ')}까지</p>
          )}
          {quiz.allowLateSubmit && !quiz.lateSubmitDeadline && quiz.dueDate && (
            <p className="text-xs text-warning mt-0.5">지각 제출: 무제한 허용</p>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0" onClick={e => e.stopPropagation()}>
          {attempt && (
            <div className="hidden sm:flex items-center gap-4 sm:gap-6">
              {/* 응시인원 / 응시율 (전체인원은 과목 내 동일하므로 생략) */}
              <InlineStat label="응시인원 / 응시율" value={`${attempt.submitted} / ${attempt.rate}%`} />
              <InlineStat
                label="미제출"
                value={`${attempt.unsubmitted}명`}
                cls={attempt.unsubmitted > 0 ? 'text-warning' : 'text-muted-foreground'}
              />
              <InlineStat
                label="평균점수"
                value={attempt.avgScore != null ? `${attempt.avgScore}점` : '-'}
                cls="text-primary"
              />
            </div>
          )}

          <button
            type="button"
            disabled={isDraft || hideBlocked}
            onClick={() => !isDraft && !hideBlocked && onToggleVisibility(quiz)}
            title={isDraft
              ? '임시저장 상태에선 자동 비공개입니다'
              : hideBlocked
                ? '응시자가 있어 비공개로 전환할 수 없습니다'
                : isVisible
                  ? '공개됨 · 클릭하면 비공개'
                  : '비공개 · 클릭하면 공개'}
            aria-label="공개 여부 전환"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDraft || hideBlocked ? 'cursor-not-allowed' : 'hover:bg-secondary'
            )}
          >
            {isVisible ? (
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-primary">
                <Check size={13} strokeWidth={3} className="text-white" />
              </span>
            ) : (
              <Ban size={20} className="text-muted-foreground/70" />
            )}
          </button>

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
              <DropdownMenuItem onClick={() => onExport(quiz)}>
                <FolderOutput size={14} />
                내보내기
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

// 응시 통계 — 응시인원(응시자/전체) + 응시율 + 미제출 + 평균 (#6)
function getAttemptStats(quiz) {
  const submitted = quiz.submitted ?? 0
  const total = quiz.totalStudents ?? 0
  const rate = total > 0 ? Math.round((submitted / total) * 100) : 0
  const unsubmitted = Math.max(0, total - submitted)
  return { submitted, total, rate, unsubmitted, avgScore: quiz.avgScore }
}

// D-day 배지 — 상단 상태 배지 줄에 표기 (마감 임박일수록 강조)
function DdayBadge({ dday }) {
  if (!dday) return null
  return (
    <span className={cn(
      'text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap',
      dday.urgent ? 'text-destructive bg-destructive-soft' : 'text-warning bg-warning-bg'
    )}>
      {dday.label}
    </span>
  )
}

// 구성 정보 배지 — 문항/총점/제한을 일시 텍스트와 시각적으로 구분 (#4).
// 흰 배경 + 테두리 칩이라 흰 카드/임시저장(회색) 카드 양쪽에서 또렷하게 보인다.
function SpecPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-xs font-medium text-secondary-foreground whitespace-nowrap tabular-nums">
      <Icon size={12} className="text-muted-foreground" />
      {children}
    </span>
  )
}

// 일시 메타 — 시작/마감을 라벨로 분리 표시 (#3).
// fragment 로 반환해 호출부의 flex 한 줄 안에서 다른 정보와 함께 흐르도록 함.
function QuizDateMeta({ quiz, divider = false }) {
  const segs = []
  if (quiz.startDate) segs.push(['시작', quiz.startDate])
  if (quiz.dueDate) segs.push(['마감', quiz.dueDate])
  if (quiz.lockDate) segs.push(['종료', quiz.lockDate])
  if (segs.length === 0) {
    return (
      <>
        {divider && <span className="text-border" aria-hidden="true">|</span>}
        <span className="text-muted-foreground">응시 기간 제한 없음</span>
      </>
    )
  }
  return (
    <>
      {segs.map(([label, val], i) => (
        <span key={label} className="inline-flex items-center gap-1 whitespace-nowrap">
          {(i > 0 || divider) && <span className="text-border mr-1" aria-hidden="true">|</span>}
          <span className="text-muted-foreground">{label}</span>
          <span className="text-secondary-foreground tabular-nums">{val}</span>
        </span>
      ))}
    </>
  )
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
    ['추가 할당', '설정 안함'],
  ]
  const action = mode === 'copy' ? '복사한' : mode === 'export' ? '내보낸' : '가져온'
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

// ─────────────────────────────── 퀴즈 내보내기 모달 ───────────────────────────────
function QuizExportModal({ quiz, onClose, onExport, onExportQti }) {
  const [tab, setTab] = useState('course')
  const [selected, setSelected] = useState(new Set())
  const [courseSearch, setCourseSearch] = useState('')
  // 현재 과목은 제외 — 다른 과목으로만 내보낼 수 있음
  const filteredCourses = MOCK_COURSES.filter(c =>
    c.name !== CURRENT_COURSE &&
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>내보내기</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{quiz.title}</p>
        </DialogHeader>

        <ExportImportTabs
          tab={tab}
          onChange={setTab}
          options={[
            { value: 'course', label: '다른 과목으로' },
            { value: 'qti', label: 'QTI 파일로' },
          ]}
        />

        {tab === 'qti' ? (
          <QtiExportPanel quiz={quiz} onClose={onClose} onExportQti={onExportQti} />
        ) : (
        <>
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
            <p className="text-sm text-center py-4 text-muted-foreground">
              {courseSearch ? '검색 결과가 없습니다' : '내보낼 다른 과목이 없습니다'}
            </p>
          )}
          {filteredCourses.map(course => {
            const isSelected = selected.has(course.name)
            return (
              <button
                key={course.id}
                onClick={() => toggle(course.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-[15px] text-left rounded-md border transition-colors',
                  isSelected
                    ? 'border-blue-400 bg-accent text-primary font-semibold'
                    : 'border-border bg-white text-secondary-foreground hover:bg-secondary'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(course.name)}
                  onClick={e => e.stopPropagation()}
                  className="shrink-0 accent-primary"
                />
                <span className="flex-1">{course.name}</span>
              </button>
            )
          })}
        </div>

        <ResetNotice mode="export" />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={selected.size === 0}
            onClick={() => onExport(quiz, Array.from(selected))}
          >
            내보내기
          </Button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 내보내기/가져오기 공통 탭 헤더
function ExportImportTabs({ tab, onChange, options }) {
  return (
    <div className="flex gap-1 p-1 bg-secondary rounded-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 text-[13px] font-semibold py-1.5 rounded-md transition-colors',
            tab === opt.value
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-secondary-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// QTI 파일 내보내기 패널 (Canvas Classic Quizzes 호환 .zip)
function QtiExportPanel({ quiz, onClose, onExportQti }) {
  return (
    <div className="space-y-4 pt-1">
      <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
        <p className="text-[15px] font-semibold text-foreground truncate">{quiz.title}</p>
        <p className="text-xs text-muted-foreground">
          {quiz.questions ?? 0}문항 · {quiz.totalPoints ?? 0}점
        </p>
      </div>
      <div className="rounded-lg bg-accent/60 px-4 py-3 text-xs leading-relaxed text-secondary-foreground">
        <p className="font-semibold text-primary mb-1">QTI 1.2</p>
        <p>객관식·OX·복수정답·단답·수치형은 정답까지 함께 내보냅니다. 연결형·빈칸·드롭다운·수식형은 문항 본문과 유형만 포함됩니다(정답 제외). 미디어 첨부는 포함되지 않습니다.</p>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
        <Button size="sm" onClick={() => onExportQti(quiz)}>
          QTI 파일 다운로드
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────── 퀴즈 가져오기 모달 ───────────────────────────────
function QuizImportModal({ onClose, onImport, onImportQti }) {
  const [tab, setTab] = useState('course')
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
          <DialogTitle>가져오기</DialogTitle>
          <p className="text-[15px] text-muted-foreground">가져온 퀴즈는 임시저장 상태로 추가됩니다</p>
          <div className="pt-3">
            <ExportImportTabs
              tab={tab}
              onChange={setTab}
              options={[
                { value: 'course', label: '다른 과목' },
                { value: 'qti', label: 'QTI 파일' },
              ]}
            />
          </div>
        </DialogHeader>

        {tab === 'qti' ? (
          <QtiImportPanel onClose={onClose} onImportQti={onImportQti} />
        ) : (
        <>
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

        <div className={cn('flex items-center justify-end px-6 py-4', checkedIds.size === 0 && 'border-t border-border')}>
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
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// QTI 파일 가져오기 패널 — .zip 업로드 → 파싱 → 미리보기 → 가져오기
function QtiImportPanel({ onClose, onImportQti }) {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)   // { bundles, totalWarnings }
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setParsing(true)
    setError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const parsed = await parseQti(file)
      setResult(parsed)
    } catch (err) {
      console.error('[QtiImportPanel] 파싱 실패', err)
      setError(err?.message || 'QTI 파일을 읽지 못했습니다')
    } finally {
      setParsing(false)
    }
  }

  const totalQuestions = result
    ? result.bundles.reduce((s, b) => s + (b.questions?.length || 0), 0)
    : 0
  const allWarnings = result
    ? result.bundles.flatMap(b => b.warnings || [])
    : []

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        {!result ? (
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 h-full min-h-[320px] rounded-xl border-2 border-dashed cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-accent' : 'border-border bg-background hover:bg-secondary'
            )}
          >
            <FolderInput size={32} className="text-muted-foreground" />
            {parsing ? (
              <p className="text-[15px] text-secondary-foreground">파일을 읽는 중</p>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-foreground">QTI .zip 파일을 끌어다 놓거나 클릭해서 선택</p>
                  <p className="text-xs text-muted-foreground mt-1">QTI 1.2 형식 내보내기 파일을 지원합니다</p>
                </div>
                {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                {error && <p className="text-xs text-destructive">{error}</p>}
              </>
            )}
            <input
              type="file"
              accept=".zip,.imscc,.xml"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-foreground">
                퀴즈 {result.bundles.length}개 · 문항 {totalQuestions}개
              </p>
              <button
                type="button"
                onClick={() => { setResult(null); setFileName(''); setError(null) }}
                className="text-xs text-primary font-medium hover:underline"
              >
                다른 파일 선택
              </button>
            </div>

            <div className="space-y-2">
              {result.bundles.map((b, i) => (
                <div key={i} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-[15px] font-medium text-foreground truncate">{b.quiz.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.questions.length}문항 · {b.quiz.totalPoints}점
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.questions.slice(0, 12).map((q, qi) => (
                      <TypeBadge key={qi} type={q.type} small />
                    ))}
                    {b.questions.length > 12 && (
                      <span className="text-[11px] text-muted-foreground self-center">+{b.questions.length - 12}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {allWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <AlertCircle size={13} /> 일부 문항은 본문/유형만 가져옵니다
                </p>
                <ul className="text-[11.5px] text-amber-700/90 leading-relaxed list-disc pl-4">
                  {allWarnings.slice(0, 6).map((w, wi) => <li key={wi}>{w}</li>)}
                  {allWarnings.length > 6 && <li>외 {allWarnings.length - 6}건</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          disabled={!result || totalQuestions === 0}
          onClick={() => onImportQti(result.bundles)}
        >
          가져오기
        </Button>
      </div>
    </>
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

// ─────────────────────────────── 학생용 필터 ───────────────────────────────
const STUDENT_ATTEMPT_FILTER_OPTIONS = [
  { value: 'all', label: '응시 전체' },
  { value: 'todo', label: '미응시' },
  { value: 'done', label: '응시완료' },
]

// 학생용 진행 상태 — 마감/종료/채점중을 '마감' 하나로 통합
function studentStatusKey(quiz) {
  const s = getProgressStatus(quiz)
  if (s === 'scheduled') return 'scheduled'
  if (s === 'open') return 'open'
  return 'closed'
}

// 학생 본인 응시 여부 (api: 부모가 내려준 attempts, mock: localStorage)
function studentHasAttempted(quizId, studentId, apiAttempts) {
  if (apiAttempts) return apiAttempts.some(a => a.quizId === quizId)
  return getStudentAttempts(quizId).some(a => a.studentId === studentId)
}

function StudentQuizList() {
  const { currentStudent } = useRole()
  const [searchQuery, setSearchQuery] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  const [attemptFilter, setAttemptFilter] = useState('all')
  const [sortKey, setSortKey] = useState('recent')
  const [collapsedGroups, setCollapsedGroups] = useState({})

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

  const filteredAll = useMemo(() => {
    let list = applyTitleSearch(allQuizzes, searchQuery)
    if (hideClosed) {
      list = list.filter(q => studentStatusKey(q) !== 'closed')
    }
    if (attemptFilter !== 'all') {
      list = list.filter(q => {
        const done = studentHasAttempted(q.id, currentStudent.id, apiAttempts)
        return attemptFilter === 'done' ? done : !done
      })
    }
    return sortQuizzes(list, sortKey)
  }, [allQuizzes, searchQuery, hideClosed, attemptFilter, sortKey, apiAttempts, currentStudent.id])
  const groupedAll = useMemo(() => groupByQuizMode(filteredAll), [filteredAll])

  const hasAny = filteredAll.length > 0

  return (
    <>
      <div className="pb-6">
        <div className="flex items-center justify-between gap-4 pt-6 sm:pt-8 pb-4 sm:pb-5">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-foreground leading-tight">내 퀴즈</h1>
        </div>

        <div className="mt-1 mb-3 space-y-2.5">
          <StatusFilterTabs
            value={attemptFilter}
            onChange={setAttemptFilter}
            options={STUDENT_ATTEMPT_FILTER_OPTIONS}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
              <label className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-secondary-foreground cursor-pointer select-none whitespace-nowrap shrink-0">
                <input
                  type="checkbox"
                  checked={hideClosed}
                  onChange={e => setHideClosed(e.target.checked)}
                  className="shrink-0 accent-primary"
                />
                마감된 퀴즈 제외
              </label>
            </div>
            <DropdownSelect
              value={sortKey}
              onChange={setSortKey}
              options={STUDENT_SORT_OPTIONS}
              size="md"
              ghost
              className="w-[120px] sm:w-[140px] shrink-0"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map(i => <QuizCardSkeleton key={i} />)}
          </div>
        ) : hasAny ? (
          <div className="grid gap-5">
            {QUIZ_MODE_SECTIONS.map(({ mode, label }) => (
              <QuizGroupSection
                key={mode}
                label={label}
                count={groupedAll[mode].length}
                collapsed={!!collapsedGroups[mode]}
                onToggle={() => setCollapsedGroups(c => ({ ...c, [mode]: !c[mode] }))}
              >
                {groupedAll[mode].map(quiz => (
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
              </QuizGroupSection>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">
              {searchQuery.trim() || hideClosed || attemptFilter !== 'all'
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
  // 실제로 보여줄 내용이 있을 때만 하단 띠 노출 (수동채점 안내는 성적 공개 시에만, 응시 기록은 2회 이상일 때만)
  const showSubInfo = !!myAttempt && (((myAttempt.manualPending > 0) && !!reveal?.released) || myAttempts.length > 1)

  return (
    <Card
      className="overflow-hidden transition-shadow cursor-pointer hover:shadow-md"
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={studentDisplayStatus} />
            <DdayBadge dday={ddayBadge} />
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

          <h3 className="text-base font-semibold leading-snug mb-2 truncate text-foreground">{quiz.title}</h3>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <QuizDateMeta quiz={quiz} />
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
  const label = isHidden ? '성적 비공개' : '성적 공개 예정'

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
