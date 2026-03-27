import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes, getQuizQuestions, autoGradeAnswer, saveStudentAttempt } from '../data/mockData'
import { useRole } from '../context/RoleContext'

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role, currentStudent } = useRole()

  const quiz = mockQuizzes.find(q => q.id === id)
  const questions = getQuizQuestions(id)

  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState((quiz?.timeLimit ?? 30) * 60) // 초 단위

  // 학생 모드가 아니면 홈으로
  useEffect(() => {
    if (role !== 'student') navigate('/', { replace: true })
  }, [role])

  // 타이머
  useEffect(() => {
    if (submitted || timeRemaining <= 0) return
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

    // 자동채점
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
      timeTaken: Math.ceil(((quiz?.timeLimit ?? 30) * 60 - timeRemaining) / 60),
      autoSubmitted: auto,
      scorePolicy: quiz?.scorePolicy ?? '최고 점수 유지',
    }

    try {
      saveStudentAttempt(id, attempt)
    } catch (err) {
      console.error('[xnquiz] 제출 저장 실패:', err)
      alert('응시 기록 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.')
    }
    setResult(attempt)
  }, [answers, questions, id, currentStudent, timeRemaining, submitted])

  if (!quiz || questions.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-sm" style={{ color: '#9E9E9E' }}>해당 퀴즈를 찾을 수 없거나 응시 가능한 문항이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout breadcrumbs={[{ label: '퀴즈 참여', href: '/' }, { label: quiz.title }]}>
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-6">

        {/* 퀴즈 헤더 */}
        <div className="card p-4 mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs mb-0.5" style={{ color: '#9E9E9E' }}>{quiz.week}주차 {quiz.session}차시 · {quiz.totalPoints}점</p>
            <h1 className="text-[15px] font-bold truncate" style={{ color: '#222222' }}>{quiz.title}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <p className="text-xs mb-0.5" style={{ color: '#9E9E9E' }}>답변 완료</p>
              <p className="text-[15px] font-bold" style={{ color: answeredCount === questions.length ? '#018600' : '#222222' }}>
                {answeredCount}<span className="text-xs font-normal" style={{ color: '#9E9E9E' }}>/{questions.length}</span>
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-bold"
              style={{
                background: timeRemaining < 300 ? '#FFF5F5' : '#F5F5F5',
                color: timeRemaining < 300 ? '#BF0A03' : '#424242',
                border: `1px solid ${timeRemaining < 300 ? '#FFBFBF' : '#E0E0E0'}`,
              }}
            >
              <Clock size={13} />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

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
            />
          ))}
        </div>

        {/* 제출 버튼 */}
        {!submitted && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs" style={{ color: '#9E9E9E' }}>
              {questions.length - answeredCount > 0
                ? `${questions.length - answeredCount}개 문항이 미답변 상태입니다.`
                : '모든 문항에 답변했습니다.'}
            </p>
            <button
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold text-white transition-colors"
              style={{ background: '#4f46e5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
            >
              <Send size={14} />
              제출하기
            </button>
          </div>
        )}
      </div>

      {/* 제출 완료 결과 모달 */}
      {result && <ResultModal result={result} quiz={quiz} questions={questions} onClose={() => navigate('/')} />}
    </Layout>
  )
}

