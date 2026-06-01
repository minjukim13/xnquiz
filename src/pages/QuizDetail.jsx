import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, BarChart3, ClipboardCheck, Eye, Trash2, MoreVertical, CalendarRange, AlertCircle, EyeOff, Activity } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import { mockQuizzes, getStudentAttempts, getQuizQuestions as mockGetQuestions } from '../data/mockData'
import { getQuiz, getQuizQuestions, deleteQuiz, isApiMode, listAttempts } from '@/lib/data'
import { useRole } from '../context/role'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { isDeadlinePassed } from '@/utils/deadlineUtils'
import { computeRevealStatus } from '@/utils/scoreReveal'
import { htmlToPlainText } from '../components/RichText'
import QuestionAnswer from '../components/QuestionAnswer'
import CommentThread from './GradingDashboard/CommentThread'
import { isResultViewed, markResultViewed } from '@/utils/resultsViewedStorage'

function isScheduled(quiz) {
  if (!quiz || quiz.status !== 'open' || !quiz.startDate) return false
  return new Date() < new Date(quiz.startDate)
}

function resolveDisplayStatus(quiz) {
  if (!quiz) return null
  if (isScheduled(quiz)) return 'scheduled'
  if (quiz.status === 'open' && isDeadlinePassed(quiz)) return 'closed'
  return quiz.status
}

const DEFAULT_VALUE_TOKENS = new Set([
  '사용 안함',
  '설정 안함',
  '비허용',
  '비공개',
  '제한 없음',
  '응시 기간 제한 없음',
])

function isDefaultValue(value) {
  if (typeof value !== 'string') return false
  return DEFAULT_VALUE_TOKENS.has(value.trim())
}

const BADGE_VARIANT_CLASS = {
  default: 'bg-secondary text-muted-foreground',
  accent: 'bg-accent text-primary',
  amber: 'bg-warning-bg text-warning-foreground',
}

function InfoRow({ label, value, muted = false, badgeVariant }) {
  const showBadge = !!badgeVariant || muted || isDefaultValue(value)
  const variantKey = badgeVariant ?? 'default'
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {showBadge ? (
        <span className={cn(
          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium shrink-0',
          BADGE_VARIANT_CLASS[variantKey] ?? BADGE_VARIANT_CLASS.default
        )}>
          {value}
        </span>
      ) : (
        <span className="text-sm text-right break-words text-foreground font-medium">
          {value}
        </span>
      )}
    </div>
  )
}

function Section({ title, summary, children }) {
  return (
    <Card className="overflow-hidden py-0 gap-0">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <h3 className="text-[15px] font-semibold text-foreground shrink-0">{title}</h3>
        {summary && (
          <span className="text-xs text-muted-foreground truncate">{summary}</span>
        )}
      </div>
      <div className="px-5 py-2 border-t border-border/60 divide-y divide-border/50">
        {children}
      </div>
    </Card>
  )
}

function formatDateRange(start, end) {
  if (!start && !end) return '응시 기간 제한 없음'
  return `${start || '제한 없음'} ~ ${end || '제한 없음'}`
}

// 'YYYY-MM-DD HH:mm' 형태로 반환 (시간 포함). 시간 정보 없으면 날짜만.
function formatDateTimeFull(dt) {
  if (!dt) return null
  const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return String(dt)
  const [, y, mo, d, hh, mm] = m
  if (hh && mm) return `${y}-${mo}-${d} ${hh}:${mm}`
  return `${y}-${mo}-${d}`
}

function formatPeriodFull(start, end) {
  const s = formatDateTimeFull(start)
  const e = formatDateTimeFull(end)
  if (!s && !e) return '제한 없음'
  return `${s ?? '시작일 없음'} ~ ${e ?? '마감 없음'}`
}

