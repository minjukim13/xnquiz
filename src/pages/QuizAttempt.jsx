import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { Clock, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Send, Eye, X, Lock } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes, getQuizQuestions as mockGetQuestions, autoGradeAnswer, saveStudentAttempt } from '../data/mockData'
import { getQuiz, getQuizQuestions, startAttempt, saveAnswers, submitAttempt } from '@/lib/data'
import { useRole } from '../context/role'

const DATA_MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
import { AlertDialog, ConfirmDialog } from '../components/ConfirmDialog'
import { isLateSubmission } from '../utils/deadlineUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QuestionAnswer from '../components/QuestionAnswer'
import { generateStudentVariables } from '@/utils/formulaEngine'
import {
  buildAttemptSessionKey,
  loadAttemptSession,
  saveAttemptSession,
  clearAttemptSession,
  AUTOSAVE_INTERVAL_MS,
} from '@/utils/autosave'
import {
  buildActivityLogKey,
  appendActivityLog,
  ACTIVITY_TYPES,
} from '@/utils/activityLog'
import { parseInlineBody, hasInlinePlaceholders } from '@/utils/placeholderUtils'
import { isResultViewed, markResultViewed } from '@/utils/resultsViewedStorage'

// 응시 여부 판정 (유형별 답안 구조 대응)
function isQuestionAnswered(q, v) {
  if (q.type === 'text') return true // 안내문은 응답 불요
  if (v === '' || v === undefined || v === null) return false
  if (Array.isArray(v)) return v.length > 0 && v.some(x => x !== '' && x !== undefined && x !== null)
  if (typeof v === 'object') {
    if (q.type === 'file_upload') return !!v.fileName
    if (q.type === 'formula') return v.value !== '' && v.value !== undefined && v.value !== null
    return Object.values(v).some(x => x !== '' && x !== undefined && x !== null)
  }
  return true
}

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const { role, currentStudent } = useRole()

  const [quiz, setQuiz] = useState(() => mockQuizzes.find(q => q.id === id) ?? null)
  const [questions, setQuestions] = useState(() => DATA_MODE === 'mock' ? mockGetQuestions(id) : [])
  const [loaded, setLoaded] = useState(DATA_MODE === 'mock')
  const [apiAttemptId, setApiAttemptId] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [q, qs] = await Promise.all([getQuiz(id), getQuizQuestions(id)])
        if (!mounted) return
        if (q) setQuiz(q)
        setQuestions(qs)
      } catch (err) {
        console.error('[QuizAttempt] load 실패', err)
      } finally {
        if (mounted) setLoaded(true)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const noTimeLimit = !quiz?.timeLimit || isPreview
  const isLate = !isPreview && isLateSubmission(quiz)

  // 응시 세션 복원 (Canvas 스펙: 새로고침/재접속 시 중단 지점에서 재개)
  const oneAtATime = !!quiz?.oneQuestionAtATime
  const lockAfter = oneAtATime && !!quiz?.lockAfterAnswer
  const sessionKey = !isPreview ? buildAttemptSessionKey(id, currentStudent?.id) : null
  const activityKey = !isPreview ? buildActivityLogKey(id, currentStudent?.id) : null
  const restored = loadAttemptSession(sessionKey)

  const [answers, setAnswers] = useState(restored?.answers ?? {})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [startedAt] = useState(() => restored?.startedAt ?? Date.now())
  const computeRemaining = () => {
    if (noTimeLimit) return null
    const total = (quiz?.timeLimit ?? 30) * 60
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, total - elapsed)
  }
  const [timeRemaining, setTimeRemaining] = useState(computeRemaining)
  const [alertDialog, setAlertDialog] = useState(null)
  const [showAnswerPreview, setShowAnswerPreview] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(restored?.savedAt ?? null)
  const [saveError, setSaveError] = useState(null) // 'quota' | 'error' | null

  const [currentIndex, setCurrentIndex] = useState(restored?.currentIndex ?? 0)
  const [lockConfirm, setLockConfirm] = useState(false)
  const [blankSkipConfirm, setBlankSkipConfirm] = useState(false)
  const [startNotice, setStartNotice] = useState(() => lockAfter && !restored && !isPreview)

  // Autosave: 30초 주기 + 페이지 이탈 시 즉시 저장 (dirty 변경이 있을 때만)
  const dirtyRef = useRef(false)
  const snapshotRef = useRef({ answers, currentIndex, startedAt })

  // 활동 로그: 답변 변경은 문항별 1.5초 디바운스로 집계 (타이핑 폭주 방지)
  const answerDebounceRef = useRef({})
  const logAnswerChange = useCallback((qId) => {
    if (!activityKey) return
    const timers = answerDebounceRef.current
    if (timers[qId]) clearTimeout(timers[qId])
    timers[qId] = setTimeout(() => {
      appendActivityLog(activityKey, { type: ACTIVITY_TYPES.ANSWER_CHANGE, qId })
      delete timers[qId]
    }, 1500)
  }, [activityKey])

  // 응시 시작 로그: startNotice 대기 중이 아닐 때 1회 기록
  const startLoggedRef = useRef(false)
  useEffect(() => {
    if (!activityKey || submitted || startNotice) return
    if (startLoggedRef.current) return
    startLoggedRef.current = true
    appendActivityLog(activityKey, { type: ACTIVITY_TYPES.START })
  }, [activityKey, submitted, startNotice])

  // 포커스 이탈 감지
  useEffect(() => {
    if (!activityKey || submitted) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        appendActivityLog(activityKey, { type: ACTIVITY_TYPES.FOCUS_LOSS })
      } else if (document.visibilityState === 'visible') {
        appendActivityLog(activityKey, { type: ACTIVITY_TYPES.FOCUS_GAIN })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [activityKey, submitted])

  useEffect(() => {
    snapshotRef.current = { answers, currentIndex, startedAt }
    dirtyRef.current = true
  }, [answers, currentIndex, startedAt])

  useEffect(() => {
    if (!sessionKey || submitted) return
    const flush = () => {
      if (!dirtyRef.current) return
      const res = saveAttemptSession(sessionKey, snapshotRef.current)
      if (res.ok) {
        dirtyRef.current = false
        setLastSavedAt(Date.now())
        setSaveError(prev => (prev ? null : prev))
        if (activityKey) appendActivityLog(activityKey, { type: ACTIVITY_TYPES.AUTOSAVE })
      } else {
        setSaveError(res.reason ?? 'error')
      }
    }
    const interval = setInterval(flush, AUTOSAVE_INTERVAL_MS)
    const onUnload = () => {
      if (dirtyRef.current) saveAttemptSession(sessionKey, snapshotRef.current)
    }
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('pagehide', onUnload)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('pagehide', onUnload)
      flush()
    }
  }, [sessionKey, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (submitted || noTimeLimit || timeRemaining <= 0) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(true)
          return 0
        }
        return Math.max(0, prev - 1)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas 정책: 세션 복원 시 제한시간이 이미 초과됐으면 즉시 자동 제출
  // (서버 타이머가 브라우저 종료 후에도 계속 진행된다는 Canvas 모델과 동일하게 동작)
  // 참고: https://canvas.instructure.com/doc/api/quiz_submissions.html
  useEffect(() => {
    if (!loaded || submitted || noTimeLimit || isPreview) return
    if (timeRemaining === 0) handleSubmit(true)
  }, [loaded, submitted, noTimeLimit, isPreview, timeRemaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const answeredCount = questions.filter(q => q.type !== 'text' && isQuestionAnswered(q, answers[q.id])).length

  const handleSubmit = useCallback((auto = false) => {
    if (submitted) return
    setSubmitted(true)

    const autoScores = {}
    let totalAuto = 0
    let manualPending = 0

    questions.forEach(q => {
      const ans = answers[q.id] ?? ''
      const score = autoGradeAnswer(q, ans)
      if (score !== null) {
        autoScores[q.id] = score
        totalAuto += score
      } else {
        manualPending++
      }
    })

    const attempt = {
      id: `attempt_${Date.now()}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      studentNumber: currentStudent.studentId,
      department: currentStudent.department,
      quizId: id,
      answers,
      autoScores,
      totalAutoScore: totalAuto,
      totalPossibleAuto: questions.filter(q => q.autoGrade).reduce((s, q) => s + q.points, 0),
      manualPending,
      submittedAt: new Date().toLocaleString('ko-KR'),
      // Canvas 정책: time_spent 는 time_limit 으로 클램프. 무제한 퀴즈는 실제 경과.
      timeTaken: (() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
        return noTimeLimit ? elapsed : Math.min(quiz?.timeLimit ?? elapsed, elapsed)
      })(),
      autoSubmitted: auto,
      isLate: isLate || false,
      scorePolicy: quiz?.scorePolicy ?? '최고 점수 유지',
    }

    if (!isPreview) {
      if (DATA_MODE === 'api') {
        ;(async () => {
          try {
            let attemptId = apiAttemptId
            if (!attemptId) {
              const created = await startAttempt(id)
              attemptId = created.id
              setApiAttemptId(attemptId)
            }
            const answerArr = Object.entries(answers)
              .filter(([, v]) => v !== undefined)
              .map(([questionId, response]) => ({ questionId, response }))
            if (answerArr.length > 0) {
              await saveAnswers(attemptId, answerArr)
            }
            const server = await submitAttempt(attemptId)
            // 서버 채점 결과로 결과 화면 재동기화 (DB 권위값 반영)
            const serverAutoScores = {}
            let serverManualPending = 0
            for (const a of server.answers ?? []) {
              if (a.autoScore !== null && a.autoScore !== undefined) {
                serverAutoScores[a.questionId] = a.autoScore
              } else {
                serverManualPending++
              }
            }
            setResult(prev => ({
              ...prev,
              id: server.id,
              autoScores: serverAutoScores,
              totalAutoScore: server.autoScore ?? 0,
              manualPending: serverManualPending,
              submittedAt: server.submittedAt
                ? new Date(server.submittedAt).toLocaleString('ko-KR')
                : prev.submittedAt,
              isLate: !!server.isLate,
              graded: !!server.graded,
              totalScore: server.totalScore ?? null,
            }))
          } catch (err) {
            console.error('[QuizAttempt] api 제출 실패:', err)
            setAlertDialog({ title: '제출 실패', message: err?.message ?? '서버에 제출하지 못했습니다.', variant: 'error' })
          }
        })()
      } else {
        try {
          saveStudentAttempt(id, attempt)
        } catch (err) {
          console.error('[xnquiz] 제출 저장 실패:', err)
          setAlertDialog({ title: '저장 실패', message: '응시 기록 저장에 실패했습니다.\n브라우저 저장 공간을 확인해주세요.', variant: 'error' })
        }
      }
      clearAttemptSession(sessionKey)
      dirtyRef.current = false
      if (activityKey) appendActivityLog(activityKey, { type: ACTIVITY_TYPES.SUBMIT, auto })
    }
    setResult(attempt)
  }, [answers, questions, id, currentStudent, timeRemaining, submitted, isPreview, isLate, sessionKey, activityKey, apiAttemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPreview && role !== 'student') return <Navigate to="/" replace />

  if (!isPreview && quiz && quiz.lockDate && new Date() > new Date(quiz.lockDate)) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <Lock size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base font-semibold mb-1 text-slate-700">이용이 종료되었습니다</p>
          <p className="text-sm mb-5 text-muted-foreground">이용 종료 일시가 지나 퀴즈에 접근할 수 없습니다</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </Layout>
    )
  }

  if (!isPreview && quiz && quiz.status === 'open' && quiz.startDate && new Date() < new Date(quiz.startDate)) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <Clock size={36} className="mx-auto mb-3 text-amber-400" />
          <p className="text-base font-semibold mb-1 text-slate-700">응시 시작 전입니다</p>
          <p className="text-sm mb-5 text-muted-foreground">{quiz.startDate}부터 응시할 수 있습니다</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </Layout>
    )
  }

  if (!isPreview && quiz && quiz.status !== 'open') {
    const statusMsg = {
      draft: '아직 공개되지 않은 퀴즈입니다.',
      grading: '채점 중인 퀴즈로 응시가 마감되었습니다.',
      closed: '종료된 퀴즈입니다.',
    }[quiz.status] ?? '현재 응시할 수 없는 퀴즈입니다.'
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <AlertCircle size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base font-semibold mb-1 text-slate-700">응시 불가</p>
          <p className="text-sm mb-5 text-muted-foreground">{statusMsg}</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </Layout>
    )
  }

  // 지각 제출 검증: dueDate + gracePeriod 경과 시 allowLateSubmit 정책 확인
  if (!isPreview && quiz && quiz.status === 'open' && isLateSubmission(quiz)) {
    const lateDeadlinePassed = quiz.allowLateSubmit && quiz.lateSubmitDeadline && new Date() > new Date(quiz.lateSubmitDeadline)
    if (!quiz.allowLateSubmit || lateDeadlinePassed) {
      return (
        <Layout>
          <div className="max-w-2xl mx-auto py-16 text-center">
            <Clock size={36} className="mx-auto mb-3 text-red-400" />
            <p className="text-base font-semibold mb-1 text-slate-700">
              {lateDeadlinePassed ? '지각 제출 기한이 종료되었습니다' : '제출 기한이 종료되었습니다'}
            </p>
            <p className="text-sm mb-5 text-muted-foreground">
              {lateDeadlinePassed
                ? `지각 제출 마감: ${quiz.lateSubmitDeadline.replace('T', ' ')}`
                : `마감일: ${quiz.dueDate}`}
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              퀴즈 목록으로
            </Button>
          </div>
        </Layout>
      )
    }
  }

  if (!loaded) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-sm text-muted-foreground">불러오는 중</p>
        </div>
      </Layout>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-sm text-muted-foreground">해당 퀴즈를 찾을 수 없거나 응시 가능한 문항이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto pb-6">

        {/* 자동 저장 실패 배너 */}
        {saveError && !submitted && (
          <div className="px-4 py-3 rounded-lg mb-5 bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">자동 저장 실패</p>
                <p className="text-xs mt-0.5 text-red-700">
                  {saveError === 'quota'
                    ? '브라우저 저장 공간이 부족합니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요.'
                    : '답변이 자동 저장되지 않고 있습니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 지각 제출 배너 */}
        {isLate && !submitted && (
          <div className="px-4 py-3 rounded-lg mb-5 bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-800">지각 제출</span>
              <span className="text-xs text-amber-700">마감일({quiz.dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다.</span>
            </div>
            {quiz.lateSubmitDeadline && (
              <p className="text-xs text-amber-600 mt-1.5 ml-[23px]">지각 제출 마감: {quiz.lateSubmitDeadline.replace('T', ' ')}</p>
            )}
          </div>
        )}

        {/* 미리보기 배너 */}
        {isPreview && (
          <div className="px-4 py-3 rounded-lg mb-5 bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">미리보기 모드</span>
                <span className="text-xs text-amber-700">학생에게 보이는 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다.</span>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <X size={14} />
                미리보기 종료
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-amber-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Switch
                  checked={showAnswerPreview}
                  onCheckedChange={setShowAnswerPreview}
                  className="data-[state=checked]:bg-amber-600"
                />
                <span className="text-xs font-medium text-amber-800">정답 함께 표시</span>
              </label>
              {showAnswerPreview && (
                <span className="text-xs text-amber-700">각 문항 하단에 정답이 표시됩니다.</span>
              )}
            </div>
          </div>
        )}

        {/* 퀴즈 헤더 */}
        <Card className="mb-5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs mb-0.5 text-muted-foreground">{quiz.week}주차 {quiz.session}차시 · {questions.reduce((s, q) => s + (q.points || 0), 0)}점</p>
                <h1 className="text-base font-bold">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-sm mt-1.5 text-slate-500">{quiz.description}</p>
                )}
                {!isPreview && !submitted && lastSavedAt && !saveError && (
                  <p className="text-[11px] mt-2 text-muted-foreground inline-flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    자동 저장됨 · {new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-xs mb-0.5 text-muted-foreground">답변 완료</p>
                  <p className={cn('text-base font-bold', answeredCount === questions.length ? 'text-green-700' : '')}>
                    {answeredCount}<span className="text-xs font-normal text-muted-foreground">/{questions.length}</span>
                  </p>
                </div>
                {noTimeLimit ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold bg-muted text-slate-700 border border-border">
                    <Clock size={13} />
                    제한 없음
                  </div>
                ) : (
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold border',
                    timeRemaining < 300 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-muted text-slate-700 border-border'
                  )}>
                    <Clock size={13} />
                    {formatTime(timeRemaining)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 문항 목록 */}
        {oneAtATime ? (
          <>
            {/* 진행 표시 */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                문항 {currentIndex + 1} / {questions.length}
              </p>
              {lockAfter && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <Lock size={11} />
                  응답 후에는 이전 문항으로 돌아갈 수 없습니다
                </span>
              )}
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-100 mb-4">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <QuestionCard
              key={questions[currentIndex].id}
              question={questions[currentIndex]}
              index={currentIndex}
              value={answers[questions[currentIndex].id]}
              onChange={val => {
                const qId = questions[currentIndex].id
                setAnswers(prev => ({ ...prev, [qId]: val }))
                logAnswerChange(qId)
              }}
              disabled={submitted}
              showAnswer={isPreview && showAnswerPreview}
              studentId={currentStudent?.id}
            />

            {/* 내비게이션 */}
            {!submitted && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentIndex(i => {
                      const next = Math.max(0, i - 1)
                      if (next !== i && activityKey) {
                        appendActivityLog(activityKey, { type: ACTIVITY_TYPES.NAVIGATE, from: i, to: next })
                      }
                      return next
                    })
                  }}
                  disabled={lockAfter || currentIndex === 0}
                >
                  <ChevronLeft size={14} />
                  이전
                </Button>
                <p className="text-xs text-muted-foreground">
                  답변 완료 {answeredCount} / {questions.filter(q => q.type !== 'text').length}
                </p>
                {currentIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => {
                      const q = questions[currentIndex]
                      const isBlank = q.type !== 'text' && !isQuestionAnswered(q, answers[q.id])
                      if (lockAfter && isBlank) {
                        setBlankSkipConfirm(true)
                      } else if (lockAfter) {
                        setLockConfirm(true)
                      } else {
                        setCurrentIndex(i => {
                          const next = Math.min(questions.length - 1, i + 1)
                          if (next !== i && activityKey) {
                            appendActivityLog(activityKey, { type: ACTIVITY_TYPES.NAVIGATE, from: i, to: next })
                          }
                          return next
                        })
                      }
                    }}
                  >
                    다음
                    <ChevronRight size={14} />
                  </Button>
                ) : (
                  <Button onClick={() => handleSubmit(false)}>
                    <Send size={14} />
                    제출하기
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  value={answers[q.id]}
                  onChange={val => {
                    setAnswers(prev => ({ ...prev, [q.id]: val }))
                    logAnswerChange(q.id)
                  }}
                  disabled={submitted}
                  showAnswer={isPreview && showAnswerPreview}
                  studentId={currentStudent?.id}
                />
              ))}
            </div>

            {/* 제출 버튼 */}
            {!submitted && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  {questions.length - answeredCount > 0
                    ? `${questions.length - answeredCount}개 문항이 미답변 상태입니다.`
                    : '모든 문항에 답변했습니다.'}
                </p>
                <Button onClick={() => handleSubmit(false)}>
                  <Send size={14} />
                  제출하기
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 제출 완료 결과 모달 */}
      {result && <ResultModal result={result} quiz={quiz} questions={questions} onClose={() => navigate('/')} />}
      {alertDialog && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          variant={alertDialog.variant}
          onClose={() => setAlertDialog(null)}
        />
      )}
      {lockConfirm && (
        <ConfirmDialog
          title="다음 문항으로 이동"
          message={"이 문항으로 돌아올 수 없습니다.\n이대로 다음 문항으로 이동할까요?"}
          confirmLabel="다음으로 이동"
          cancelLabel="취소"
          onConfirm={() => {
            setLockConfirm(false)
            setCurrentIndex(i => {
              const next = Math.min(questions.length - 1, i + 1)
              if (next !== i && activityKey) {
                appendActivityLog(activityKey, { type: ACTIVITY_TYPES.NAVIGATE, from: i, to: next })
              }
              return next
            })
          }}
          onCancel={() => setLockConfirm(false)}
        />
      )}
      {blankSkipConfirm && (
        <ConfirmDialog
          title="답변 없이 이동"
          message={"답변을 입력하지 않고 다음 문항으로 이동하면,\n이 문항으로 돌아와 답변할 수 없습니다."}
          confirmLabel="답변 없이 이동"
          cancelLabel="돌아가기"
          confirmDanger
          onConfirm={() => {
            setBlankSkipConfirm(false)
            setCurrentIndex(i => {
              const next = Math.min(questions.length - 1, i + 1)
              if (next !== i && activityKey) {
                appendActivityLog(activityKey, { type: ACTIVITY_TYPES.NAVIGATE, from: i, to: next })
              }
              return next
            })
          }}
          onCancel={() => setBlankSkipConfirm(false)}
        />
      )}
      {startNotice && (
        <AlertDialog
          title="응답 후 문항 잠금"
          message={"이 퀴즈는 한 문항씩 표시되며, 다음 문항으로 이동하면 이전 문항으로 돌아올 수 없습니다.\n각 문항을 신중히 답변해주세요."}
          onClose={() => setStartNotice(false)}
        />
      )}
    </Layout>
  )
}

function QuestionCard({ question, index, value, onChange, disabled, showAnswer = false, studentId }) {
  const typeLabels = {
    multiple_choice: '객관식', true_false: '참/거짓', short_answer: '단답형',
    essay: '서술형', numerical: '수치형', fill_in_blank: '빈칸 채우기',
    multiple_answers: '복수 선택', ordering: '순서 배열',
    matching: '연결형', multiple_dropdowns: '드롭다운 선택',
    fill_in_multiple_blanks: '다중 빈칸', formula: '수식형',
    text: '안내', file_upload: '파일 제출',
  }
  const isAnswered = isQuestionAnswered(question, value)

  // text 유형: 안내문으로만 렌더링 (Q번호 없음)
  if (question.type === 'text') {
    return (
      <Card className="overflow-hidden border-slate-200">
        <CardContent className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0">안내</Badge>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{question.text}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', isAnswered && !disabled && 'border-blue-200')}>
      <CardContent className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
            <Badge variant="secondary" className="bg-accent text-primary border-0">
              {typeLabels[question.type] ?? question.type}
            </Badge>
          </div>
          <span className="text-xs font-semibold shrink-0 text-slate-600">{question.points}점</span>
        </div>
        {/* 본문: 다중 빈칸/드롭다운이고 본문에 placeholder가 있으면 inline 렌더 */}
        {((question.type === 'fill_in_multiple_blanks' || question.type === 'multiple_dropdowns') && hasInlinePlaceholders(question.text)) ? (
          <p className="text-sm leading-loose mb-4 whitespace-pre-wrap">
            {parseInlineBody(question.text).map((t, i) => {
              if (t.kind === 'text') return <span key={i}>{t.content}</span>
              const idx = t.num - 1
              const arr = Array.isArray(value) ? value : []
              if (t.kind === 'blank') {
                return (
                  <input
                    key={i}
                    type="text"
                    value={arr[idx] ?? ''}
                    disabled={disabled}
                    onChange={e => {
                      const next = [...arr]
                      while (next.length < t.num) next.push('')
                      next[idx] = e.target.value
                      onChange(next)
                    }}
                    placeholder={`빈칸 ${t.num}`}
                    className="inline-block mx-1 min-w-[90px] max-w-[220px] text-sm px-2 py-0.5 rounded-md border border-primary/40 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary disabled:bg-muted align-baseline"
                    style={{ width: `${Math.max(6, (arr[idx]?.length || 6) + 2)}ch` }}
                  />
                )
              }
              if (t.kind === 'dropdown') {
                const dd = question.dropdowns?.[idx]
                if (!dd) return <span key={i} className="text-destructive">[드롭다운{t.num}?]</span>
                return (
                  <select
                    key={i}
                    value={arr[idx] ?? ''}
                    disabled={disabled}
                    onChange={e => {
                      const next = [...arr]
                      while (next.length < t.num) next.push('')
                      next[idx] = e.target.value
                      onChange(next)
                    }}
                    className="inline-block mx-1 text-sm px-2 py-0.5 rounded-md border border-primary/40 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary disabled:bg-muted align-baseline"
                  >
                    <option value="">선택</option>
                    {dd.options.map((o, j) => (
                      <option key={j} value={o}>{o}</option>
                    ))}
                  </select>
                )
              }
              return null
            })}
          </p>
        ) : (
          <p className="text-sm leading-relaxed mb-4">{question.text}</p>
        )}

        {/* 객관식 / 참거짓 */}
        {(question.type === 'multiple_choice' || question.type === 'true_false') && (
          <div className="space-y-2">
            {question.choices.map((choice, i) => (
              <label
                key={i}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors',
                  value === choice ? 'bg-accent border-blue-200' : 'bg-slate-50 border-slate-100',
                  !disabled && 'cursor-pointer hover:border-blue-200',
                  disabled && 'cursor-default'
                )}
              >
                <input
                  type="radio" name={question.id} value={choice}
                  checked={value === choice}
                  onChange={() => !disabled && onChange(choice)}
                  className="accent-primary" disabled={disabled}
                />
                <span className="text-sm text-slate-700">{choice}</span>
              </label>
            ))}
          </div>
        )}

        {/* 복수 선택 */}
        {question.type === 'multiple_answers' && (
          <div className="space-y-2">
            {(question.options || question.choices || []).map((choice, i) => {
              const str = typeof value === 'string' ? value : ''
              const selected = str ? str.split(',').map(s => s.trim()).includes(choice) : false
              const toggle = () => {
                if (disabled) return
                const current = str ? str.split(',').map(s => s.trim()).filter(Boolean) : []
                const next = selected ? current.filter(c => c !== choice) : [...current, choice]
                onChange(next.join(','))
              }
              return (
                <label
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors',
                    selected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100',
                    !disabled && 'cursor-pointer hover:border-blue-200',
                    disabled && 'cursor-default'
                  )}
                >
                  <input type="checkbox" checked={selected} onChange={toggle} className="accent-blue-500" disabled={disabled} />
                  <span className="text-sm text-slate-700">{choice}</span>
                </label>
              )
            })}
          </div>
        )}

        {question.type === 'short_answer' && (
          <input
            type="text" value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요" disabled={disabled}
            className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
          />
        )}

        {question.type === 'essay' && (
          <textarea
            value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요" rows={5} disabled={disabled}
            className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-none disabled:bg-muted"
          />
        )}

        {question.type === 'numerical' && (
          <input
            type="number" value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder="숫자를 입력하세요" disabled={disabled}
            className="w-full max-w-[200px] text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
          />
        )}

        {/* 수식형 */}
        {question.type === 'formula' && (() => {
          // 학생별 변수값 (studentId 기반 시드 — 같은 학생은 항상 같은 값)
          const varValues = generateStudentVariables(question.variables || [], `${studentId || 'anon'}_${question.id}`)
          const storedValue = (value && typeof value === 'object') ? value.value : ''
          const studentValue = typeof storedValue === 'string' ? storedValue : ''
          return (
            <div className="space-y-2">
              {Object.keys(varValues).length > 0 && (
                <div className="inline-flex flex-wrap gap-2 text-xs text-muted-foreground px-3 py-2 rounded-md bg-slate-50 border border-slate-100">
                  <span className="font-medium">주어진 값:</span>
                  {Object.entries(varValues).map(([name, val]) => (
                    <span key={name} className="font-mono text-teal-700">
                      {name} = {val}
                    </span>
                  ))}
                </div>
              )}
              <input
                type="number" value={studentValue}
                onChange={e => onChange({ value: e.target.value, variables: varValues })}
                placeholder="계산 결과를 입력하세요" disabled={disabled}
                className="w-full max-w-[240px] text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
              />
            </div>
          )
        })()}

        {/* 연결형 */}
        {question.type === 'matching' && Array.isArray(question.pairs) && (() => {
          const rights = [...question.pairs.map(p => p.right), ...(question.distractors || [])]
          const answerMap = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {}
          return (
            <div className="space-y-2">
              {question.pairs.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-100 bg-slate-50">
                  <span className="text-sm text-slate-700 flex-1 truncate">{p.left}</span>
                  <span className="text-muted-foreground text-xs shrink-0">↔</span>
                  <select
                    value={answerMap[p.left] ?? ''} disabled={disabled}
                    onChange={e => onChange({ ...answerMap, [p.left]: e.target.value })}
                    className="flex-1 text-sm px-2.5 py-1.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary disabled:bg-muted"
                  >
                    <option value="">선택하세요</option>
                    {rights.map((r, j) => (
                      <option key={j} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 드롭다운 선택 (레거시 — 본문에 placeholder 없을 때만) */}
        {question.type === 'multiple_dropdowns' && Array.isArray(question.dropdowns) && !hasInlinePlaceholders(question.text) && (() => {
          const arr = Array.isArray(value) ? value : []
          return (
            <div className="space-y-2">
              {question.dropdowns.map((dd, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-100 bg-slate-50">
                  {dd.label && <span className="text-sm font-medium text-slate-700 flex-shrink-0">{dd.label}</span>}
                  <select
                    value={arr[i] ?? ''} disabled={disabled}
                    onChange={e => {
                      const next = [...arr]
                      next[i] = e.target.value
                      onChange(next)
                    }}
                    className="flex-1 text-sm px-2.5 py-1.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary disabled:bg-muted"
                  >
                    <option value="">선택하세요</option>
                    {dd.options.map((o, j) => (
                      <option key={j} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 다중 빈칸 (레거시 — 본문에 placeholder 없을 때만) */}
        {question.type === 'fill_in_multiple_blanks' && Array.isArray(question.correctAnswer) && !hasInlinePlaceholders(question.text) && (() => {
          const arr = Array.isArray(value) ? value : []
          return (
            <div className="space-y-2">
              {question.correctAnswer.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">빈칸 {i + 1}</span>
                  <input
                    type="text" value={arr[i] ?? ''} disabled={disabled}
                    onChange={e => {
                      const next = [...arr]
                      next[i] = e.target.value
                      onChange(next)
                    }}
                    placeholder="답안을 입력하세요"
                    className="flex-1 text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
                  />
                </div>
              ))}
            </div>
          )
        })()}

        {/* 파일 제출 (프로토타입: 파일명만 저장) */}
        {question.type === 'file_upload' && (() => {
          const file = (value && typeof value === 'object') ? value : null
          return (
            <div className="space-y-2">
              <label className={cn(
                'flex items-center gap-3 px-3 py-4 rounded-md border border-dashed transition-colors',
                file ? 'border-blue-200 bg-accent/40' : 'border-slate-200 bg-slate-50',
                !disabled && 'cursor-pointer hover:border-blue-300',
                disabled && 'cursor-default'
              )}>
                <input
                  type="file" disabled={disabled}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    onChange({ fileName: f.name, fileSize: f.size })
                  }}
                  className="hidden"
                />
                <div className="flex-1">
                  {file ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : '파일 선택됨'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700">파일을 선택하세요</p>
                      <p className="text-xs text-muted-foreground mt-0.5">허용 파일: PDF, DOC, DOCX, HWP, ZIP</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          )
        })()}
      </CardContent>

      {/* 답변 완료 표시 */}
      {isAnswered && !showAnswer && (
        <div className="px-5 py-2 bg-accent/60 border-t border-blue-100">
          <p className="text-xs flex items-center gap-1.5 text-primary">
            <CheckCircle2 size={11} />
            답변 완료
          </p>
        </div>
      )}

      {/* 정답 표시 (미리보기 모드 전용) */}
      {showAnswer && (() => {
        const hasAnswer = question.correctAnswer != null
          || (question.type === 'matching' && question.pairs?.length > 0)
          || (question.type === 'multiple_dropdowns' && question.dropdowns?.length > 0)
          || (question.type === 'formula' && question.formula)
        if (!hasAnswer) {
          return (
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-muted-foreground">정답 없음 (수동 채점 문항)</p>
            </div>
          )
        }
        return (
          <div className="px-5 py-2.5 bg-green-50 border-t border-green-200">
            <QuestionAnswer q={question} />
          </div>
        )
      })()}
    </Card>
  )
}

function ResultModal({ result, quiz, questions, onClose }) {
  const autoTotal = result.totalAutoScore
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)
  const autoMax = totalPoints > 0 ? totalPoints : result.totalPossibleAuto
  const hasAutoGrade = totalPoints > 0
  const scorePercent = hasAutoGrade ? Math.round((autoTotal / autoMax) * 100) : null

  const now = new Date()
  const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null

  // 학생 응답 조회 제어 (one_time_results)
  const oneTimeResults = !!quiz.oneTimeResults
  // 마운트 시점의 조회 여부를 고정해 첫 진입 시 정상 공개 보장
  const [initiallyViewed] = useState(() => isResultViewed(result.id))
  const responsesHidden = oneTimeResults && initiallyViewed

  useEffect(() => {
    if (oneTimeResults && !initiallyViewed) {
      markResultViewed(result.id)
    }
  }, [oneTimeResults, initiallyViewed, result.id])

  let showScoreNow, showWrongAnswerNow, showAnswerNow

  if (quiz.scoreRevealEnabled !== undefined) {
    const afterDue = dueDate && now >= dueDate
    const inPeriod = (() => {
      const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
      const e = quiz.scoreRevealEnd   ? new Date(quiz.scoreRevealEnd)   : null
      return (!s || now >= s) && (!e || now <= e)
    })()
    const timingMet = quiz.scoreRevealTiming === 'immediately' ? true
                    : quiz.scoreRevealTiming === 'after_due'   ? afterDue
                    : quiz.scoreRevealTiming === 'period'      ? inPeriod
                    : false
    const released = quiz.scoreRevealEnabled && timingMet
    showScoreNow       = released
    showWrongAnswerNow = released
    showAnswerNow      = released && quiz.scoreRevealScope === 'with_answer'
  } else if (quiz.scoreReleasePolicy !== undefined) {
    const policy = quiz.scoreReleasePolicy
    const afterDue = dueDate && now >= dueDate
    const inPeriod = (() => {
      const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
      const e = quiz.scoreRevealEnd   ? new Date(quiz.scoreRevealEnd)   : null
      return (!s || now >= s) && (!e || now <= e)
    })()
    const released = policy === 'wrong_only' || policy === 'with_answer' ? true
                   : policy === 'after_due'  ? afterDue
                   : policy === 'period'     ? inPeriod
                   : false
    showScoreNow       = released
    showWrongAnswerNow = released && policy !== null
    showAnswerNow      = released && (policy === 'with_answer' || policy === 'after_due' || policy === 'period')
  } else {
    const isTimingMet = (timing, start, end) => {
      if (timing === 'immediately') return true
      if (timing === 'after_due')   return dueDate && now >= dueDate
      if (timing === 'period') {
        const s = start ? new Date(start) : null
        const e = end   ? new Date(end)   : null
        return (!s || now >= s) && (!e || now <= e)
      }
      return false
    }
    showScoreNow       = quiz.showScore === undefined ? true
      : quiz.showScore && (
          (!quiz.scoreRevealStartDate || now >= new Date(quiz.scoreRevealStartDate)) &&
          (!quiz.scoreRevealEndDate   || now <= new Date(quiz.scoreRevealEndDate))
        )
    showWrongAnswerNow = quiz.showWrongAnswer &&
      isTimingMet(quiz.wrongAnswerRevealTiming, quiz.wrongAnswerRevealStart, quiz.wrongAnswerRevealEnd)
    showAnswerNow      = showWrongAnswerNow && quiz.showAnswer && (
      quiz.answerRevealTiming === 'same' ||
      isTimingMet(quiz.answerRevealTiming, quiz.answerRevealStart, quiz.answerRevealEnd)
    )
  }

  // oneTimeResults: 이미 1회 조회한 상태면 응답/정답 공개 차단 (점수는 별도 정책)
  if (responsesHidden) {
    showWrongAnswerNow = false
    showAnswerNow = false
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-5 text-center border-b border-gray-200">
          <CheckCircle2 size={30} strokeWidth={1.5} className="mx-auto mb-2.5 text-emerald-600" />
          <DialogHeader>
            <DialogTitle className="tracking-tight text-gray-900 text-center">
              {result.autoSubmitted ? '시간 종료 — 자동 제출되었습니다' : '제출 완료!'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 mt-1">{result.submittedAt}</p>
          {result.isLate && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle size={11} />
              지각 제출
            </span>
          )}
        </div>

        {/* 결과 */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="bg-gray-50 rounded-xl p-5 w-full">
            {/* 점수 */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">점수</p>
              {!hasAutoGrade ? (
                <p className="text-sm font-semibold text-gray-900">점수 없음</p>
              ) : showScoreNow ? (
                <p className="text-xl font-semibold text-gray-900 tracking-tight">
                  {autoTotal}<span className="text-[15px] font-normal ml-1 text-muted-foreground">/ {autoMax}점</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-900">
                  {quiz.showScore ? '공개 예정' : '점수 비공개'}
                </p>
              )}
            </div>
            {hasAutoGrade && showScoreNow && (
              <>
                <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 mt-2">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      scorePercent >= 80 ? 'bg-gray-900' : scorePercent >= 60 ? 'bg-gray-400' : 'bg-red-500'
                    )}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
                <p className="text-xs mt-1.5 text-right text-muted-foreground">{scorePercent}% 정답</p>
              </>
            )}
            {result.manualPending > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                서술형 {result.manualPending}개 문항은 채점이 완료되면 점수에 반영됩니다.
              </p>
            )}

            {/* 구분선 */}
            <div className="border-b border-gray-200 my-4" />

            {/* 응시 시간 */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">응시 시간</p>
              <p className="text-sm font-medium text-gray-900">
                {result.timeTaken != null ? `${result.timeTaken}분` : '시간 제한 없음'}
              </p>
            </div>

            {/* 문항 구성 */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-gray-500">문항 구성</p>
              <p className="text-sm font-medium text-gray-900">
                총 {questions.filter(q => q.type !== 'text').length}문항 ({questions.reduce((s, q) => s + (q.points || 0), 0)}점 만점)
              </p>
            </div>
          </div>

          {responsesHidden && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/70">
              <Eye size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-[15px] font-medium mb-0.5 text-gray-900">응답은 1회만 조회할 수 있습니다</p>
                <p className="text-xs text-gray-500">이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다.</p>
              </div>
            </div>
          )}

          {showWrongAnswerNow && (
            <div>
              <p className="text-[15px] font-medium mb-2.5 text-gray-900">문항별 채점 결과</p>
              <div className="space-y-1.5">
                {questions.map((q, idx) => {
                  const scored = result.autoScores[q.id]
                  const isAutoGraded = scored !== undefined
                  const isCorrect = isAutoGraded && scored === q.points
                  const isPartial = isAutoGraded && scored > 0 && scored < q.points
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-lg text-[15px] border border-gray-200 bg-white hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-medium shrink-0 text-muted-foreground">Q{idx + 1}</span>
                          <span className="text-xs truncate text-gray-600">{q.text}</span>
                        </div>
                        <span className={cn(
                          'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                          !isAutoGraded && 'bg-gray-100 text-muted-foreground',
                          isAutoGraded && isCorrect && 'bg-emerald-50 text-emerald-600',
                          isAutoGraded && isPartial && 'bg-amber-50 text-amber-600',
                          isAutoGraded && !isCorrect && !isPartial && 'bg-red-50 text-red-500',
                        )}>
                          {!isAutoGraded ? '채점 대기' : isCorrect ? '정답' : isPartial ? `부분점수 ${scored}/${q.points}` : '오답'}
                        </span>
                      </div>
                      {showAnswerNow && isAutoGraded && !isCorrect && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <QuestionAnswer q={q} />
                        </div>
                      )}
                      {(() => {
                        const showCorrect   = isAutoGraded && isCorrect && q.correct_comments
                        const showIncorrect = isAutoGraded && !isCorrect && q.incorrect_comments
                        const showNeutral   = !!q.neutral_comments
                        if (!showCorrect && !showIncorrect && !showNeutral) return null
                        return (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                            {showCorrect && (
                              <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200">
                                <span className="shrink-0 text-[11px] font-semibold text-emerald-700 mt-0.5">정답</span>
                                <p className="text-[13px] text-emerald-900 leading-relaxed whitespace-pre-wrap">{q.correct_comments}</p>
                              </div>
                            )}
                            {showIncorrect && (
                              <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-red-50 border border-red-200">
                                <span className="shrink-0 text-[11px] font-semibold text-red-600 mt-0.5">오답</span>
                                <p className="text-[13px] text-red-900 leading-relaxed whitespace-pre-wrap">{q.incorrect_comments}</p>
                              </div>
                            )}
                            {showNeutral && (
                              <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-200">
                                <span className="shrink-0 text-[11px] font-semibold text-gray-600 mt-0.5">코멘트</span>
                                <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">{q.neutral_comments}</p>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* 버튼 */}
        <div className="px-6 pb-5">
          <Button onClick={onClose} className="w-full gap-1">
            퀴즈 목록으로
            <ChevronRight size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
