import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { Clock, ChevronRight, CheckCircle2, AlertCircle, Send, Eye, X, Lock } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes, getQuizQuestions, autoGradeAnswer, saveStudentAttempt } from '../data/mockData'
import { useRole } from '../context/RoleContext'
import { AlertDialog } from '../components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const { role, currentStudent } = useRole()

  const quiz = mockQuizzes.find(q => q.id === id)
  const questions = getQuizQuestions(id)

  const noTimeLimit = quiz?.timeLimit === 0 || isPreview
  const isLate = !isPreview && !!quiz?.dueDate && new Date() > new Date(quiz.dueDate)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(noTimeLimit ? null : (quiz?.timeLimit ?? 30) * 60)
  const [alertDialog, setAlertDialog] = useState(null)
  const [showAnswerPreview, setShowAnswerPreview] = useState(false)

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
  }, [submitted])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== undefined).length

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
      timeTaken: noTimeLimit ? null : Math.ceil(((quiz?.timeLimit ?? 30) * 60 - (timeRemaining ?? 0)) / 60),
      autoSubmitted: auto,
      isLate: isLate || false,
      scorePolicy: quiz?.scorePolicy ?? '최고 점수 유지',
    }

    if (!isPreview) {
      try {
        saveStudentAttempt(id, attempt)
      } catch (err) {
        console.error('[xnquiz] 제출 저장 실패:', err)
        setAlertDialog({ title: '저장 실패', message: '응시 기록 저장에 실패했습니다.\n브라우저 저장 공간을 확인해주세요.', variant: 'error' })
      }
    }
    setResult(attempt)
  }, [answers, questions, id, currentStudent, timeRemaining, submitted, isPreview, isLate])

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

  // 지각 제출 검증: dueDate 경과 시 allowLateSubmit 정책 확인
  if (!isPreview && quiz && quiz.status === 'open' && quiz.dueDate && new Date() > new Date(quiz.dueDate)) {
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
                <p className="text-xs mb-0.5 text-muted-foreground">{quiz.week}주차 {quiz.session}차시 · {quiz.totalPoints}점</p>
                <h1 className="text-base font-bold">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-sm mt-1.5 text-slate-500">{quiz.description}</p>
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
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              value={answers[q.id] ?? ''}
              onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              disabled={submitted}
              showAnswer={isPreview && showAnswerPreview}
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
    </Layout>
  )
}

function QuestionCard({ question, index, value, onChange, disabled, showAnswer = false }) {
  const typeLabels = {
    multiple_choice: '객관식', true_false: '참/거짓', short_answer: '단답형',
    essay: '서술형', numerical: '수치형', fill_in_blank: '빈칸 채우기',
    multiple_answers: '복수 선택', ordering: '순서 배열',
  }
  const isAnswered = value !== '' && value !== undefined

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
        <p className="text-sm leading-relaxed mb-4">{question.text}</p>

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
              const selected = value ? value.split(',').map(s => s.trim()).includes(choice) : false
              const toggle = () => {
                if (disabled) return
                const current = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
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
            type="text" value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요" disabled={disabled}
            className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
          />
        )}

        {question.type === 'essay' && (
          <textarea
            value={value} onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요" rows={5} disabled={disabled}
            className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-none disabled:bg-muted"
          />
        )}

        {question.type === 'numerical' && (
          <input
            type="number" value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="숫자를 입력하세요" disabled={disabled}
            className="w-full max-w-[200px] text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all disabled:bg-muted"
          />
        )}
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
      {showAnswer && question.correctAnswer != null && (
        <div className="px-5 py-2.5 bg-green-50 border-t border-green-200">
          <p className="text-xs font-medium text-green-700">
            정답:&nbsp;
            <span className="font-semibold">
              {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : String(question.correctAnswer)}
            </span>
          </p>
        </div>
      )}
      {showAnswer && question.correctAnswer == null && (
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-muted-foreground">정답 없음 (수동 채점 문항)</p>
        </div>
      )}
    </Card>
  )
}

function ResultModal({ result, quiz, questions, onClose }) {
  const autoTotal = result.totalAutoScore
  const totalPoints = quiz.totalPoints || questions.reduce((s, q) => s + q.points, 0)
  const autoMax = totalPoints > 0 ? totalPoints : result.totalPossibleAuto
  const hasAutoGrade = (quiz.totalPoints || questions.reduce((s, q) => s + q.points, 0)) > 0
  const scorePercent = hasAutoGrade ? Math.round((autoTotal / autoMax) * 100) : null

  const now = new Date()
  const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null

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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-5 text-center border-b border-gray-200">
          <CheckCircle2 size={30} strokeWidth={1.5} className="mx-auto mb-2.5 text-emerald-600" />
          <DialogHeader>
            <DialogTitle className="text-base font-semibold tracking-tight text-gray-900 text-center">
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
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">자동채점 결과</p>
              {!hasAutoGrade ? (
                <p className="text-sm text-muted-foreground">점수 없음</p>
              ) : showScoreNow ? (
                <p className="text-xl font-semibold text-gray-900 tracking-tight">
                  {autoTotal}<span className="text-sm font-normal ml-1 text-muted-foreground">/ {autoMax}점</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {quiz.showScore ? '공개 예정' : '점수 비공개'}
                </p>
              )}
            </div>
            {hasAutoGrade && showScoreNow && (
              <>
                <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
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
          </div>

          {result.manualPending > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <div>
                <p className="text-xs font-medium mb-0.5 text-gray-900">수동채점 대기 중</p>
                <p className="text-xs text-gray-500">
                  서술형 {result.manualPending}개 문항은 교수자 채점 후 최종 점수가 확정됩니다.
                </p>
              </div>
            </div>
          )}

          {showWrongAnswerNow && (
            <div>
              <p className="text-sm font-medium mb-2.5 text-gray-900">문항별 채점 결과</p>
              <div className="space-y-1.5">
                {questions.map((q, idx) => {
                  const scored = result.autoScores[q.id]
                  const isAutoGraded = scored !== undefined
                  const isCorrect = isAutoGraded && scored === q.points
                  const isPartial = isAutoGraded && scored > 0 && scored < q.points
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50/50 transition-colors"
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
                      {showAnswerNow && isAutoGraded && !isCorrect && q.correctAnswer && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-muted-foreground">
                            정답: <span className="font-medium text-gray-700">
                              {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>{result.timeTaken != null ? `응시시간 ${result.timeTaken}분` : '시간 제한 없음'}</span>
            <span>총 {quiz.questions}문항 · {quiz.totalPoints}점 만점</span>
          </div>
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
