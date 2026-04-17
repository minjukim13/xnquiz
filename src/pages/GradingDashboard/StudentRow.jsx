import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, getLocalFudgePoints } from './utils'
import { getStudentAnswer, isAnswerCorrect, getStudentFileSubmission } from '../../data/mockData'
import { Paperclip, ChevronDown, ChevronUp, Download, Sparkles } from 'lucide-react'

// 복합 답안(객체/배열)을 표시용 문자열로 변환
function formatAnswerForDisplay(question, answer) {
  if (answer === null || answer === undefined || answer === '') return answer
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') return answer
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

function StudentRow({ student, question, quizId, onScoreChange, pendingScore, isChanged }) {
  // 미제출 학생
  if (!student.submitted) {
    const unsubStorageKey = `${quizId}_${student.id}_${question.id}`
    const unsubInitScore = (() => {
      const grades = getLocalGrades()
      if (unsubStorageKey in grades) return grades[unsubStorageKey]
      return ''
    })()
    const unsubDisplayScore = pendingScore !== undefined ? pendingScore : unsubInitScore
    return (
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 bg-slate-50">
        <div className="w-28 shrink-0">
          <p className="text-[14px] font-medium truncate text-muted-foreground text-center">{student.name}</p>
        </div>
        <div className="w-28 shrink-0">
          <p className="text-[14px] truncate text-muted-foreground text-center">{student.studentId}</p>
        </div>
        <p className="flex-1 min-w-0 text-sm text-muted-foreground">미제출</p>
        {question.type === 'file_upload' && <div className="w-12 shrink-0" />}
        <div className="w-28 shrink-0 text-center">
          <span className="text-xs text-muted-foreground">-</span>
        </div>
        {question.autoGrade && <div className="w-16 shrink-0" />}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-center">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 text-muted-foreground bg-slate-100">
            미제출
          </span>
          <input
            type="number"
            value={unsubDisplayScore}
            onChange={e => onScoreChange(student.id, e.target.value)}
            placeholder="—"
            min={0}
            max={question.points}
            step={0.5}
            className={cn(
              'w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-200 text-center border text-slate-900',
              pendingScore !== undefined ? 'border-primary' : 'border-slate-200'
            )}
          />
          <span className="text-sm shrink-0 text-muted-foreground">/ {question.points}</span>
        </div>
      </div>
    )
  }

  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [expanded, setExpanded] = useState(false)
  const studentIdx = parseInt(student.id.replace('s', ''))
  const rawAnswer = student.selections?.[question.id] ??
    (question.autoGrade
      ? getStudentAnswer(studentIdx, question.id)
      : (student.response || getStudentAnswer(studentIdx, question.id)))

  let compactAnswer
  if (question.type === 'true_false') {
    const lower = (typeof rawAnswer === 'string' ? rawAnswer : '').toLowerCase()
    compactAnswer = (lower === '참' || lower === 'true') ? '참' : (lower === '거짓' || lower === 'false') ? '거짓' : rawAnswer
  } else {
    compactAnswer = rawAnswer
  }
  compactAnswer = formatAnswerForDisplay(question, compactAnswer)

  const autoCorrect = question.autoGrade ? isAnswerCorrect(rawAnswer, question.id) : null

  const initScore = (() => {
    const grades = getLocalGrades()
    if (storageKey in grades) return grades[storageKey]
    if (student.manualScores?.[question.id] != null) return student.manualScores[question.id]
    if (question.autoGrade) return student.autoScores?.[question.id] ?? (autoCorrect ? question.points : 0)
    return ''
  })()
  const displayScore = pendingScore !== undefined ? pendingScore : initScore

  const isUngraded = student.score === null
  const studentFudge = getLocalFudgePoints()[`${quizId}_${student.id}`] || 0

  return (
    <div className="border-b border-slate-100">
      <div className={cn('flex items-center gap-2 px-3 py-3', isChanged ? 'bg-blue-50/60' : isUngraded ? 'bg-amber-50/30' : '')}>
        {/* 이름 */}
        <div className="w-28 shrink-0">
          <p className="text-[14px] font-medium truncate text-gray-700 flex items-center gap-1 justify-center">
            {student.name}
            {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="점수 변경됨" />}
            {studentFudge !== 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-px rounded bg-amber-50 text-amber-700 shrink-0"
                title={`가산점 ${studentFudge > 0 ? '+' : ''}${studentFudge}점`}
              >
                <Sparkles size={9} />
                {studentFudge > 0 ? `+${studentFudge}` : studentFudge}
              </span>
            )}
          </p>
        </div>

        {/* 학번 */}
        <div className="w-28 shrink-0">
          <p className="text-[14px] truncate text-black text-center">{student.studentId}</p>
        </div>

        {/* 답안 */}
        {question.type === 'file_upload' ? (() => {
          const file = getStudentFileSubmission(studentIdx, question.id)
          const extIcon = { pdf: 'text-red-500', png: 'text-blue-500', jpg: 'text-green-500', hwp: 'text-sky-600' }
          return (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Paperclip size={13} className={extIcon[file.fileType] || 'text-muted-foreground'} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-black truncate">{file.fileName}</p>
                <p className="text-[11px] text-muted-foreground">{file.fileSize} · {file.uploadedAt}</p>
              </div>
            </div>
          )
        })() : ['essay', 'short_answer', 'multiple_answers'].includes(question.type) ? (
          <button className="flex-1 min-w-0 text-left flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
            <p className="truncate flex-1 text-[14px] text-black">{compactAnswer || '(답안 없음)'}</p>
            {expanded
              ? <ChevronUp size={13} className="text-gray-300 flex-shrink-0" />
              : <ChevronDown size={13} className="text-gray-300 flex-shrink-0" />
            }
          </button>
        ) : (
          <p className="flex-1 min-w-0 truncate text-[14px] text-black">{compactAnswer || '(답안 없음)'}</p>
        )}

        {/* 파일 다운로드 버튼 */}
        {question.type === 'file_upload' && (
          <div className="w-12 shrink-0 text-center">
            <button className="p-1.5 rounded hover:bg-slate-100 transition-colors text-muted-foreground hover:text-primary" title="파일 다운로드">
              <Download size={14} />
            </button>
          </div>
        )}

        {/* 제출 일시 */}
        <div className="w-28 shrink-0 text-center">
          <span className={cn('text-xs', student.isLate ? 'text-amber-600 font-semibold' : 'text-muted-foreground')}>
            {student.submittedAt ? student.submittedAt.slice(5, 16) : '-'}
          </span>
        </div>

        {/* 정답 여부 */}
        {question.autoGrade && (
          <div className="w-16 shrink-0 text-center">
            {autoCorrect !== null && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', autoCorrect ? 'text-correct bg-correct-bg' : 'text-incorrect bg-incorrect-bg')}>
                {autoCorrect ? '정답' : '오답'}
              </span>
            )}
          </div>
        )}

        {/* 채점여부 + 점수 */}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-center">
          {isUngraded && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 text-amber-600 bg-amber-50">
              미채점
            </span>
          )}
          <input
            type="number"
            value={displayScore}
            onChange={e => onScoreChange(student.id, e.target.value)}
            placeholder="—"
            min={0}
            max={question.points}
            step={0.5}
            className={cn(
              'w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-200 text-center border text-slate-900',
              pendingScore !== undefined ? 'border-primary' : 'border-slate-200'
            )}
          />
          <span className="text-sm shrink-0 text-muted-foreground">/ {question.points}</span>
        </div>
      </div>

      {expanded && ['essay', 'short_answer', 'multiple_answers'].includes(question.type) && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <p className="leading-relaxed text-[14px] text-black">{formatAnswerForDisplay(question, rawAnswer) || '(답안 없음)'}</p>
            {autoCorrect !== null && !autoCorrect && (
              <p className="mt-2 text-xs text-muted-foreground">정답: {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : (question.correctAnswer ?? '')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentRow
