import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Pencil, BarChart3, ClipboardCheck, Eye, Trash2, MoreVertical, CalendarRange } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { mockQuizzes } from '../data/mockData'
import { getQuiz, deleteQuiz, isApiMode } from '@/lib/data'
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

function isScheduled(quiz) {
  if (!quiz || quiz.status !== 'open' || !quiz.startDate) return false
  return new Date() < new Date(quiz.startDate)
}

function InfoRow({ label, value, muted = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-sm text-right break-all', muted ? 'text-muted-foreground' : 'text-foreground font-medium')}>
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-6 py-2 divide-y divide-slate-100">
        {children}
      </div>
    </Card>
  )
}

function formatDateRange(start, end) {
  if (!start && !end) return '응시 기간 제한 없음'
  return `${start || '제한 없음'} ~ ${end || '제한 없음'}`
}

function scoreRevealSummary(quiz) {
  if (quiz.scoreRevealEnabled === undefined && quiz.scoreReleasePolicy === undefined) return '설정 없음'
  const enabled = quiz.scoreRevealEnabled ?? (quiz.scoreReleasePolicy !== null)
  if (!enabled) return '비공개'
  const isWithAnswer = quiz.scoreRevealScope === 'with_answer'
  const timing = quiz.scoreRevealTiming ?? quiz.scoreReleasePolicy
  const timingLabel = timing === 'after_due' ? '마감 후 공개'
    : timing === 'period' ? '공개 기간 지정'
    : '즉시 공개'
  const scopeLabel = isWithAnswer ? '정답 포함' : '점수만'
  if (timing === 'period' && (quiz.scoreRevealStart || quiz.scoreRevealEnd)) {
    return `${scopeLabel} · ${timingLabel} (${quiz.scoreRevealStart?.split(' ')[0] || ''} ~ ${quiz.scoreRevealEnd?.split(' ')[0] || ''})`
  }
  return `${scopeLabel} · ${timingLabel}`
}

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useRole()

  // 학생은 상세 페이지 접근 불가 — 목록으로 리다이렉트
  if (role === 'student') return <Navigate to="/" replace />

  const [quiz, setQuiz] = useState(() => {
    if (isApiMode()) return null
    return mockQuizzes.find(q => q.id === id) ?? null
  })
  const [loaded, setLoaded] = useState(!isApiMode() && !!quiz)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [toast, setToast] = useState(null)

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
  const canGrade = !scheduled && (quiz.status === 'grading' || quiz.status === 'closed' || quiz.status === 'open')
  const canStats = quiz.status !== 'draft'

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
        {/* 상단 브레드크럼 — Outline 스타일 뒤로가기 버튼 */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg mt-2 mb-3"
        >
          <ArrowLeft size={16} strokeWidth={2.25} />
          퀴즈 목록
        </button>

        {/* 헤더: 제목 + 메타(상태/주차/기간) + 액션 */}
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-foreground leading-tight mb-2">{quiz.title}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={scheduled ? 'scheduled' : quiz.status} />
              {(quiz.week > 0 || quiz.session > 0) && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-accent text-primary">
                  {quiz.week > 0 ? `${quiz.week}주차` : ''}
                  {quiz.week > 0 && quiz.session > 0 ? ' ' : ''}
                  {quiz.session > 0 ? `${quiz.session}차시` : ''}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                <CalendarRange size={11} className="text-muted-foreground" />
                {formatDateRange(quiz.startDate, quiz.dueDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            {canGrade && (
              <Button asChild>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 size={14} />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 퀴즈 설명 카드 */}
        {quiz.description && (
          <Card className="mb-4 px-5 py-4">
            <p className="text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">
              {quiz.description}
            </p>
          </Card>
        )}

        {/* 요약 카드: 문항 수 · 총점 · 제한시간 · 응시횟수 */}
        <Card className="mb-4 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            <div className="text-center px-4 py-5">
              <p className="text-xs text-muted-foreground mb-1">문항 수</p>
              <p className="text-xl font-bold text-foreground">
                {quiz.questions ?? questions.length}<span className="text-sm font-normal text-muted-foreground ml-0.5">개</span>
              </p>
            </div>
            <div className="text-center px-4 py-5">
              <p className="text-xs text-muted-foreground mb-1">총점</p>
              <p className="text-xl font-bold text-foreground">
                {quiz.totalPoints ?? 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">점</span>
              </p>
            </div>
            <div className="text-center px-4 py-5">
              <p className="text-xs text-muted-foreground mb-1">제한 시간</p>
              <p className="text-xl font-bold text-foreground">{timeLimitLabel}</p>
            </div>
            <div className="text-center px-4 py-5">
              <p className="text-xs text-muted-foreground mb-1">응시 횟수</p>
              <p className="text-xl font-bold text-foreground">{attemptLabel}</p>
            </div>
          </div>
        </Card>

        {/* 상세 섹션들 */}
        <div className="grid gap-4 md:grid-cols-2">
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
            <InfoRow label="공개 정책" value={scoreRevealSummary(quiz)} />
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
