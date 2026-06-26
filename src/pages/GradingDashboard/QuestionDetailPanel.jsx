import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import TypeBadge from '../../components/TypeBadge'
import { Download, FolderDown, ChevronDown, ChevronUp } from 'lucide-react'
import ResponsesTab from './ResponsesTab'
import AcceptedAnswerModal from './AcceptedAnswerModal'
import RegradeOptionsModal from '../../components/RegradeOptionsModal'
import { RichTextRenderer } from '../../components/RichText'
import { regradeQuestion } from '@/lib/data'
import { getVoidedQuestions, setQuestionVoided } from '@/utils/voidedQuestions'
import { getLocalGrades, setLocalGrades } from './utils'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

const REGRADE_OPTION_LABELS = {
  award_both: '이전 정답과 수정된 정답 모두 인정',
  new_answer_only: '수정된 정답 기준 재채점',
  full_points: '전원 만점 처리',
  accepted_answer: '추가 인정 답안 소급 부여',
}

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
export default function QuestionDetailPanel({ question, students, search, onSearch, onExcel, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, showToast }) {
  const navigate = useNavigate()
  const [changedStudentIds, setChangedStudentIds] = useState(new Set())
  const [clearPendingSignal, setClearPendingSignal] = useState(0)
  const [infoCollapsed, setInfoCollapsed] = useState(false)
  const [showAcceptedModal, setShowAcceptedModal] = useState(false)
  const [showRegradeModal, setShowRegradeModal] = useState(false)
  const [regradeBusy, setRegradeBusy] = useState(false)
  const [regradeTick, setRegradeTick] = useState(0)

  // 추가 인정 답안 등록 대상 유형 (XQ-D-06 R-008: 단답형)
  const canAcceptAnswer = question.type === 'short_answer'
  // 재채점 대상 = 이 문항을 받은 제출 학생 (XQ-D-06 R-008: 채점 화면 문항 중심)
  const submittedCount = students.filter(s => s.submitted).length
  // 채점 제외(무효화) 여부 (regradeTick 으로 적용 후 재조회)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isVoided = useMemo(() => getVoidedQuestions(quizId).has(question.id), [quizId, question.id, regradeTick])

  // 채점 제외 해제 (배지의 해제 버튼)
  const handleUnexclude = () => {
    setQuestionVoided(quizId, question.id, false)
    setRegradeTick(t => t + 1)
    onGradeSaved?.()
    showToast?.('채점 제외를 해제했습니다')
  }

  // 재채점 실행 (현재 정답 기준 재채점 / 전원 만점 / 채점에서 제외) — 응시본 기준
  const handleRegradeConfirm = async (option) => {
    // 채점에서 제외: 재계산 대신 총점에서 제외 (XQ-D-06 R-008 문항 무효화)
    if (option === 'exclude') {
      setQuestionVoided(quizId, question.id, true)
      setShowRegradeModal(false)
      setRegradeTick(t => t + 1)
      onGradeSaved?.()
      showToast?.('문항을 채점에서 제외했습니다 (총점에서 제외)')
      return
    }
    setRegradeBusy(true)
    try {
      const result = await regradeQuestion(quizId, question, option, question)
      const count = result?.regradedStudents ?? result?.changedCount ?? 0
      try {
        const existing = JSON.parse(localStorage.getItem('xnq_regrade_log') || '{}')
        existing[quizId] = {
          ...(existing[quizId] || {}),
          [question.id]: { option, count, timestamp: new Date().toISOString() },
        }
        localStorage.setItem('xnq_regrade_log', JSON.stringify(existing))
      } catch { /* ignore */ }
      setShowRegradeModal(false)
      setRegradeTick(t => t + 1)
      onGradeSaved?.()
      showToast?.(count > 0 ? `재채점 완료 (${count}명 점수 변경)` : '재채점 완료 (점수 변경 없음)')
    } catch (err) {
      console.error('[QuestionDetailPanel] 재채점 실패', err)
      showToast?.('재채점 실패')
    } finally {
      setRegradeBusy(false)
    }
  }

  // 재채점 로그 읽기
  const regradeInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('xnq_regrade_log')
      if (!raw) return null
      const log = JSON.parse(raw)
      return log[quizId]?.[question.id] || null
    } catch { return null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regradeTick: 적용 후 강제 재조회
  }, [quizId, question.id, regradeTick])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on question switch
    setChangedStudentIds(new Set())
  }, [question?.id])

  // mode: 'all_full' = 전체 만점 / 'all_zero' = 전체 0점 / 'unsubmitted_zero' = 미제출자만 0점
  const handleBulkGrade = (mode) => {
    const isFull = mode === 'all_full'
    const targetScore = isFull ? question.points : 0
    const label = isFull ? '정답' : '오답'

    let targets
    let scopeLabel
    if (mode === 'unsubmitted_zero') {
      targets = students.filter(s => !s.submitted)
      scopeLabel = '미제출자'
    } else {
      targets = students
      scopeLabel = '전체 학생'
    }

    if (targets.length === 0) {
      showToast?.(`${scopeLabel}가 없어 적용할 수 없습니다`)
      return
    }
    if (!window.confirm(`${scopeLabel} ${targets.length}명 전원에게 ${label}(${targetScore}점) 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?`)) return

    const grades = getLocalGrades()
    targets.forEach(student => {
      const storageKey = `${quizId}_${student.id}_${question.id}`
      grades[storageKey] = targetScore
      if (!student.manualScores) student.manualScores = {}
      student.manualScores[question.id] = targetScore
      const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
      const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
      student.score = autoTotal + manualTotal
    })
    setLocalGrades(grades)
    setChangedStudentIds(prev => {
      const next = new Set(prev)
      targets.forEach(s => next.add(s.id))
      return next
    })
    setClearPendingSignal(s => s + 1)
    onGradeSaved?.()
    showToast?.(`${scopeLabel} ${targets.length}명에게 ${label} 처리했습니다`)
  }

  const title = (question.title || '').trim()
  const hasChoices = question.choices && question.choices.length > 0
  const hasAnswer = !!question.correctAnswer
  const plainText = (question.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const summaryText = title || plainText

  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 카드 — 접기/펼치기 */}
      {infoCollapsed ? (
        <div className="bg-white mb-3 border border-border rounded-2xl">
          <button
            type="button"
            onClick={() => setInfoCollapsed(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/30 transition-colors rounded-2xl"
          >
            <span className="text-[13px] font-bold text-muted-foreground shrink-0">Q{question.order}</span>
            <TypeBadge type={question.type} small />
            <span className="text-[13px] text-foreground truncate flex-1 min-w-0">{summaryText}</span>
            <span className="text-[12px] text-muted-foreground shrink-0">{question.points}점</span>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </button>
        </div>
      ) : (
        <div className="bg-white mb-3 border border-border rounded-2xl">
          <div className="p-4 pb-2">
            {/* 메타 행 */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[13px] font-bold text-muted-foreground shrink-0">Q{question.order}</span>
              <TypeBadge type={question.type} small />
              <span className="ml-auto text-[13px] text-muted-foreground shrink-0">{question.points}점</span>
            </div>

            {/* 제목 */}
            {title && (
              <p className="text-[15px] font-semibold text-foreground mb-1.5 break-words">{title}</p>
            )}

            {/* 본문 */}
            <RichTextRenderer html={question.text} className="text-[13px] text-foreground leading-relaxed block" />

            {/* 선택지 리스트 */}
            {hasChoices && (
              <div className="flex flex-col gap-1 mt-3">
                {question.choices.map((choice, i) => {
                  const isCorrect = choice === question.correctAnswer
                  return (
                    <div key={i} className={cn(
                      'flex items-start gap-2 text-[13px] leading-[1.5] px-2.5 py-1.5 rounded-md transition-colors',
                      isCorrect ? 'bg-accent text-primary font-semibold' : 'text-secondary-foreground'
                    )}>
                      <span className="flex-shrink-0 w-4 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <RichTextRenderer html={choice} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 정답 안내 박스 */}
            {hasAnswer && (
              <div className="mt-3 flex items-center gap-2 bg-background rounded-md px-3 py-2">
                <span className="text-[12px] font-medium px-1.5 py-0.5 rounded bg-correct-bg text-correct shrink-0">정답</span>
                {question.type === 'true_false' ? (
                  <div className="flex items-center gap-1.5">
                    {['참', '거짓'].map(opt => {
                      const isCorrect = opt === question.correctAnswer
                      return (
                        <span key={opt} className={cn('px-2 py-0.5 rounded-full text-[12px] font-medium', isCorrect ? 'bg-primary text-white' : 'bg-slate-100 text-muted-foreground')}>
                          {opt}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-[13px] font-medium text-foreground">{question.correctAnswer}</span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setInfoCollapsed(true)}
            className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors rounded-b-2xl"
          >
            접기
            <ChevronUp size={12} />
          </button>
        </div>
      )}

      {/* 재채점 적용 안내 */}
      {regradeInfo && (
        <div className="flex items-start gap-2.5 mb-3 px-3.5 py-2.5 rounded-lg bg-warning-bg border border-warning-border">
          <div className="text-[12px] leading-relaxed text-warning-foreground">
            <span className="font-semibold">재채점 적용됨</span>
            <span className="mx-1 text-warning">|</span>
            {REGRADE_OPTION_LABELS[regradeInfo.option] ?? regradeInfo.option}
            {regradeInfo.count > 0 && <span> ({regradeInfo.count}명 점수 변경)</span>}
          </div>
        </div>
      )}

      {/* 채점 제외(무효화) 안내 */}
      {isVoided && (
        <div className="flex items-center justify-between gap-2.5 mb-3 px-3.5 py-2.5 rounded-lg bg-secondary border border-border">
          <p className="text-[12px] leading-relaxed text-secondary-foreground">
            <span className="font-semibold text-foreground">채점에서 제외된 문항입니다</span>
            <span className="mx-1.5 text-muted-foreground">|</span>
            이 문항은 총점에 반영되지 않습니다.
          </p>
          <Button variant="outline" size="xs" onClick={handleUnexclude} className="shrink-0">
            제외 해제
          </Button>
        </div>
      )}

      {/* 응시 현황 헤더 + 일괄 채점 액션 */}
      <div className="flex items-center justify-between mb-3 gap-2 border-b border-border">
        <div className="px-3 py-2 text-sm border-b-2 border-primary text-primary font-medium -mb-px">
          응시 현황
        </div>
        <div className="flex items-center gap-2">
          {question.type === 'file_upload' && (
            <Button variant="outline" onClick={() => showToast('프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다')}>
              <FolderDown size={14} />
              제출물 일괄 다운로드
            </Button>
          )}
          {canAcceptAnswer && (
            <Button variant="outline" onClick={() => setShowAcceptedModal(true)}>
              추가 인정 답안
            </Button>
          )}
          <Button variant="outline" disabled={submittedCount === 0} onClick={() => setShowRegradeModal(true)}>
            재채점
          </Button>
          <Button variant="outline" onClick={() => handleBulkGrade('all_full')}>
            전체 정답
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                전체 오답
                <ChevronDown size={12} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 border-0 rounded-xl shadow-lg">
              <DropdownMenuItem onClick={() => handleBulkGrade('all_zero')}>
                전체 학생 0점 처리
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkGrade('unsubmitted_zero')}>
                미제출자만 0점 처리
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={onExcel}>
            <Download size={14} />
            엑셀 일괄 채점
          </Button>
        </div>
      </div>

      <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} quizId={quizId} onGradeSaved={onGradeSaved} gradeVersion={gradeVersion} excelRows={excelRows} onExcelRowsConsumed={onExcelRowsConsumed} changedStudentIds={changedStudentIds} onStudentChanged={id => setChangedStudentIds(prev => new Set(prev).add(id))} clearPendingSignal={clearPendingSignal} />

      {showAcceptedModal && (
        <AcceptedAnswerModal
          question={question}
          students={students}
          quizId={quizId}
          onClose={() => setShowAcceptedModal(false)}
          onApplied={() => {
            setShowAcceptedModal(false)
            setRegradeTick(t => t + 1)
            onGradeSaved?.()
          }}
          showToast={showToast}
        />
      )}

      {showRegradeModal && (
        <RegradeOptionsModal
          mode="manual"
          submittedCount={submittedCount}
          questionLabel={`Q${question.order ?? ''}`.trim()}
          onConfirm={handleRegradeConfirm}
          onCancel={() => { if (!regradeBusy) setShowRegradeModal(false) }}
          onEditQuestion={() => navigate(`/quiz/${quizId}/edit?tab=questions&editQuestion=${question.id}`)}
        />
      )}

    </div>
  )
}
