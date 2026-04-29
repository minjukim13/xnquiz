import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { getLocalGrades, setLocalGrades, getLocalFudgePoints, setLocalFudgePoints, getUnreadCount } from './utils'
import { getStudentAnswer, isAnswerCorrect, getStudentFileSubmission } from '../../data/mockData'
import TypeBadge from '../../components/TypeBadge'
import { Button } from '@/components/ui/button'
import { Paperclip, Download, Plus, Minus, MoreVertical } from 'lucide-react'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ActivityLogPanel from './ActivityLogPanel'
import CommentThread from './CommentThread'
import { CorrectBadge, GradeStatusBadge } from './StudentRow'

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

// ─── 문항 카드 ──────────────────────────────────────────────────────────────
function FileSubmissionView({ studentIdx, question }) {
  const file = getStudentFileSubmission(studentIdx, question.id)
  const extColor = { pdf: 'text-red-500', png: 'text-blue-500', jpg: 'text-green-500', hwp: 'text-sky-600' }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
      <Paperclip size={16} className={cn('shrink-0', extColor[file.fileType] || 'text-muted-foreground')} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-slate-900 truncate">{file.fileName}</p>
        <p className="text-[12px] text-muted-foreground">
          <span>{file.fileSize}</span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span>제출 파일</span>
        </p>
      </div>
      <button className="p-2 rounded hover:bg-white transition-colors text-muted-foreground hover:text-primary" title="파일 다운로드">
        <Download size={16} />
      </button>
    </div>
  )
}

