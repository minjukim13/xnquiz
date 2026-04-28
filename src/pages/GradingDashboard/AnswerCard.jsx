import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades } from './utils'
import { getStudentAnswer, isAnswerCorrect } from '../../data/mockData'
import TypeBadge from '../../components/TypeBadge'
import { CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextRenderer } from '../../components/RichText'

// 복합 답안(객체/배열)을 표시용 문자열로 변환
function formatAnswerForDisplay(question, answer) {
  if (answer === null || answer === undefined || answer === '') return ''
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') return String(answer)
  if (question.type === 'formula' && typeof answer === 'object') return answer.value ?? ''
  if (question.type === 'matching' && typeof answer === 'object' && !Array.isArray(answer)) {
    return Object.entries(answer).map(([l, r]) => `${l} → ${r}`).join(', ')
  }
  if (question.type === 'multiple_dropdowns' && Array.isArray(answer)) {
    return answer.filter(Boolean).join(', ')
  }
  if (question.type === 'fill_in_multiple_blanks' && Array.isArray(answer)) {
    return answer.map((v, i) => `빈칸${i + 1}: ${v || '-'}`).join(', ')
  }
  if (question.type === 'file_upload' && typeof answer === 'object') return answer.fileName ?? ''
  if (Array.isArray(answer)) return answer.join(', ')
  return JSON.stringify(answer)
}

function AnswerCard({ question, student, studentIdx, quizId, onSaved }) {
  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [score, setScore] = useState(() => {
    if (question.autoGrade) {
      return student.autoScores?.[question.id] ?? question.points
    }
    const grades = getLocalGrades()
    if (storageKey in grades) return grades[storageKey]
    return student.manualScores?.[question.id] ?? ''
  })
  const [saved, setSaved] = useState(() => {
    if (question.autoGrade) return true
    const grades = getLocalGrades()
    return (storageKey in grades) || student.manualScores?.[question.id] != null
  })

  const rawAnswer = student.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
  const autoCorrect = question.autoGrade ? isAnswerCorrect(rawAnswer, question.id) : null
  const answer = formatAnswerForDisplay(question, rawAnswer)
  const [answerExpanded, setAnswerExpanded] = useState(false)

  const correctAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : (question.correctAnswer ?? '')
  const isLongAnswer = correctAnswer.length > 30

  return (
    <div className="pb-10 border-b border-secondary">
      {/* 문항 헤더 — Q번호, 유형, 점수를 한 줄에 */}
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">Q{question.order} <TypeBadge type={question.type} small /></span>
        <span className="shrink-0">
          {question.autoGrade ? (
            <span className={cn('text-sm font-bold', autoCorrect ? 'text-correct' : 'text-foreground')}>
              {autoCorrect ? question.points : 0}
              <span className="text-[13px] font-normal text-caption"> / {question.points}</span>
            </span>
          ) : saved && score !== '' ? (
            <span className="text-sm font-bold text-foreground">
              {score}
              <span className="text-[13px] font-normal text-caption"> / {question.points}</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-destructive">미채점</span>
          )}
        </span>
      </div>

      {/* 문제 내용 */}
      <RichTextRenderer html={question.text} className="text-[15px] font-semibold text-foreground leading-normal mb-3 block" />


      {/* 답안 박스 */}
      <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary max-w-full">
        {question.autoGrade && autoCorrect !== null && (
          autoCorrect
            ? <CheckCircle2 size={16} className="shrink-0 text-correct" />
            : <X size={16} className="shrink-0 text-incorrect" />
        )}
        <span className="text-sm font-medium leading-normal text-foreground">{answer}</span>
      </div>

      {/* 정답: 맞힌 경우 표시 안 함 / 오답이면 실제 정답 표시 */}
      {question.autoGrade && autoCorrect === false && correctAnswer && (
        <div className="mt-2 pl-0.5">
          {isLongAnswer ? (
            <span className="text-sm text-muted-foreground">
              정답: {answerExpanded ? correctAnswer : `${correctAnswer.slice(0, 30)}…`}
              <Button
                variant="link"
                size="xs"
                className="h-auto p-0 ml-1 text-[13px]"
                onClick={() => setAnswerExpanded(v => !v)}
              >
                {answerExpanded ? '접기' : '더보기'}
              </Button>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">정답: {correctAnswer}</span>
          )}
        </div>
      )}

      {/* 수동채점 입력 */}
      {!question.autoGrade && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            value={score}
            onChange={e => { setScore(e.target.value); setSaved(false) }}
            min={0}
            max={question.points}
            step={0.5}
            placeholder="0"
            className="w-[60px] text-sm py-1.5 px-2 rounded-lg border border-border text-foreground text-center outline-none"
          />
          <span className="text-[13px] text-caption">/ {question.points}</span>
          {saved && (
            <span className="flex items-center gap-1 ml-1 text-[13px] text-correct">
              <CheckCircle2 size={13} />저장됨
            </span>
          )}
          {score !== '' && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              const grades = getLocalGrades()
              grades[storageKey] = Number(score)
              setLocalGrades(grades)
              /* eslint-disable react-hooks/immutability -- prototype: mockData student 객체를 단일 소스로 공유, 실제 API 연동 시 불변 업데이트로 교체 */
              if (!student.manualScores) student.manualScores = {}
              student.manualScores[question.id] = Number(score)
              const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
              const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
              student.score = autoTotal + manualTotal
              /* eslint-enable react-hooks/immutability */
              setSaved(true)
              onSaved?.()
            }}
            disabled={Number(score) > question.points || Number(score) < 0}
          >
            저장
          </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default AnswerCard
