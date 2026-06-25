import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { Clock, ChevronRight, ChevronLeft, CheckCircle2, Check, AlertCircle, Send, X, Lock } from 'lucide-react'
import { mockQuizzes, getQuizQuestions as mockGetQuestions, autoGradeAnswer, saveStudentAttempt } from '../data/mockData'
import { getQuiz, getQuizQuestions, startAttempt, saveAnswers, submitAttempt } from '@/lib/data'
import { useRole } from '../context/role'
import { useQuestionBank } from '../context/questionBank'
import { expandRandomGroups } from '@/utils/randomGroups'

const DATA_MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
import { AlertDialog, ConfirmDialog } from '../components/ConfirmDialog'
import PreflightGate, { SecurityActiveBadges } from '../components/PreflightGate'
import { isLateSubmission } from '../utils/deadlineUtils'
import { getAccommodation, getEffectiveTimeLimit, formatAccommodationLabel } from '@/utils/quizGlobalSettings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RichTextRenderer } from '../components/RichText'
import { generateStudentVariables } from '@/utils/formulaEngine'
import { computeRevealStatus } from '@/utils/scoreReveal'
import {
  buildAttemptSessionKey,
  loadAttemptSession,
  saveAttemptSession,
  clearAttemptSession,
  buildAttemptSnapshotKey,
  loadAttemptSnapshot,
  saveAttemptSnapshot,
  clearAttemptSnapshot,
  AUTOSAVE_INTERVAL_MS,
} from '@/utils/autosave'
import {
  buildActivityLogKey,
  appendActivityLog,
  ACTIVITY_TYPES,
} from '@/utils/activityLog'
import { parseInlineBody, hasInlinePlaceholders } from '@/utils/placeholderUtils'

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