function scoreRevealCardLabel(quiz) {
  if (!quiz) return '비공개'
  const isUndefined = quiz.scoreRevealEnabled === undefined && quiz.scoreReleasePolicy === undefined
  if (isUndefined) return '즉시 공개'
  const enabled = quiz.scoreRevealEnabled ?? (quiz.scoreReleasePolicy !== null)
  if (!enabled) return '비공개'
  const timing = quiz.scoreRevealTiming ?? quiz.scoreReleasePolicy
  if (timing === 'after_due') return '마감 후 공개'
  if (timing === 'period') {
    if (quiz.scoreRevealStart) {
      const m = String(quiz.scoreRevealStart).match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)} 공개`
    }
    return '기간 내 공개'
  }
  return '즉시 공개'
}

function scoreRevealBadge(quiz) {
  if (quiz.scoreRevealEnabled === undefined && quiz.scoreReleasePolicy === undefined) {
    return { label: '설정 없음', variant: 'default' }
  }
  const enabled = quiz.scoreRevealEnabled ?? (quiz.scoreReleasePolicy !== null)
  if (!enabled) return { label: '비공개', variant: 'default' }

  const isWithAnswer = quiz.scoreRevealScope === 'with_answer'
  const timing = quiz.scoreRevealTiming ?? quiz.scoreReleasePolicy
  const scopeLabel = isWithAnswer ? '정답 포함' : '점수만'

  if (timing === 'after_due') {
    return { label: `${scopeLabel} · 마감 후 공개`, variant: 'amber' }
  }
  if (timing === 'period') {
    if (quiz.scoreRevealStart || quiz.scoreRevealEnd) {
      const start = quiz.scoreRevealStart?.split(' ')[0] || ''
      const end = quiz.scoreRevealEnd?.split(' ')[0] || ''
      return { label: `${scopeLabel} · ${start} ~ ${end}`, variant: 'accent' }
    }
    return { label: `${scopeLabel} · 공개 기간 지정`, variant: 'accent' }
  }
  return { label: `${scopeLabel} · 즉시 공개`, variant: 'accent' }
}

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role, currentStudent } = useRole()
  const isStudent = role === 'student'

  const [quiz, setQuiz] = useState(() => {
    if (isApiMode()) return null
    return mockQuizzes.find(q => q.id === id) ?? null
  })
  const [loaded, setLoaded] = useState(!isApiMode() && !!quiz)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [toast, setToast] = useState(null)
  const [myAttempts, setMyAttempts] = useState([])
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const q = await getQuiz(id)
        if (!mounted) return
        if (q) setQuiz(q)
      } catch (err) {
        console.error('[QuizDetail] load 실패', err)
      } finally {
        if (mounted) setLoaded(true)
      }
    })()
    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    if (!isStudent) return
    let mounted = true
    ;(async () => {
      try {
        if (isApiMode()) {
          const [rows, qs] = await Promise.all([
            listAttempts({ quizId: id }),
            getQuizQuestions(id),
          ])
          if (!mounted) return
          setMyAttempts(rows)
          setQuestions(qs ?? [])
        } else {
          const all = getStudentAttempts(id)
          const mine = all.filter(a => a.studentId === currentStudent?.id)
          if (!mounted) return
          setMyAttempts(mine)
          setQuestions(mockGetQuestions(id) ?? [])
        }
      } catch (err) {
        console.error('[QuizDetail] listAttempts 실패', err)
      }
    })()
    return () => { mounted = false }
  }, [id, isStudent, currentStudent?.id])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto pt-10 text-sm text-muted-foreground">로딩 중</div>
    )
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto pt-10 text-sm text-muted-foreground">퀴즈를 찾을 수 없습니다.</div>
    )
  }

  const scheduled = isScheduled(quiz)
  const displayStatus = resolveDisplayStatus(quiz)
  const canGrade = !scheduled && (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
  const canStats = quiz.status !== 'draft'
  const pastDue = isDeadlinePassed(quiz)
  // 학생은 진행기간 내라면 grading 상태에서도 응시 가능 (채점은 교수자 작업, 응시 가능 여부와 별개)
  const isOpenForStudent = (quiz.status === 'open' || quiz.status === 'grading') && !scheduled && !pastDue
  // 학생용 status 라벨은 진행중/마감/예정 으로만 단순화 — '채점중' 은 학생에게 노출하지 않음
  const studentDisplayStatus = scheduled ? 'scheduled' : isOpenForStudent ? 'open' : 'closed'
  const attemptCount = myAttempts.length
  const maxAttempts = quiz.allowAttempts ?? 1
  const isAttemptExceeded = maxAttempts !== -1 && attemptCount >= maxAttempts

  const handleDelete = async () => {
    setDeleteConfirm(false)
    try {
      await deleteQuiz(quiz.id)
      sessionStorage.setItem('xnq_toast', `'${quiz.title}' 퀴즈가 삭제되었습니다`)
      navigate('/')
    } catch (err) {
      console.error('[QuizDetail] delete 실패', err)
      showToast('삭제 중 오류가 발생했습니다')
    }
  }

  const timeLimitLabel = !quiz.timeLimit ? '제한 없음' : `${quiz.timeLimit}분`
  const attemptLabel = quiz.allowAttempts === -1 ? '무제한' : `${quiz.allowAttempts ?? 1}회`

  return (
    <>
      <div className="max-w-4xl mx-auto pb-10">
        <PageHeader
          ariaLabel="뒤로가기"
          title={isStudent ? (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <StatusBadge status={studentDisplayStatus} />
                {(quiz.week > 0 || quiz.session > 0) && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-accent text-primary">
                    {quiz.week > 0 ? `${quiz.week}주차` : ''}
                    {quiz.week > 0 && quiz.session > 0 ? ' ' : ''}
                    {quiz.session > 0 ? `${quiz.session}차시` : ''}
                  </span>
                )}
              </div>
              <h1 className="text-[20px] sm:text-[22px] font-bold text-foreground leading-tight">
                {quiz.title}
              </h1>
            </div>
          ) : quiz.title}
          actions={
            isStudent ? (
              <>
                {scheduled && (
                  <span className="text-xs text-warning font-medium">
                    {quiz.startDate} 시작
                  </span>
                )}
                {isOpenForStudent && !isAttemptExceeded && (
                  <Button asChild>
                    <Link to={`/quiz/${quiz.id}/attempt`}>
                      {attemptCount > 0 ? '재응시' : '응시하기'}
                    </Link>
                  </Button>
                )}
                {isOpenForStudent && isAttemptExceeded && (
                  <div className="relative group">
                    <Button disabled>응시하기</Button>
                    <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap text-xs px-2.5 py-1.5 rounded pointer-events-none z-10 bg-foreground text-white">
                      응시 가능 횟수({maxAttempts}회)를 초과했습니다
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {quiz.status === 'open' && (
                  <Button asChild>
                    <Link to={`/quiz/${quiz.id}/moderate`}>
                      <Activity size={15} />
                      응시 모니터링
                    </Link>
                  </Button>
                )}
                {canGrade && (
                  <Button asChild variant={quiz.status === 'open' ? 'outline' : 'default'}>
                    <Link to={`/quiz/${quiz.id}/grade`}>
                      <ClipboardCheck size={15} />
                      채점
                    </Link>
                  </Button>
                )}
                {canStats && (
                  <Button asChild variant="outline">
                    <Link to={`/quiz/${quiz.id}/stats`}>
                      <BarChart3 size={15} />
                      통계
                    </Link>
                  </Button>
                )}
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirm(true)}>
                      <Trash2 size={14} />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
          meta={isStudent ? (
            <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-sm">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-muted-foreground">응시 기간</span>
                <span className="font-medium text-foreground">{formatPeriodFull(quiz.startDate, quiz.dueDate)}</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-muted-foreground">지각 제출</span>
                <span className={cn(
                  'font-medium',
                  quiz.allowLateSubmit ? 'text-warning-foreground' : 'text-foreground'
                )}>
                  {!quiz.allowLateSubmit
                    ? '비허용'
                    : (quiz.lateSubmitDeadline
                        ? `${formatDateTimeFull(quiz.lateSubmitDeadline)}까지 허용`
                        : '무제한 허용')}
                </span>
              </span>
            </div>
          ) : (
            <>
              <StatusBadge status={displayStatus} />
              {(quiz.week > 0 || quiz.session > 0) && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-accent text-primary">
                  {quiz.week > 0 ? `${quiz.week}주차` : ''}
                  {quiz.week > 0 && quiz.session > 0 ? ' ' : ''}
                  {quiz.session > 0 ? `${quiz.session}차시` : ''}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                <CalendarRange size={11} />
                {formatDateRange(quiz.startDate, quiz.dueDate)}
              </span>
            </>
          )}
        />

        {/* 퀴즈 설명 카드 */}
        {quiz.description && (
          <Card className="mb-4 px-5 py-4">
            <p className="text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">
              {quiz.description}
            </p>
          </Card>
        )}

        {/* 요약 카드 — 학생: 점수·문제·시간제한·응시횟수·성적공개 / 교수자: 문항수·총점·제한시간·응시횟수 */}
        {isStudent ? (
          <Card className="mb-4 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">점수</p>
                <p className="text-xl font-bold text-foreground">
                  {quiz.totalPoints ?? 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">점</span>
                </p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">문제</p>
                <p className="text-xl font-bold text-foreground">
                  {quiz.questions ?? 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">개</span>
                </p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">시간 제한</p>
                <p className="text-xl font-bold text-foreground">{timeLimitLabel}</p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">응시 횟수</p>
                <p className="text-xl font-bold text-foreground">{attemptLabel}</p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">성적 공개</p>
                <p className="text-base font-bold text-foreground leading-tight pt-1">{scoreRevealCardLabel(quiz)}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mb-4 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">문항 수</p>
                <p className="text-xl font-bold text-foreground">
                  {quiz.questions ?? 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">개</span>
                </p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">총점</p>
                <p className="text-xl font-bold text-foreground">
                  {quiz.totalPoints ?? 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">점</span>
                </p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">제한 시간</p>
                <p className="text-xl font-bold text-foreground">{timeLimitLabel}</p>
              </div>
              <div className="text-center px-4 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">응시 횟수</p>
                <p className="text-xl font-bold text-foreground">{attemptLabel}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 상세 섹션들 */}
        {isStudent ? (
          <StudentResultSection
            quiz={quiz}
            questions={questions}
            myAttempts={myAttempts}
            studentId={currentStudent?.id}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 items-start">
            {/* 응시 조건 */}
            <Section title="응시 조건">
              <InfoRow label="응시 기간" value={formatDateRange(quiz.startDate, quiz.dueDate)} />
              <InfoRow
                label="이용 종료"
                value={quiz.lockDate
                  ? `${quiz.lockDate}${new Date() > new Date(quiz.lockDate) ? ' (종료됨)' : ''}`
                  : '설정 안함'}
              />
              <InfoRow
                label="지각 제출"
                value={
                  quiz.allowLateSubmit
                    ? (quiz.lateSubmitDeadline ? `${quiz.lateSubmitDeadline.replace('T', ' ')}까지 허용` : '무제한 허용')
                    : '비허용'
                }
              />
              <InfoRow label="제한 시간" value={timeLimitLabel} />
            </Section>

            {/* 응시 정책 */}
            <Section title="응시 정책">
              <InfoRow label="응시 횟수" value={attemptLabel} />
              {(quiz.allowAttempts === -1 || (quiz.allowAttempts ?? 1) > 1) && (
                <InfoRow label="점수 정책" value={quiz.scorePolicy ?? '최고 점수 유지'} />
              )}
              <InfoRow label="문항 셔플" value={quiz.shuffleQuestions ? '사용' : '사용 안함'} />
              <InfoRow label="보기 셔플" value={quiz.shuffleChoices ? '사용' : '사용 안함'} />
              <InfoRow label="한 문항씩 표시" value={quiz.oneQuestionAtATime ? '사용' : '사용 안함'} />
              <InfoRow label="답변 후 잠금" value={quiz.lockAfterAnswer ? '사용' : '사용 안함'} />
            </Section>

            {/* 성적 공개 */}
            <Section title="성적 공개">
              {(() => {
                const badge = scoreRevealBadge(quiz)
                return <InfoRow label="공개 정책" value={badge.label} badgeVariant={badge.variant} />
              })()}
              {(quiz.scoreRevealStart || quiz.scoreRevealEnd) && (
                <>
                  <InfoRow label="공개 시작" value={quiz.scoreRevealStart || '-'} />
                  <InfoRow label="공개 종료" value={quiz.scoreRevealEnd || '-'} />
                </>
              )}
              <InfoRow
                label="결과 확인"
                value={quiz.oneTimeResults ? '1회만 허용' : '제한 없음'}
              />
            </Section>

            {/* 접근 제한 */}
            <Section title="접근 제한">
              <InfoRow
                label="접근 코드"
                value={quiz.accessCode ? '설정됨' : '설정 안함'}
                muted={!quiz.accessCode}
              />
              <InfoRow
                label="IP 제한"
                value={quiz.ipRestriction ? quiz.ipRestriction : '설정 안함'}
                muted={!quiz.ipRestriction}
              />
              <InfoRow
                label="학생 노출"
                value={quiz.visible === false ? '숨김' : '공개'}
              />
              {Array.isArray(quiz.assignments) && quiz.assignments.length > 0 && (
                <InfoRow label="추가 기간 설정" value={`${quiz.assignments.length}건`} />
              )}
            </Section>
          </div>
        )}

      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="퀴즈 삭제"
          message={`'${quiz.title}' 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmDanger
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  )
}