function QuestionCard({ question, student, studentIdx, quizId, pendingScore, onScoreChange }) {
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
  const isPending = pendingScore !== undefined
  const isUngraded = !question.autoGrade && initScore === ''
  const isManuallyOverridden = (() => {
    if (!question.autoGrade) return false
    const grades = getLocalGrades()
    if (!(storageKey in grades)) return false
    const originalScore = autoCorrect ? question.points : 0
    return grades[storageKey] !== originalScore
  })()

  let normalizedAnswer
  if (question.type === 'true_false') {
    const lower = (typeof rawAnswer === 'string' ? rawAnswer : '').toLowerCase()
    normalizedAnswer = (lower === '참' || lower === 'true') ? '참' : (lower === '거짓' || lower === 'false') ? '거짓' : rawAnswer
  } else {
    normalizedAnswer = rawAnswer
  }
  const displayAnswer = formatAnswerForDisplay(question, normalizedAnswer)

  const isFileUpload = question.type === 'file_upload'
  const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : (question.correctAnswer ?? '')
  const showAccent = isPending || isUngraded
  const accentBar = isPending ? 'bg-primary' : 'bg-amber-300'

  return (
    <div className={cn('relative border-b border-slate-200 transition-colors', isPending && 'bg-blue-50/30')}>
      {showAccent && (
        <span className={cn('absolute left-0 top-0 bottom-0 w-1', accentBar)} aria-hidden />
      )}

      <div className="px-5 py-3.5">
        {/* 상단: 문항 메타 + 점수 입력 */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold bg-accent text-primary tabular-nums shrink-0">
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {question.autoGrade && autoCorrect !== null && <CorrectBadge correct={autoCorrect} />}
            {!question.autoGrade && <GradeStatusBadge ungraded={isUngraded} />}
            {isManuallyOverridden && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-px rounded">수정됨</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              value={displayScore}
              onChange={e => onScoreChange(question.id, e.target.value)}
              placeholder="—"
              min={0}
              max={question.points}
              step={0.5}
              className={cn(
                'w-16 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-center border tabular-nums text-slate-900',
                isPending ? 'border-primary' : 'border-slate-200'
              )}
            />
            <span className="text-sm text-muted-foreground">/ {question.points}점</span>
          </div>
        </div>

        {/* 문제 텍스트 — 보조적으로, 답안에 시선 집중 */}
        <p className="text-[13px] text-secondary-foreground leading-relaxed mb-2.5 whitespace-pre-line break-words">
          {question.text}
        </p>

        {/* 학생 답안 영역 — border만, 배경 없음 */}
        {isFileUpload ? (
          <FileSubmissionView studentIdx={studentIdx} question={question} />
        ) : (
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 mb-1.5">제출한 답안</span>
            <p className="text-[15px] leading-relaxed whitespace-pre-line break-words text-slate-900">
              {displayAnswer || <span className="text-muted-foreground italic text-[14px]">(답안 없음)</span>}
            </p>
          </div>
        )}

        {/* 정답 (자동채점 오답 시) */}
        {question.autoGrade && autoCorrect === false && correctAnswerText && (
          <p className="mt-2 px-1 text-[13px] text-muted-foreground">
            <span className="font-medium text-slate-600">정답</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {correctAnswerText}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── 학생 중심: 학생별 전체 문항 패널 ─────────────────────────────────────
export default function StudentDetailPanel({ student, questions, quizId, onGradeSaved }) {
  const studentIdx = parseInt(student.id.replace('s', '')) - 1
  const [pendingScores, setPendingScores] = useState({})
  const fudgeKey = `${quizId}_${student.id}`
  const [savedFudge, setSavedFudge] = useState(() => getLocalFudgePoints()[fudgeKey] || 0)
  const [fudge, setFudge] = useState(() => getLocalFudgePoints()[fudgeKey] || 0)
  const [fudgeOpen, setFudgeOpen] = useState(false)
  const [commentUnread, setCommentUnread] = useState(() => getUnreadCount(quizId, student.id, 'professor'))
  const [activeTab, setActiveTab] = useState('answers')

  useEffect(() => {
    setPendingScores({})
    const key = `${quizId}_${student.id}`
    const f = getLocalFudgePoints()[key] || 0
    setSavedFudge(f)
    setFudge(f)
    setCommentUnread(getUnreadCount(quizId, student.id, 'professor'))
    setActiveTab('answers')
  }, [student?.id, quizId])

  // 코멘트 탭 진입 시 안 읽은 카운트 초기화 (CommentThread 가 markRead 호출함)
  useEffect(() => {
    if (activeTab === 'comments') setCommentUnread(0)
  }, [activeTab])

  const handleScoreChange = useCallback((questionId, score) => {
    setPendingScores(prev => ({ ...prev, [questionId]: score }))
  }, [])

  const scorePendingCount = Object.values(pendingScores).filter(v => v !== '' && !isNaN(Number(v)) && Number(v) >= 0).length

  const handleBulkSave = () => {
    const grades = getLocalGrades()
    for (const [questionId, score] of Object.entries(pendingScores)) {
      if (score === '' || isNaN(Number(score)) || Number(score) < 0) continue
      const question = questions.find(q => q.id === questionId)
      if (!question) continue
      const storageKey = `${quizId}_${student.id}_${questionId}`
      grades[storageKey] = Number(score)
      /* eslint-disable react-hooks/immutability -- prototype: mockData student 객체를 단일 소스로 공유, 실제 API 연동 시 불변 업데이트로 교체 */
      if (question.autoGrade) {
        if (!student.autoScores) student.autoScores = {}
        student.autoScores[questionId] = Number(score)
      } else {
        if (!student.manualScores) student.manualScores = {}
        student.manualScores[questionId] = Number(score)
      }
      /* eslint-enable react-hooks/immutability */
    }
    setLocalGrades(grades)
    const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
    const manualTotal = Object.values(student.manualScores || {}).reduce((a, b) => a + (b || 0), 0)
    student.score = Math.max(0, autoTotal + manualTotal + savedFudge)
    student.fudgePoints = savedFudge
    setPendingScores({})
    onGradeSaved?.()
  }

  // mode: 'full' = 모든 문항 만점 / 'zero' = 모든 문항 0점
  const handleAllQuestionsGrade = (mode) => {
    const isFull = mode === 'full'
    const label = isFull ? '정답' : '오답'
    if (questions.length === 0) return
    if (!window.confirm(`${student.name} 학생의 모든 문항 ${questions.length}개를 ${label} 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?`)) return

    const grades = getLocalGrades()
    for (const question of questions) {
      const targetScore = isFull ? question.points : 0
      const storageKey = `${quizId}_${student.id}_${question.id}`
      grades[storageKey] = targetScore
      /* eslint-disable react-hooks/immutability -- prototype: mockData student 객체를 단일 소스로 공유, 실제 API 연동 시 불변 업데이트로 교체 */
      if (question.autoGrade) {
        if (!student.autoScores) student.autoScores = {}
        student.autoScores[question.id] = targetScore
      } else {
        if (!student.manualScores) student.manualScores = {}
        student.manualScores[question.id] = targetScore
      }
      /* eslint-enable react-hooks/immutability */
    }
    setLocalGrades(grades)
    const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
    const manualTotal = Object.values(student.manualScores || {}).reduce((a, b) => a + (b || 0), 0)
    student.score = Math.max(0, autoTotal + manualTotal + savedFudge)
    setPendingScores({})
    onGradeSaved?.()
  }

  const handleFudgeSave = () => {
    const val = Number(fudge) || 0
    const fudges = getLocalFudgePoints()
    fudges[fudgeKey] = val
    setLocalFudgePoints(fudges)
    setSavedFudge(val)
    /* eslint-disable react-hooks/immutability -- prototype: mockData student 객체를 단일 소스로 공유 */
    student.fudgePoints = val
    if (student.score !== null) {
      const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
      const manualTotal = Object.values(student.manualScores || {}).reduce((a, b) => a + (b || 0), 0)
      student.score = Math.max(0, autoTotal + manualTotal + val)
    }
    /* eslint-enable react-hooks/immutability */
    setFudgeOpen(false)
    onGradeSaved?.()
  }

  const hasScore = student.score !== null
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200">
      {/* 학생 정보 헤더 — 식별 + 결과 (제출 정보는 활동 로그 탭으로 이동) */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-5">
        {/* 프로필 아바타 */}
        <div className="shrink-0 w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-base font-semibold">
          {student.name[0]}
        </div>

        {/* 이름 · 학번 */}
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-bold text-foreground truncate leading-tight">
            {student.name}
          </p>
          <p className="text-[13px] text-muted-foreground tabular-nums leading-tight mt-1.5">
            {student.studentId}
          </p>
        </div>

        {/* 점수 + 채점 상태 */}
        <div className="shrink-0 text-right">
          <p className="leading-tight tabular-nums">
            <span className="text-[20px] font-bold text-foreground">
              {hasScore ? student.score : '—'}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground ml-1">
              / {totalPoints}점
            </span>
          </p>
          <p className={cn(
            'text-[13px] font-medium leading-tight mt-1.5',
            hasScore ? 'text-muted-foreground' : 'text-amber-600'
          )}>
            {hasScore ? '채점완료' : '미채점'}
          </p>
        </div>
      </div>

      {!student.submitted ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-sm text-caption">제출된 답안이 없습니다</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 gap-0 flex flex-col">
          {/* 탭 + 액션 툴바 */}
          <div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center justify-between gap-2">
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="answers">답안</TabsTrigger>
              <TabsTrigger value="activity">활동 로그</TabsTrigger>
              <TabsTrigger value="comments" className="gap-1">
                코멘트
                {commentUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-white text-[10px] font-semibold tabular-nums">
                    {commentUnread}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {activeTab === 'answers' && (
              <div className="flex items-center gap-1.5">
                {/* 점수 저장 */}
                <Button size="sm" onClick={handleBulkSave} disabled={scorePendingCount === 0}>
                  점수 저장{scorePendingCount > 0 ? ` (${scorePendingCount})` : ''}
                </Button>

                {/* 더보기 (모든 문항 정답/오답 + 가산점) — 가산점 팝오버는 더보기 버튼에 앵커링 */}
                <Popover open={fudgeOpen} onOpenChange={open => { if (!open) setFudge(savedFudge); setFudgeOpen(open) }}>
                  <PopoverAnchor asChild>
                    <span className="inline-flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" title="더보기">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onSelect={() => handleAllQuestionsGrade('full')}>
                            모든 문항 정답
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleAllQuestionsGrade('zero')}>
                            모든 문항 오답
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setFudgeOpen(true)}>
                            가산점{savedFudge !== 0 ? ` (${savedFudge > 0 ? '+' : ''}${savedFudge})` : ''}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </PopoverAnchor>
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
              </div>
            )}
          </div>

          <TabsContent value="answers" className="flex flex-col min-h-0">
            {/* 문항 카드 목록 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50/30">
              {questions.map(q => (
                <QuestionCard
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

          <TabsContent value="comments" className="flex flex-col min-h-0">
            <CommentThread quizId={quizId} studentId={student.id} role="professor" className="flex-1" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