// 자동 제출 비활성화 ON 시, 시간 만료 후 학생 수동 제출 grace 시간 (초). 이후 강제 자동 제출
const GRACE_AFTER_TIMEOUT_SEC = 300

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const { role, currentStudent } = useRole()

  const { getBankQuestions } = useQuestionBank() ?? {}
  const [quiz, setQuiz] = useState(() => mockQuizzes.find(q => q.id === id) ?? null)
  const [rawItems, setRawItems] = useState(() => DATA_MODE === 'mock' ? mockGetQuestions(id) : [])
  const [loaded, setLoaded] = useState(DATA_MODE === 'mock')
  const [apiAttemptId, setApiAttemptId] = useState(null)

  // 랜덤 출제 그룹은 학생별 시드로 매 응시 동일하게 결정 (새로고침/재접속 시 동일 문항 유지)
  const seedKey = useMemo(() => {
    if (isPreview) return `preview_${currentStudent?.id ?? 'anon'}_${id}`
    return `${currentStudent?.id ?? 'anon'}_${id}`
  }, [isPreview, currentStudent?.id, id])

  // 응시본(동결된 문제지) 키 — 첫 문항 진입 시 동결되어 저장된다 (D-09 R-008, D-02 R-011).
  const snapshotKey = !isPreview ? buildAttemptSnapshotKey(id, currentStudent?.id) : null
  // 동결본이 있으면 live 문항에서 재파생하지 않고 그대로 사용해 교수자 수정·재추첨 영향을 차단한다.
  const [frozenQuestions, setFrozenQuestions] = useState(() => loadAttemptSnapshot(snapshotKey))
  const questions = useMemo(
    () => frozenQuestions ?? expandRandomGroups(rawItems, seedKey, getBankQuestions),
    [frozenQuestions, rawItems, seedKey, getBankQuestions]
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [q, qs] = await Promise.all([getQuiz(id), getQuizQuestions(id)])
        if (!mounted) return
        if (q) setQuiz(q)
        setRawItems(qs)
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

  // 응시 편의 지원 (Accommodation, 7.7): 현재 학생의 추가 시간 비율을 제한 시간에 반영. 미리보기는 미적용.
  const accommodation = !isPreview ? getAccommodation(currentStudent?.id) : null
  const effectiveTimeLimit = useMemo(
    () => (isPreview ? quiz?.timeLimit : getEffectiveTimeLimit(quiz?.timeLimit, currentStudent?.id)),
    [quiz?.timeLimit, currentStudent?.id, isPreview]
  )

  // 응시 세션 복원 (Canvas 스펙: 새로고침/재접속 시 중단 지점에서 재개)
  const oneAtATime = !!quiz?.oneQuestionAtATime
  const lockAfter = oneAtATime && !!quiz?.lockAfterAnswer
  const sessionKey = !isPreview ? buildAttemptSessionKey(id, currentStudent?.id) : null
  const activityKey = !isPreview ? buildActivityLogKey(id, currentStudent?.id) : null
  const restored = loadAttemptSession(sessionKey)

  const [answers, setAnswers] = useState(restored?.answers ?? {})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [consentGiven, setConsentGiven] = useState(false)
  // XQ-D-09 R-001: 액세스 코드 게이트
  const [accessCodeOk, setAccessCodeOk] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState(false)
  // XQ-D-09 R-005: 제출 확인 다이얼로그
  const [submitConfirm, setSubmitConfirm] = useState(false)
  const [startedAt] = useState(() => restored?.startedAt ?? Date.now())
  const computeRemaining = () => {
    if (noTimeLimit) return null
    const total = (effectiveTimeLimit ?? 30) * 60
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, total - elapsed)
  }
  const [timeRemaining, setTimeRemaining] = useState(computeRemaining)
  // 자동 제출 비활성화 ON + 시간 만료 후 grace 카운트다운. null = 미적용 (토글 OFF 또는 noTimeLimit)
  const computeGraceRemaining = () => {
    if (noTimeLimit || !quiz?.disableAutoSubmit) return null
    const remaining = computeRemaining()
    if (remaining > 0) return GRACE_AFTER_TIMEOUT_SEC
    const expirationAt = startedAt + (effectiveTimeLimit ?? 30) * 60 * 1000
    const graceEndAt = expirationAt + GRACE_AFTER_TIMEOUT_SEC * 1000
    return Math.max(0, Math.floor((graceEndAt - Date.now()) / 1000))
  }
  const [graceRemaining, setGraceRemaining] = useState(computeGraceRemaining)
  const [alertDialog, setAlertDialog] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(restored?.savedAt ?? null)
  const [saveError, setSaveError] = useState(null) // 'quota' | 'error' | null

  const [currentIndex, setCurrentIndex] = useState(restored?.currentIndex ?? 0)
  const [lockConfirm, setLockConfirm] = useState(false)
  const [blankSkipConfirm, setBlankSkipConfirm] = useState(false)
  const [startNotice, setStartNotice] = useState(() => lockAfter && !restored && !isPreview)

  // 게이트 판정 (응시 진입 가드 + 응시본 동결 시점 공용 기준)
  const hasSecurity = !isPreview && (quiz?.securityTrustLock || quiz?.securityAiProctoring || quiz?.securityRequireConsent)
  const needsAccessCode = !isPreview && !submitted && !!quiz?.accessCode && !accessCodeOk

  // 첫 문항 진입 = 모든 게이트 통과. 응시본 동결 시점이자 "응시자" 판정 기준 (D-02 R-011, D-09 R-008).
  const blockedBeforeStart = !isPreview && quiz?.status === 'open' && !!quiz?.startDate && new Date() < new Date(quiz.startDate)
  const blockedLate = !isPreview && quiz?.status === 'open' && isLateSubmission(quiz) &&
    (!quiz?.allowLateSubmit || (!!quiz?.lateSubmitDeadline && new Date() > new Date(quiz.lateSubmitDeadline)))
  const atFirstQuestion =
    loaded && !isPreview && !submitted &&
    !!quiz && quiz.status === 'open' && questions.length > 0 &&
    !blockedBeforeStart && !blockedLate &&
    !needsAccessCode &&
    !(hasSecurity && !consentGiven && !restored) &&
    !startNotice

  // 응시본 동결 (D-09 R-008, D-02 R-011): 첫 문항 진입 시 현재 출제본을 깊은 복사로 동결·저장.
  // 이후 교수자 문항 수정·재추첨이 응시 중/재진입 화면·채점에 영향을 주지 않는다. 미리보기는 동결하지 않는다.
  useEffect(() => {
    if (!atFirstQuestion || frozenQuestions || !snapshotKey) return
    const snapshot = JSON.parse(JSON.stringify(questions))
    setFrozenQuestions(snapshot)
    saveAttemptSnapshot(snapshotKey, snapshot)
  }, [atFirstQuestion, frozenQuestions, snapshotKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
          if (!quiz?.disableAutoSubmit) handleSubmit(true)
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
  // disableAutoSubmit ON: 시간 만료 후 5분 grace 까지는 수동 제출 대기, 그 후 강제 자동 제출
  useEffect(() => {
    if (!loaded || submitted || noTimeLimit || isPreview) return
    if (timeRemaining > 0) return
    if (!quiz?.disableAutoSubmit) {
      handleSubmit(true)
    } else if (graceRemaining === 0) {
      handleSubmit(true)
    }
  }, [loaded, submitted, noTimeLimit, isPreview, timeRemaining, quiz?.disableAutoSubmit, graceRemaining]) // eslint-disable-line react-hooks/exhaustive-deps

  // 자동 제출 비활성화 ON + 시간 만료 후 grace 카운트다운 (1초 단위)
  useEffect(() => {
    if (submitted || noTimeLimit || isPreview) return
    if (!quiz?.disableAutoSubmit) return
    if (timeRemaining > 0) return
    if (graceRemaining === null || graceRemaining <= 0) return
    const timer = setInterval(() => {
      setGraceRemaining(prev => {
        if (prev === null) return prev
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return Math.max(0, prev - 1)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitted, noTimeLimit, isPreview, quiz?.disableAutoSubmit, timeRemaining, graceRemaining])

  // Canvas 정책: lockDate(lock_at) 도래 시 열려있는 attempt 자동 제출
  // 응시 중 lockDate 가 지나면 답안을 날리지 않고 즉시 제출 처리
  useEffect(() => {
    if (!loaded || submitted || isPreview || !quiz?.lockDate) return
    const lockTime = new Date(quiz.lockDate).getTime()
    const now = Date.now()
    if (now >= lockTime) {
      // 응시 중이던 세션만 자동 제출 (진입 전이라면 아래 차단 화면이 표시됨)
      if (restored) handleSubmit(true)
      return
    }
    const timer = setTimeout(() => handleSubmit(true), lockTime - now)
    return () => clearTimeout(timer)
  }, [loaded, submitted, isPreview, quiz, restored]) // eslint-disable-line react-hooks/exhaustive-deps

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
        return noTimeLimit ? elapsed : Math.min(effectiveTimeLimit ?? elapsed, elapsed)
      })(),
      autoSubmitted: auto,
      isLate: isLate || false,
      scorePolicy: quiz?.scorePolicy ?? '최고 점수 유지',
      // 응시본(동결된 문제지) 동봉 — 결과 화면·재채점이 이 학생이 받은 문항 기준으로 동작 (D-09 R-006·R-008)
      quizSnapshot: questions,
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
      clearAttemptSnapshot(snapshotKey)
      dirtyRef.current = false
      if (activityKey) appendActivityLog(activityKey, { type: ACTIVITY_TYPES.SUBMIT, auto })
    }
    setResult(attempt)
  }, [answers, questions, id, currentStudent, timeRemaining, submitted, isPreview, isLate, sessionKey, activityKey, apiAttemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPreview && role !== 'student') return <Navigate to="/" replace />

  // 응시 중 lockDate 가 지나면 위 useEffect 가 자동 제출 → submitted=true 이후
  // 결과 모달이 뜸. 아래 차단 화면은 '첫 진입인데 이미 만료' 케이스 전용.
  if (!isPreview && !submitted && quiz && quiz.lockDate && new Date() > new Date(quiz.lockDate) && !restored) {
    return (
      <>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <Lock size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base font-semibold mb-1 text-secondary-foreground">이용이 종료되었습니다</p>
          <p className="text-sm mb-5 text-muted-foreground">이용 종료 일시가 지나 퀴즈에 접근할 수 없습니다</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </>
    )
  }

  if (!isPreview && quiz && quiz.status === 'open' && quiz.startDate && new Date() < new Date(quiz.startDate)) {
    return (
      <>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <Clock size={36} className="mx-auto mb-3 text-warning" />
          <p className="text-base font-semibold mb-1 text-secondary-foreground">응시 시작 전입니다</p>
          <p className="text-sm mb-5 text-muted-foreground">{quiz.startDate}부터 응시할 수 있습니다</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </>
    )
  }

  if (!isPreview && quiz && quiz.status !== 'open') {
    const statusMsg = {
      draft: '아직 공개되지 않은 퀴즈입니다.',
      grading: '채점 중인 퀴즈로 응시가 마감되었습니다.',
      closed: '종료된 퀴즈입니다.',
    }[quiz.status] ?? '현재 응시할 수 없는 퀴즈입니다.'
    return (
      <>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <AlertCircle size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base font-semibold mb-1 text-secondary-foreground">응시 불가</p>
          <p className="text-sm mb-5 text-muted-foreground">{statusMsg}</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            퀴즈 목록으로
          </Button>
        </div>
      </>
    )
  }

  // 지각 제출 검증: dueDate + gracePeriod 경과 시 allowLateSubmit 정책 확인
  if (!isPreview && quiz && quiz.status === 'open' && isLateSubmission(quiz)) {
    const lateDeadlinePassed = quiz.allowLateSubmit && quiz.lateSubmitDeadline && new Date() > new Date(quiz.lateSubmitDeadline)
    if (!quiz.allowLateSubmit || lateDeadlinePassed) {
      return (
        <>
          <div className="max-w-2xl mx-auto py-16 text-center">
            <Clock size={36} className="mx-auto mb-3 text-destructive" />
            <p className="text-base font-semibold mb-1 text-secondary-foreground">
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
        </>
      )
    }
  }

  if (!loaded) {
    return (
      <>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-sm text-muted-foreground">불러오는 중</p>
        </div>
      </>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-sm text-muted-foreground">해당 퀴즈를 찾을 수 없거나 응시 가능한 문항이 없습니다.</p>
        </div>
      </>
    )
  }

  // 액세스 코드 게이트 (XQ-D-09 R-001) — 코드 설정 시 응시 진입 전 코드 입력 요구.
  // 재진입(이어서 응시) 시에도 코드를 재확인한다. accessCodeOk(이번 세션 통과)면 통과.
  // needsAccessCode 는 상단에서 hoist 됨 (응시본 동결 게이트와 공용).
  if (needsAccessCode) {
    const submitCode = () => {
      if (codeInput.trim() === String(quiz.accessCode).trim()) {
        setAccessCodeOk(true)
        setCodeError(false)
      } else {
        setCodeError(true)
      }
    }
    return (
      <>
        <div className="max-w-md mx-auto py-16">
          <div className="text-center mb-6">
            <Lock size={36} className="mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-base font-semibold mb-1 text-secondary-foreground">액세스 코드 입력</p>
            <p className="text-sm text-muted-foreground">이 퀴즈는 응시하려면 액세스 코드가 필요합니다</p>
          </div>
          <input
            type="text"
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value); setCodeError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') submitCode() }}
            placeholder="액세스 코드"
            autoFocus
            className={cn(
              'w-full text-sm px-3.5 py-2.5 rounded-md border bg-white focus:outline-none focus:ring-2 transition-all',
              codeError ? 'border-destructive focus:ring-red-100 focus:border-destructive' : 'border-border focus:ring-blue-100 focus:border-primary'
            )}
          />
          {codeError && <p className="text-xs mt-1.5 text-destructive">코드가 올바르지 않습니다</p>}
          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">퀴즈 목록으로</Button>
            <Button onClick={submitCode} disabled={!codeInput.trim()} className="flex-1">확인</Button>
          </div>
        </div>
      </>
    )
  }

  // 보안/감독 게이트 — 보안 옵션 활성 시 응시 진입 직전 안내 + 동의 (hasSecurity 는 상단 hoist)
  if (hasSecurity && !consentGiven && !submitted && !restored) {
    return (
      <PreflightGate
        quiz={quiz}
        onConsent={() => setConsentGiven(true)}
        onCancel={() => navigate('/')}
      />
    )
  }

  return (
    <>
      <div className="max-w-3xl mx-auto pb-6">

        {/* 자동 저장 실패 배너 */}
        {saveError && !submitted && (
          <div className="px-4 py-3 rounded-lg mb-5 bg-destructive-soft border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-destructive">자동 저장 실패</p>
                <p className="text-xs mt-0.5 text-destructive">
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
          <div className="px-4 py-3 rounded-lg mb-5 bg-warning-bg border border-warning-border">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-warning shrink-0" />
              <span className="text-sm font-semibold text-warning-foreground">지각 제출</span>
              <span className="text-xs text-warning-foreground">마감일({quiz.dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다.</span>
            </div>
            {quiz.lateSubmitDeadline && (
              <p className="text-xs text-warning mt-1.5 ml-[23px]">지각 제출 마감: {quiz.lateSubmitDeadline.replace('T', ' ')}</p>
            )}
          </div>
        )}

        {/* 미리보기 배너 */}
        {isPreview && (
          <div className="px-4 py-3 rounded-lg mb-5 bg-warning-bg border border-warning-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-warning-foreground">미리보기 모드</p>
                <p className="text-xs text-warning-foreground mt-1">학생에게 보이는 실제 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="shrink-0 border-warning-border text-warning-foreground hover:bg-warning-bg"
              >
                <X size={14} />
                미리보기 종료
              </Button>
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
                  <p className="text-sm mt-1.5 text-muted-foreground">{quiz.description}</p>
                )}
                {hasSecurity && (
                  <SecurityActiveBadges quiz={quiz} />
                )}
                {!isPreview && !submitted && lastSavedAt && !saveError && (
                  <p className="text-[11px] mt-2 text-muted-foreground inline-flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-success" />
                    자동 저장됨 · {new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {noTimeLimit ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold bg-muted text-secondary-foreground border border-border">
                    <Clock size={13} />
                    제한 없음
                  </div>
                ) : timeRemaining === 0 && quiz?.disableAutoSubmit ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold bg-destructive-soft text-destructive border border-red-200">
                    <Clock size={13} />
                    시간 종료, {formatTime(graceRemaining ?? 0)} 내 제출
                  </div>
                ) : (
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold border',
                    timeRemaining < 300 ? 'bg-destructive-soft text-destructive border-red-200' : 'bg-muted text-secondary-foreground border-border'
                  )}>
                    <Clock size={13} />
                    {formatTime(timeRemaining)}
                  </div>
                )}
                {accommodation && !noTimeLimit && effectiveTimeLimit > quiz.timeLimit && (
                  <span className="text-[11px] text-primary bg-accent px-2 py-0.5 rounded-md inline-flex items-center gap-1 whitespace-nowrap">
                    응시 편의 지원 {formatAccommodationLabel(accommodation)} · {effectiveTimeLimit}분
                  </span>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground">답변 완료</span>
                  <span className={cn('text-sm font-bold', answeredCount === questions.length ? 'text-success-foreground' : '')}>
                    {answeredCount}<span className="text-xs font-normal text-muted-foreground">/{questions.length}</span>
                  </span>
                </div>
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
                <span className="inline-flex items-center gap-1 text-xs text-warning-foreground">
                  <Lock size={11} />
                  응답 후에는 이전 문항으로 돌아갈 수 없습니다
                </span>
              )}
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-secondary mb-4">
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
                  <Button onClick={() => setSubmitConfirm(true)}>
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
                <Button onClick={() => setSubmitConfirm(true)}>
                  <Send size={14} />
                  제출하기
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 제출 완료 결과 모달 */}
      {result && (
        <ResultModal
          result={result}
          quiz={quiz}
          questions={questions}
          onClose={() => navigate('/')}
          onViewDetail={() => navigate(`/quiz/${id}`)}
        />
      )}
      {alertDialog && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          variant={alertDialog.variant}
          onClose={() => setAlertDialog(null)}
        />
      )}
      {submitConfirm && (() => {
        const unanswered = questions.filter(q => q.type !== 'text').length - answeredCount
        return (
          <ConfirmDialog
            title="퀴즈를 제출할까요?"
            message={unanswered > 0
              ? `아직 답변하지 않은 문항이 ${unanswered}개 있습니다.\n제출 후에는 답변을 수정할 수 없습니다.`
              : '제출 후에는 답변을 수정할 수 없습니다.'}
            confirmLabel="제출하기"
            cancelLabel="돌아가기"
            confirmDanger={unanswered > 0}
            onConfirm={() => { setSubmitConfirm(false); handleSubmit(false) }}
            onCancel={() => setSubmitConfirm(false)}
          />
        )
      })()}
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
    </>
  )
}

function QuestionCard({ question, index, value, onChange, disabled, studentId }) {
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
      <Card className="overflow-hidden border-border">
        <CardContent className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-0">안내</Badge>
          </div>
          <RichTextRenderer html={question.text} className="text-sm leading-relaxed text-secondary-foreground" />
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
          <span className="text-xs font-semibold shrink-0 text-secondary-foreground">{question.points}점</span>
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
          <RichTextRenderer html={question.text} className="text-sm leading-relaxed mb-4 block" />
        )}

        {/* 객관식 / 참거짓 (문제은행 문항은 choices 대신 options 를 쓰므로 흡수, 참거짓은 기본 보기 제공) */}
        {(question.type === 'multiple_choice' || question.type === 'true_false') && (
          <div className="space-y-2">
            {(question.choices ?? question.options ?? (question.type === 'true_false' ? ['참', '거짓'] : [])).map((choice, i) => (
              <label
                key={i}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-md border transition-colors',
                  value === choice ? 'bg-accent border-blue-200' : 'bg-white border-border',
                  !disabled && 'cursor-pointer hover:border-blue-200',
                  disabled && 'cursor-default'
                )}
              >
                <input
                  type="radio" name={question.id} value={choice}
                  checked={value === choice}
                  onChange={() => !disabled && onChange(choice)}
                  className="accent-primary mt-0.5 shrink-0" disabled={disabled}
                />
                <div className="flex-1 min-w-0">
                  <RichTextRenderer html={choice} className="text-sm text-secondary-foreground" />
                </div>
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
                    'flex items-start gap-3 px-3 py-2.5 rounded-md border transition-colors',
                    selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-border',
                    !disabled && 'cursor-pointer hover:border-blue-200',
                    disabled && 'cursor-default'
                  )}
                >
                  <input type="checkbox" checked={selected} onChange={toggle} className="accent-blue-500 mt-0.5 shrink-0" disabled={disabled} />
                  <div className="flex-1 min-w-0">
                    <RichTextRenderer html={choice} className="text-sm text-secondary-foreground" />
                  </div>
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
                <div className="inline-flex flex-wrap gap-2 text-xs text-muted-foreground px-3 py-2 rounded-md bg-secondary border border-border">
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
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-white">
                  <span className="text-sm text-secondary-foreground flex-1 truncate">{p.left}</span>
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
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-white">
                  {dd.label && <span className="text-sm font-medium text-secondary-foreground flex-shrink-0">{dd.label}</span>}
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
                file ? 'border-blue-200 bg-accent/40' : 'border-border bg-secondary',
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
                      <p className="text-sm text-secondary-foreground">파일을 선택하세요</p>
                      <p className="text-xs text-muted-foreground mt-0.5">허용 파일: PDF, DOC, DOCX, HWP, ZIP</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

function ResultModal({ result, quiz, questions, onClose, onViewDetail }) {
  const autoTotal = result.totalAutoScore
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)
  const autoMax = totalPoints > 0 ? totalPoints : result.totalPossibleAuto
  const hasAutoGrade = totalPoints > 0

  const { showScore: showScoreNow } = computeRevealStatus(quiz)

  const totalQuestions = questions.filter(q => q.type !== 'text').length
  const totalPointsSum = questions.reduce((s, q) => s + (q.points || 0), 0)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white gap-0">
        {/* 상단 영역 */}
        <div className="pt-7 px-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center w-10 h-10 rounded-full bg-primary">
            <Check size={20} strokeWidth={2.5} className="text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="!text-2xl !font-semibold !leading-tight text-foreground text-center">
              {result.autoSubmitted ? '시간이 종료되어 자동 제출되었습니다' : '제출 완료!'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1.5">{result.submittedAt}</p>
          {result.isLate && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-semibold bg-warning-bg text-warning-foreground border border-warning-border">
              <AlertCircle size={11} />
              지각 제출
            </span>
          )}
        </div>

        {/* 본문 */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="mt-4 border-t border-border" />

          {/* 점수 영역 */}
          <div className="px-6 pt-5">
            <div className="flex items-center justify-center gap-3 py-3.5 px-4 rounded-lg bg-accent">
              <span className="text-[15px] text-muted-foreground">점수</span>
              {!hasAutoGrade ? (
                <span className="text-[15px] font-medium text-foreground">점수 없음</span>
              ) : showScoreNow ? (
                <span className="text-[17px] font-semibold text-foreground tracking-tight">
                  {autoTotal} / {autoMax}
                </span>
              ) : (
                <span className="text-[15px] font-semibold text-primary">공개 예정</span>
              )}
            </div>
            {result.manualPending > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                서술형 {result.manualPending}개 문항은 채점이 완료되면 점수에 반영됩니다.
              </p>
            )}
          </div>

          {/* 메타 정보 3열 */}
          <div className="grid grid-cols-3 pt-4 px-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[15px] font-medium text-foreground leading-tight">
                {result.timeTaken != null ? `${result.timeTaken}분` : '-'}
              </span>
              <span className="text-[11px] text-muted-foreground">응시 시간</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[15px] font-medium text-foreground leading-tight">
                {totalQuestions}문항
              </span>
              <span className="text-[11px] text-muted-foreground">출제 수</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[15px] font-medium text-foreground leading-tight">
                {totalPointsSum}점
              </span>
              <span className="text-[11px] text-muted-foreground">만점</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 mx-6 mb-6 space-y-2">
            <Button onClick={onViewDetail} className="w-full gap-1">
              결과 자세히 보기
              <ChevronRight size={14} />
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full">
              퀴즈 목록으로
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
