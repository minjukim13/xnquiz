import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades, getLocalComments, setLocalComments, getLocalFudgePoints, setLocalFudgePoints } from './utils'
import { getStudentAnswer, isAnswerCorrect, getStudentFileSubmission } from '../../data/mockData'
import TypeBadge from '../../components/TypeBadge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Paperclip, Download, MessageSquare, Sparkles, Plus, Minus } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import ActivityLogPanel from './ActivityLogPanel'

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

// ─── 문항 행 ────────────────────────────────────────────────────────────────
function QuestionRow({ question, student, studentIdx, quizId, pendingScore, onScoreChange }) {
  const [expanded, setExpanded] = useState(false)

  const storageKey = `${quizId}_${student.id}_${question.id}`
  const rawAnswer = student.selections?.[question.id] ??
    (question.autoGrade
      ? getStudentAnswer(studentIdx, question.id)
      : (student.response || getStudentAnswer(studentIdx, question.id)))

  const autoCorrect = question.autoGrade ? isAnswerCorrect(rawAnswer, question.id) : null

  const initScore = (() => {
    const grades = getLocalGrades()
    if (storageKey in grades) return grades[storageKey]
    if (student.manualScores?.[question.id] != null) return student.manualScores[question.id]
    if (question.autoGrade) return student.autoScores?.[question.id] ?? (autoCorrect ? question.points : 0)
    return ''
  })()

  const displayScore = pendingScore !== undefined ? pendingScore : initScore
  const isUngraded = !question.autoGrade && initScore === ''
  const isManuallyOverridden = (() => {
    if (!question.autoGrade) return false
    const grades = getLocalGrades()
    if (!(storageKey in grades)) return false
    const originalScore = autoCorrect ? question.points : 0
    return grades[storageKey] !== originalScore
  })()

  let compactAnswer
  if (question.type === 'true_false') {
    const lower = (typeof rawAnswer === 'string' ? rawAnswer : '').toLowerCase()
    compactAnswer = (lower === '참' || lower === 'true') ? '참' : (lower === '거짓' || lower === 'false') ? '거짓' : rawAnswer
  } else {
    compactAnswer = rawAnswer
  }
  // 복합 답안(객체/배열) → 사람이 읽을 수 있는 문자열로 변환
  compactAnswer = formatAnswerForDisplay(question, compactAnswer)

  const isExpandable = ['essay', 'short_answer', 'multiple_answers'].includes(question.type)
  const isFileUpload = question.type === 'file_upload'

  return (
    <div className="border-b border-slate-100">
      <div className={cn(
        'flex items-center gap-2 px-3 py-3',
        pendingScore !== undefined ? 'bg-blue-50/60' : isUngraded ? 'bg-amber-50/30' : ''
      )}>
        {/* Q번호 */}
        <div className="w-12 shrink-0 text-center text-[14px] font-medium text-gray-500">
          Q{question.order}
        </div>

        {/* 유형 */}
        <div className="w-16 shrink-0 text-center">
          <TypeBadge type={question.type} small />
        </div>

        {/* 문제 / 답안 */}
        {isFileUpload ? (() => {
          const file = getStudentFileSubmission(studentIdx, question.id)
          const extIcon = { pdf: 'text-red-500', png: 'text-blue-500', jpg: 'text-green-500', hwp: 'text-sky-600' }
          return (
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-foreground truncate">{question.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <Paperclip size={13} className={extIcon[file.fileType] || 'text-muted-foreground'} />
                <p className="text-[13px] text-muted-foreground truncate">{file.fileName} ({file.fileSize})</p>
                <button className="p-1 rounded hover:bg-slate-100 transition-colors text-muted-foreground hover:text-primary" title="파일 다운로드">
                  <Download size={13} />
                </button>
              </div>
            </div>
          )
        })() : isExpandable ? (
          <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(!expanded)}>
            <p className="text-[14px] font-medium text-foreground truncate">{question.text}</p>
            <div className="flex items-center gap-1 mt-1">
              <p className="truncate flex-1 text-[13px] text-muted-foreground">{compactAnswer || '(답안 없음)'}</p>
              {expanded
                ? <ChevronUp size={13} className="text-gray-300 shrink-0" />
                : <ChevronDown size={13} className="text-gray-300 shrink-0" />}
            </div>
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-foreground truncate">{question.text}</p>
            <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{compactAnswer || '(답안 없음)'}</p>
          </div>
        )}

        {/* 정답 여부 */}
        <div className="w-16 shrink-0 text-center">
          {question.autoGrade && autoCorrect !== null && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', autoCorrect ? 'text-correct bg-correct-bg' : 'text-incorrect bg-incorrect-bg')}>
              {autoCorrect ? '정답' : '오답'}
            </span>
          )}
          {question.autoGrade && isManuallyOverridden && (
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">수정됨</p>
          )}
          {!question.autoGrade && isUngraded && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium text-amber-600 bg-amber-50">
              미채점
            </span>
          )}
        </div>

        {/* 점수 */}
        <div className="flex items-center gap-1.5 w-36 shrink-0 justify-center">
          <input
            type="number"
            value={displayScore}
            onChange={e => onScoreChange(question.id, e.target.value)}
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

      {/* 펼침: 서술형/단답형 전체 답안 */}
      {expanded && isExpandable && (
        <div className="px-3 pb-3">
          <div className="ml-[7rem] p-3 rounded bg-slate-50 border border-slate-200">
            <p className="leading-relaxed text-[14px] text-black whitespace-pre-wrap">{formatAnswerForDisplay(question, rawAnswer) || '(답안 없음)'}</p>
            {question.autoGrade && autoCorrect === false && (
              <p className="mt-2 text-xs text-muted-foreground">정답: {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : (question.correctAnswer ?? '')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 학생 중심: 학생별 전체 문항 패널 ─────────────────────────────────────
export default function StudentDetailPanel({ student, questions, quizId, onGradeSaved }) {
  const studentIdx = parseInt(student.id.replace('s', '')) - 1
  const [pendingScores, setPendingScores] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle')
  const commentKey = `${quizId}_${student.id}`
  const fudgeKey = `${quizId}_${student.id}`
  const [savedComment, setSavedComment] = useState(() => getLocalComments()[commentKey] || '')
  const [comment, setComment] = useState(() => getLocalComments()[commentKey] || '')
  const [savedFudge, setSavedFudge] = useState(() => getLocalFudgePoints()[fudgeKey] || 0)
  const [fudge, setFudge] = useState(() => getLocalFudgePoints()[fudgeKey] || 0)
  const [fudgeOpen, setFudgeOpen] = useState(false)

  useEffect(() => {
    setPendingScores({})
    setSaveStatus('idle')
    const key = `${quizId}_${student.id}`
    const c = getLocalComments()[key] || ''
    setSavedComment(c)
    setComment(c)
    const f = getLocalFudgePoints()[key] || 0
    setSavedFudge(f)
    setFudge(f)
  }, [student?.id, quizId])

  const handleScoreChange = useCallback((questionId, score) => {
    setPendingScores(prev => ({ ...prev, [questionId]: score }))
    setSaveStatus('idle')
  }, [])

  const scorePendingCount = Object.values(pendingScores).filter(v => v !== '' && !isNaN(Number(v)) && Number(v) >= 0).length
  const [commentOpen, setCommentOpen] = useState(false)
  const [showCommentCancelConfirm, setShowCommentCancelConfirm] = useState(false)

  const commentDirty = comment !== savedComment

  const handleCommentCancel = () => {
    if (commentDirty) setShowCommentCancelConfirm(true)
    else setCommentOpen(false)
  }

  const confirmCommentDiscard = () => {
    setComment(savedComment)
    setShowCommentCancelConfirm(false)
    setCommentOpen(false)
  }

  const handleBulkSave = () => {
    const grades = getLocalGrades()
    for (const [questionId, score] of Object.entries(pendingScores)) {
      if (score === '' || isNaN(Number(score)) || Number(score) < 0) continue
      const question = questions.find(q => q.id === questionId)
      if (!question) continue
      const storageKey = `${quizId}_${student.id}_${questionId}`
      grades[storageKey] = Number(score)
      if (question.autoGrade) {
        if (!student.autoScores) student.autoScores = {}
        student.autoScores[questionId] = Number(score)
      } else {
        if (!student.manualScores) student.manualScores = {}
        student.manualScores[questionId] = Number(score)
      }
    }
    setLocalGrades(grades)
    const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
    const manualTotal = Object.values(student.manualScores || {}).reduce((a, b) => a + (b || 0), 0)
    student.score = Math.max(0, autoTotal + manualTotal + savedFudge)
    student.fudgePoints = savedFudge
    setPendingScores({})
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
    onGradeSaved?.()
  }

  const handleFudgeSave = () => {
    const val = Number(fudge) || 0
    const fudges = getLocalFudgePoints()
    fudges[fudgeKey] = val
    setLocalFudgePoints(fudges)
    setSavedFudge(val)
    student.fudgePoints = val
    if (student.score !== null) {
      const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
      const manualTotal = Object.values(student.manualScores || {}).reduce((a, b) => a + (b || 0), 0)
      student.score = Math.max(0, autoTotal + manualTotal + val)
    }
    setFudgeOpen(false)
    onGradeSaved?.()
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200">
      {/* 학생 정보 + 일괄 저장 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-accent text-primary">
            {student.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-base font-bold text-foreground leading-tight">{student.name}</p>
              <Popover
                open={commentOpen}
                onOpenChange={open => {
                  if (open) { setCommentOpen(true); return }
                  if (commentDirty) setShowCommentCancelConfirm(true)
                  else setCommentOpen(false)
                }}
              >
                <PopoverTrigger asChild>
                  <button className="p-0.5 rounded hover:bg-slate-200/60 transition-colors" title="코멘트">
                    <MessageSquare size={14} className={savedComment ? 'text-primary' : 'text-muted-foreground'} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="코멘트 입력"
                    rows={3}
                    className="w-full text-sm resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-200 text-foreground placeholder:text-muted-foreground leading-relaxed"
                  />
                  <div className="flex justify-end gap-1.5 mt-1.5">
                    <Button variant="ghost" size="xs" onClick={handleCommentCancel}>취소</Button>
                    <Button size="xs" onClick={() => { const c = getLocalComments(); c[commentKey] = comment; setLocalComments(c); setSavedComment(comment); setCommentOpen(false) }}>저장</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">{student.studentId} · {student.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <p className={cn('text-xs', student.isLate ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
              {student.submitted ? `제출 ${student.endTime || '-'}` : '미제출'}
            </p>
            {student.isLate && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-px rounded">지각</span>
            )}
            {student.autoSubmitted && (
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-px rounded">자동 제출</span>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <Popover open={fudgeOpen} onOpenChange={open => { if (!open) setFudge(savedFudge); setFudgeOpen(open) }}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                    savedFudge !== 0
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'text-muted-foreground hover:bg-slate-200/60'
                  )}
                  title="가산점 (Fudge Points)"
                >
                  <Sparkles size={13} />
                  <span>가산점</span>
                  {savedFudge !== 0 && (
                    <span className="font-semibold">{savedFudge > 0 ? `+${savedFudge}` : savedFudge}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">가산점 부여</p>
                    <p className="text-xs text-muted-foreground mt-0.5">총점에 +/- 점수를 가감합니다</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => setFudge(Number(fudge || 0) - 0.5)}
                    >
                      <Minus size={14} />
                    </Button>
                    <input
                      type="number"
                      step={0.5}
                      value={fudge}
                      onChange={e => setFudge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="flex-1 min-w-0 text-center text-sm px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-200 text-foreground"
                      placeholder="0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => setFudge(Number(fudge || 0) + 0.5)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="xs" onClick={() => { setFudge(savedFudge); setFudgeOpen(false) }}>취소</Button>
                    <Button size="xs" onClick={handleFudgeSave}>저장</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {saveStatus === 'saved' && (
              <span className="text-xs font-medium text-emerald-600">저장 완료</span>
            )}
            <Button size="xs" onClick={handleBulkSave} disabled={scorePendingCount === 0}>
              일괄 저장{scorePendingCount > 0 ? ` (${scorePendingCount})` : ''}
            </Button>
          </div>
        </div>
      </div>

      {!student.submitted ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-sm text-caption">제출된 답안이 없습니다</p>
        </div>
      ) : (
        <Tabs defaultValue="answers" className="flex-1 min-h-0 gap-0">
          <div className="px-3 pt-2 pb-1 border-b border-slate-100">
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="answers">답안</TabsTrigger>
              <TabsTrigger value="activity">활동 로그</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="answers" className="flex flex-col min-h-0">
            {/* 테이블 헤더 */}
            <div className="flex items-center px-3 py-2 gap-2 border-b-2 border-slate-200 bg-slate-50">
              <div className="w-12 shrink-0 text-center text-[14px] font-semibold text-gray-500">번호</div>
              <div className="w-16 shrink-0 text-center text-[14px] font-semibold text-gray-500">유형</div>
              <div className="flex-1 text-[14px] font-semibold text-gray-500">문제 / 답안</div>
              <div className="w-16 shrink-0 text-center text-[14px] font-semibold text-gray-500">정답</div>
              <div className="w-36 shrink-0 text-center text-[14px] font-semibold text-gray-500">점수</div>
            </div>

            {/* 문항 행 목록 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {questions.map(q => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  student={student}
                  studentIdx={studentIdx}
                  quizId={quizId}
                  pendingScore={pendingScores[q.id]}
                  onScoreChange={handleScoreChange}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex flex-col min-h-0">
            <ActivityLogPanel student={student} quizId={quizId} questions={questions} />
          </TabsContent>
        </Tabs>
      )}

      {showCommentCancelConfirm && (
        <ConfirmDialog
          title="코멘트 작성 취소"
          message="작성 중인 코멘트가 저장되지 않습니다. 정말 취소하시겠습니까?"
          confirmLabel="취소하기"
          cancelLabel="계속 작성"
          confirmDanger
          onConfirm={confirmCommentDiscard}
          onCancel={() => setShowCommentCancelConfirm(false)}
        />
      )}
    </div>
  )
}
