import { cn } from '@/lib/utils'
import { getLocalFudgePoints, getInitScore, hasActualScoreChange } from './utils'
import { getStudentAnswer, isAnswerCorrect, getStudentFileSubmission } from '../../data/mockData'
import { Paperclip, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

function SubmitBadge({ status }) {
  if (status === 'late') {
    return <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700">지각제출</span>
  }
  if (status === 'unsubmitted') {
    return <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-500">미제출</span>
  }
  return <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700">정상제출</span>
}

export function CorrectBadge({ correct }) {
  return (
    <span className={cn('inline-block text-[11px] px-1.5 py-0.5 rounded font-medium', correct ? 'text-correct bg-correct-bg' : 'text-incorrect bg-incorrect-bg')}>
      {correct ? '정답' : '오답'}
    </span>
  )
}

export function GradeStatusBadge({ ungraded }) {
  return ungraded ? (
    <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600">미채점</span>
  ) : (
    <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600">채점완료</span>
  )
}

function FudgeBadge({ value }) {
  if (!value) return null
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-px rounded bg-amber-50 text-amber-700"
      title={`가산점 ${value > 0 ? '+' : ''}${value}점`}
    >
      <Sparkles size={9} />
      {value > 0 ? `+${value}` : value}
    </span>
  )
}

function StudentMeta({ student, accent = false }) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <span className={cn('font-semibold text-[15px] shrink-0', accent ? 'text-foreground' : 'text-muted-foreground')}>
        {student.name}
      </span>
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 tabular-nums shrink-0">
        {student.studentId}
      </span>
    </div>
  )
}

function ScoreControls({ student, question, displayScore, isChanged, isUngraded, fudge, onScoreChange, onRowSave }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <FudgeBadge value={fudge} />
      <GradeStatusBadge ungraded={isUngraded && !isChanged} />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={displayScore}
          onChange={e => onScoreChange(student.id, e.target.value)}
          placeholder="-"
          min={0}
          max={question.points}
          step={0.5}
          className={cn(
            'w-16 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-center border tabular-nums text-slate-900',
            isChanged ? 'border-primary' : 'border-slate-200'
          )}
        />
        <span className="text-sm text-muted-foreground">/ {question.points}점</span>
      </div>
      <Button size="xs" onClick={() => onRowSave?.(student.id)} disabled={!isChanged}>
        저장
      </Button>
    </div>
  )
}

function UnsubmittedCard({ student, question, quizId, onScoreChange, pendingScore, onRowSave }) {
  const initScore = getInitScore(student, question, quizId, null)
  const displayScore = pendingScore !== undefined ? pendingScore : initScore
  const isChanged = hasActualScoreChange(pendingScore, initScore)
  const studentFudge = getLocalFudgePoints()[`${quizId}_${student.id}`] || 0

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="px-5 py-3.5">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <StudentMeta student={student} />
          <SubmitBadge status="unsubmitted" />
        </div>

        <p className="text-[13px] text-muted-foreground italic mb-3 px-1">제출되지 않았습니다</p>

        <div className="flex items-center justify-end">
          <ScoreControls
            student={student}
            question={question}
            displayScore={displayScore}
            isChanged={isChanged}
            isUngraded={initScore === '' || initScore === null}
            fudge={studentFudge}
            onScoreChange={onScoreChange}
            onRowSave={onRowSave}
          />
        </div>
      </div>
    </div>
  )
}

function StudentRow({ student, question, quizId, onScoreChange, pendingScore, isChanged, onRowSave }) {
  if (!student.submitted) {
    return <UnsubmittedCard student={student} question={question} quizId={quizId} onScoreChange={onScoreChange} pendingScore={pendingScore} onRowSave={onRowSave} />
  }

  const studentIdx = parseInt(student.id.replace('s', ''))
  const rawAnswer = student.selections?.[question.id] ??
    (question.autoGrade
      ? getStudentAnswer(studentIdx, question.id)
      : (student.response || getStudentAnswer(studentIdx, question.id)))

  let normalizedAnswer
  if (question.type === 'true_false') {
    const lower = (typeof rawAnswer === 'string' ? rawAnswer : '').toLowerCase()
    normalizedAnswer = (lower === '참' || lower === 'true') ? '참' : (lower === '거짓' || lower === 'false') ? '거짓' : rawAnswer
  } else {
    normalizedAnswer = rawAnswer
  }
  const displayAnswer = formatAnswerForDisplay(question, normalizedAnswer)

  const autoCorrect = question.autoGrade ? isAnswerCorrect(rawAnswer, question.id) : null

  const initScore = getInitScore(student, question, quizId, autoCorrect)
  const displayScore = pendingScore !== undefined ? pendingScore : initScore
  const isRowChanged = hasActualScoreChange(pendingScore, initScore)

  const isUngraded = initScore === '' || initScore === null
  const studentFudge = getLocalFudgePoints()[`${quizId}_${student.id}`] || 0
  const submitStatus = student.isLate ? 'late' : 'ontime'
  const submittedAtShort = student.submittedAt ? student.submittedAt.slice(5, 16) : null

  // 좌측 강조 바: 변경됨(파란) > 미채점(주황)
  const showAccent = isChanged || isUngraded
  const accentBar = isChanged ? 'bg-primary' : 'bg-amber-300'

  return (
    <div className={cn('relative border-b border-slate-200 bg-white transition-colors', isChanged && 'bg-blue-50/30')}>
      {/* 좌측 강조 바 — 카드 좌측 4px */}
      {showAccent && (
        <span className={cn('absolute left-0 top-0 bottom-0 w-1', accentBar)} aria-hidden />
      )}

      <div className="px-5 py-3.5">
        {/* 학생 정보 + 제출 상태 / 제출일시 / 정답 배지 */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <StudentMeta student={student} accent />
          <div className="flex items-center gap-1.5 shrink-0">
            <SubmitBadge status={submitStatus} />
            {submittedAtShort && (
              <span className="text-[12px] text-muted-foreground tabular-nums">{submittedAtShort}</span>
            )}
            {autoCorrect !== null && <CorrectBadge correct={autoCorrect} />}
          </div>
        </div>

        {/* 답안 영역 — border만, 배경 없음 */}
        {question.type === 'file_upload' ? (
          <FileSubmissionView studentIdx={studentIdx} question={question} />
        ) : (
          <div className="rounded-lg border border-slate-200 px-4 py-3 mb-3">
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 mb-1.5">제출한 답안</span>
            <p className="text-[14px] leading-relaxed whitespace-pre-line break-words text-slate-900">
              {displayAnswer || <span className="text-muted-foreground italic">(답안 없음)</span>}
            </p>
          </div>
        )}

        {/* 정답 (자동채점 오답 시) */}
        {autoCorrect === false && question.correctAnswer != null && (
          <p className="mb-3 px-1 text-[13px] text-muted-foreground">
            <span className="font-medium text-slate-600">정답</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}
          </p>
        )}

        {/* 채점 영역 */}
        <div className="flex items-center justify-end">
          <ScoreControls
            student={student}
            question={question}
            displayScore={displayScore}
            isChanged={isRowChanged}
            isUngraded={isUngraded}
            fudge={studentFudge}
            onScoreChange={onScoreChange}
            onRowSave={onRowSave}
          />
        </div>
      </div>
    </div>
  )
}

function FileSubmissionView({ studentIdx, question }) {
  const file = getStudentFileSubmission(studentIdx, question.id)
  const extColor = { pdf: 'text-red-500', png: 'text-blue-500', jpg: 'text-green-500', hwp: 'text-sky-600' }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-3 flex items-center gap-3">
      <Paperclip size={16} className={cn('shrink-0', extColor[file.fileType] || 'text-muted-foreground')} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-slate-900 truncate">{file.fileName}</p>
        <p className="text-[12px] text-muted-foreground">
          <span>{file.fileSize}</span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span>{file.uploadedAt}</span>
        </p>
      </div>
      <button className="p-2 rounded hover:bg-white transition-colors text-muted-foreground hover:text-primary" title="파일 다운로드">
        <Download size={16} />
      </button>
    </div>
  )
}

export default StudentRow
