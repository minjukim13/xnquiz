import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import TypeBadge from '../../components/TypeBadge'
import { Download, FolderDown, ChevronDown, RefreshCw } from 'lucide-react'
import ResponsesTab from './ResponsesTab'
import StatsTab from './StatsTab'
import { RichTextRenderer } from '../../components/RichText'

const REGRADE_OPTION_LABELS = {
  award_both: '이전 정답과 수정된 정답 모두 인정',
  new_answer_only: '수정된 정답 기준 재채점',
  full_points: '전원 만점 처리',
}

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
export default function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, showToast }) {
  const [changedStudentIds, setChangedStudentIds] = useState(new Set())
  const [showChoices, setShowChoices] = useState(false)

  // 재채점 로그 읽기
  const regradeInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('xnq_regrade_log')
      if (!raw) return null
      const log = JSON.parse(raw)
      return log[quizId]?.[question.id] || null
    } catch { return null }
  }, [quizId, question.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on question switch
    setChangedStudentIds(new Set())
    setShowChoices(false)
  }, [question?.id])


  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 카드 — 접기/펼치기 */}
      {(() => {
        const hasDetail = question.choices?.length > 0 || question.correctAnswer
        const isExpandable = hasDetail && !['essay', 'file_upload'].includes(question.type)

        return (
          <div className="bg-white mb-3 border border-border rounded-2xl">
            {/* 카드 헤더 (항상 노출) */}
            <div
              className={cn('flex items-center gap-3 p-4', isExpandable && 'cursor-pointer hover:bg-slate-50 transition-colors rounded-2xl')}
              onClick={() => isExpandable && setShowChoices(v => !v)}
            >
              {isExpandable && (
                <ChevronDown size={16} className={cn('shrink-0 text-muted-foreground transition-transform', showChoices && 'rotate-180')} />
              )}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[13px] font-bold text-muted-foreground shrink-0">Q{question.order}</span>
                <TypeBadge type={question.type} small />
                {/* 헤더 한 줄: HTML 안의 태그 제거 후 plain text 로만 표시 (line-clamp 동작) */}
                <p className={cn('text-[14px] font-semibold text-foreground truncate', !showChoices && 'flex-1')}>
                  {String(question.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                </p>
              </div>
              <span className="text-[13px] text-muted-foreground shrink-0">{question.points}점</span>
            </div>

            {/* 펼침 영역: 본문 + 선지 + 정답 */}
            {showChoices && isExpandable && (
              <div className="px-4 pb-4 pt-0">
                {/* 본문 풀 렌더 (HTML) */}
                <RichTextRenderer html={question.text} className="text-[13px] text-foreground leading-relaxed mb-2 block" />
                {/* 선택지 리스트 */}
                {question.choices && question.choices.length > 0 && (
                  <div className="flex flex-col gap-1">
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
                {question.correctAnswer && (
                  <div className="mt-2 flex items-center gap-2 bg-background rounded-md px-3 py-2">
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
            )}
          </div>
        )
      })()}

      {/* 재채점 적용 안내 */}
      {regradeInfo && (
        <div className="flex items-start gap-2.5 mb-3 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-[12px] leading-relaxed text-amber-800">
            <span className="font-semibold">재채점 적용됨</span>
            <span className="mx-1 text-amber-400">|</span>
            {REGRADE_OPTION_LABELS[regradeInfo.option] ?? regradeInfo.option}
            {regradeInfo.count > 0 && <span> ({regradeInfo.count}명 점수 변경)</span>}
          </div>
        </div>
      )}

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2 border-b border-border">
        <div className="flex items-center gap-1">
          {[
            { key: 'responses', label: '응시 현황' },
            { key: 'stats', label: '통계' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                activeTab === key
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === 'responses' && (
          <div className="flex items-center gap-2">
            {question.type === 'file_upload' && (
              <Button variant="outline" onClick={() => showToast('프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다')}>
                <FolderDown size={14} />
                제출물 일괄 다운로드
              </Button>
            )}
            <Button variant="outline" onClick={onExcel}>
              <Download size={14} />
              엑셀 일괄 채점
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'responses' ? (
        <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} quizId={quizId} onGradeSaved={onGradeSaved} gradeVersion={gradeVersion} excelRows={excelRows} onExcelRowsConsumed={onExcelRowsConsumed} changedStudentIds={changedStudentIds} onStudentChanged={id => setChangedStudentIds(prev => new Set(prev).add(id))} />
      ) : (
        <StatsTab question={question} students={students} />
      )}

    </div>
  )
}