function StudentResultSection({ quiz, questions, myAttempts, studentId }) {
  const latestAttempt = myAttempts.length > 0 ? myAttempts[myAttempts.length - 1] : null
  const reveal = computeRevealStatus(quiz)

  const totalPoints = (questions ?? []).reduce((s, q) => s + (q.points || 0), 0)
  const autoScore = latestAttempt?.totalAutoScore ?? 0
  const hasGradableQuestions = totalPoints > 0
  const submittedAt = (() => {
    const raw = latestAttempt?.submittedAt
    if (!raw) return null
    if (typeof raw === 'string' && /\d{4}-\d{2}-\d{2}T/.test(raw)) {
      const d = new Date(raw)
      return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('ko-KR')
    }
    return raw
  })()

  const scoreableQuestions = (questions ?? []).filter(q => q.type !== 'text')

  // oneTimeResults 정책: 1회 조회 후에는 응답/정답 공개 차단 (점수는 별도 정책)
  const oneTimeResults = !!quiz.oneTimeResults
  const [initiallyViewed] = useState(() =>
    latestAttempt && oneTimeResults ? isResultViewed(latestAttempt.id) : false
  )
  const responsesHidden = oneTimeResults && initiallyViewed
  const showWrongAnswer = reveal.showWrongAnswer && !responsesHidden
  const showAnswer = reveal.showAnswer && !responsesHidden

  useEffect(() => {
    if (!latestAttempt || !oneTimeResults) return
    if (!reveal.showWrongAnswer) return
    if (initiallyViewed) return
    if (!isResultViewed(latestAttempt.id)) markResultViewed(latestAttempt.id)
  }, [latestAttempt?.id, oneTimeResults, reveal.showWrongAnswer, initiallyViewed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* 응시 결과 요약 */}
      {latestAttempt ? (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">최근 제출</p>
              <p className="text-sm font-medium text-foreground">
                {submittedAt ?? '제출 정보 없음'}
                {latestAttempt.isLate && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-warning-bg text-warning-foreground border border-warning-border">
                    <AlertCircle size={10} />
                    지각 제출
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">점수</span>
              {!hasGradableQuestions ? (
                <span className="text-base font-semibold text-foreground">점수 없음</span>
              ) : reveal.showScore ? (
                <span className="text-lg font-semibold text-foreground tracking-tight tabular-nums">
                  {autoScore} <span className="text-sm font-normal text-muted-foreground">/ {totalPoints}</span>
                </span>
              ) : (
                <span className="text-sm font-semibold text-primary">공개 예정</span>
              )}
            </div>
          </div>
          {latestAttempt.manualPending > 0 && (
            <div className="px-5 py-2.5 border-t border-border bg-secondary/40 text-xs text-muted-foreground">
              서술형 {latestAttempt.manualPending}개 문항은 채점이 완료되면 점수에 반영됩니다.
            </div>
          )}
        </Card>
      ) : null}

      {/* 문항별 채점 결과 / 비공개 안내 */}
      {latestAttempt && scoreableQuestions.length > 0 && (
        responsesHidden ? (
          <Card className="overflow-hidden">
            <div className="px-5 py-6 flex items-start gap-3">
              <Eye size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">응답은 1회만 조회할 수 있습니다</p>
                <p className="text-xs text-muted-foreground">이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다.</p>
              </div>
            </div>
          </Card>
        ) : showWrongAnswer ? (
          <Card className="overflow-hidden py-0 gap-0">
            <div className="px-5 py-3.5 border-b border-border/60">
              <h3 className="text-[15px] font-semibold text-foreground">문항별 채점 결과</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              {questions.map((q, idx) => {
                if (q.type === 'text') return null
                const scored = latestAttempt.autoScores?.[q.id]
                const isAutoGraded = scored !== undefined
                const isCorrect = isAutoGraded && scored === q.points
                const isPartial = isAutoGraded && scored > 0 && scored < q.points
                const summary = htmlToPlainText(q.text || '')
                return (
                  <div key={q.id} className="p-3 rounded-lg text-[13px] border border-border bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-medium shrink-0 text-muted-foreground">Q{idx + 1}</span>
                        <span className="text-xs truncate text-secondary-foreground">{summary}</span>
                      </div>
                      <span className={cn(
                        'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                        !isAutoGraded && 'bg-secondary text-muted-foreground',
                        isAutoGraded && isCorrect && 'bg-correct-bg text-correct',
                        isAutoGraded && isPartial && 'bg-warning-bg text-warning',
                        isAutoGraded && !isCorrect && !isPartial && 'bg-incorrect-bg text-incorrect',
                      )}>
                        {!isAutoGraded ? '채점 대기' : isCorrect ? '정답' : isPartial ? `부분점수 ${scored}/${q.points}` : '오답'}
                      </span>
                    </div>
                    {showAnswer && isAutoGraded && !isCorrect && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <QuestionAnswer q={q} />
                      </div>
                    )}
                    {(() => {
                      const showCorrect   = isAutoGraded && isCorrect && q.correct_comments
                      const showIncorrect = isAutoGraded && !isCorrect && q.incorrect_comments
                      const showNeutral   = !!q.neutral_comments
                      if (!showCorrect && !showIncorrect && !showNeutral) return null
                      return (
                        <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                          {showCorrect && (
                            <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-correct-bg border border-emerald-200">
                              <span className="shrink-0 text-[11px] font-semibold text-correct mt-0.5">정답</span>
                              <p className="text-[13px] text-correct leading-relaxed whitespace-pre-wrap">{q.correct_comments}</p>
                            </div>
                          )}
                          {showIncorrect && (
                            <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-incorrect-bg border border-red-200">
                              <span className="shrink-0 text-[11px] font-semibold text-incorrect mt-0.5">오답</span>
                              <p className="text-[13px] text-incorrect leading-relaxed whitespace-pre-wrap">{q.incorrect_comments}</p>
                            </div>
                          )}
                          {showNeutral && (
                            <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border">
                              <span className="shrink-0 text-[11px] font-semibold text-secondary-foreground mt-0.5">코멘트</span>
                              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{q.neutral_comments}</p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="px-5 py-6 flex items-start gap-3">
              <EyeOff size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">성적은 공개되지 않습니다</p>
                <p className="text-xs text-muted-foreground">
                  교수자가 설정한 공개 시점이 되면 문항별 채점 결과를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </Card>
        )
      )}

      {/* 교수자 코멘트 */}
      {studentId && (
        <Card className="overflow-hidden py-0 gap-0">
          <div className="px-5 py-3.5 border-b border-border/60">
            <h3 className="text-[15px] font-semibold text-foreground">교수자 코멘트</h3>
          </div>
          <div className="h-[200px] flex flex-col">
            <CommentThread quizId={quiz.id} studentId={studentId} role="student" className="flex-1" />
          </div>
        </Card>
      )}
    </div>
  )
}