function QuestionCard({ question, index, value, onChange, disabled }) {
  const typeLabels = {
    multiple_choice: '객관식', true_false: '참/거짓', short_answer: '단답형',
    essay: '서술형', numerical: '수치형', fill_in_blank: '빈칸 채우기',
    multiple_answers: '복수 선택', ordering: '순서 배열',
  }
  const isAnswered = value !== '' && value !== undefined

  return (
    <div
      className="card overflow-hidden"
      style={isAnswered && !disabled ? { borderColor: '#c7d2fe' } : {}}
    >
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#9E9E9E' }}>Q{index + 1}</span>
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: '#EEF2FF', color: '#4f46e5' }}
            >
              {typeLabels[question.type] ?? question.type}
            </span>
          </div>
          <span className="text-xs font-semibold shrink-0" style={{ color: '#616161' }}>{question.points}점</span>
        </div>
        <p className="text-[14px] leading-relaxed mb-4" style={{ color: '#222222' }}>{question.text}</p>

        {/* 입력 영역 */}
        {(question.type === 'multiple_choice' || question.type === 'true_false') && (
          <div className="space-y-2">
            {question.choices.map((choice, i) => (
              <label
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
                style={{
                  background: value === choice ? '#EEF2FF' : '#FAFAFA',
                  border: `1px solid ${value === choice ? '#c7d2fe' : '#EEEEEE'}`,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={choice}
                  checked={value === choice}
                  onChange={() => !disabled && onChange(choice)}
                  className="accent-indigo-600"
                  disabled={disabled}
                />
                <span className="text-sm" style={{ color: '#424242' }}>{choice}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'short_answer' && (
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요"
            disabled={disabled}
            className="w-full input text-sm"
          />
        )}

        {question.type === 'essay' && (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="답안을 입력하세요"
            rows={5}
            disabled={disabled}
            className="w-full input text-sm resize-none"
          />
        )}

        {question.type === 'numerical' && (
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="숫자를 입력하세요"
            disabled={disabled}
            className="w-full input text-sm"
            style={{ maxWidth: 200 }}
          />
        )}
      </div>

      {/* 답변 완료 표시 */}
      {isAnswered && (
        <div className="px-5 py-2" style={{ background: '#F5F7FF', borderTop: '1px solid #E8EBFF' }}>
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: '#4f46e5' }}>
            <CheckCircle2 size={11} />
            답변 완료
          </p>
        </div>
      )}
    </div>
  )
}

function ResultModal({ result, quiz, questions, onClose }) {
  const autoTotal = result.totalAutoScore
  const autoMax = result.totalPossibleAuto
  const scorePercent = Math.round((autoTotal / autoMax) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-5 text-center" style={{ background: '#EEF2FF', borderBottom: '1px solid #c7d2fe' }}>
          <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#4f46e5' }} />
          <h2 className="text-lg font-bold mb-1" style={{ color: '#222222' }}>
            {result.autoSubmitted ? '시간 종료 — 자동 제출되었습니다' : '제출 완료!'}
          </h2>
          <p className="text-xs" style={{ color: '#6366f1' }}>{result.submittedAt}</p>
        </div>

        {/* 결과 */}
        <div className="px-6 py-5 space-y-4">
          {/* 자동채점 결과 */}
          <div className="p-4 rounded-lg" style={{ background: '#F5F5F5' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: '#424242' }}>자동채점 결과</p>
              <p className="text-xl font-bold" style={{ color: '#4f46e5' }}>
                {autoTotal}<span className="text-sm font-normal ml-1" style={{ color: '#9E9E9E' }}>/ {autoMax}점</span>
              </p>
            </div>
            <div className="h-2 rounded overflow-hidden" style={{ background: '#E0E0E0' }}>
              <div
                className="h-full rounded transition-all"
                style={{ width: `${scorePercent}%`, background: scorePercent >= 80 ? '#018600' : scorePercent >= 60 ? '#f59e0b' : '#BF0A03' }}
              />
            </div>
            <p className="text-[11px] mt-1.5 text-right" style={{ color: '#9E9E9E' }}>{scorePercent}% 정답</p>
          </div>

          {/* 수동채점 안내 */}
          {result.manualPending > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg" style={{ background: '#FFFBF0', border: '1px solid #fde68a' }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#92400e' }}>수동채점 대기 중</p>
                <p className="text-xs" style={{ color: '#78350f' }}>
                  서술형 {result.manualPending}개 문항은 교수자 채점 후 최종 점수가 확정됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 응시 정보 */}
          <div className="flex items-center justify-between text-xs" style={{ color: '#9E9E9E' }}>
            <span>응시시간 {result.timeTaken}분</span>
            <span>총 {quiz.questions}문항 · {quiz.totalPoints}점 만점</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded text-sm font-semibold text-white transition-colors"
            style={{ background: '#4f46e5' }}
            onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
            onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
          >
            퀴즈 목록으로
            <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
