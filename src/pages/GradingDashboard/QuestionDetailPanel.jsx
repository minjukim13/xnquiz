import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import TypeBadge from '../../components/TypeBadge'
import { Users, BarChart3, RefreshCw, Download, FolderDown, ChevronDown } from 'lucide-react'
import { getStudentAnswer } from '../../data/mockData'
import ResponsesTab from './ResponsesTab'
import StatsTab from './StatsTab'
import RegradeQuestionModal from './RegradeQuestionModal'

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
export default function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, questionsModifiedAt, showToast }) {
  const canRegrade = questionsModifiedAt && question.autoGrade
  const [showRegrade, setShowRegrade] = useState(false)
  const [changedStudentIds, setChangedStudentIds] = useState(new Set())
  const [showChoices, setShowChoices] = useState(false)

  // 문항 전환 시 초기화
  useEffect(() => { setChangedStudentIds(new Set()); setShowChoices(false) }, [question?.id])

  // 통계 탭 전환 시 자동 펼치기
  useEffect(() => { if (activeTab === 'stats') setShowChoices(true) }, [activeTab])

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
                <p className={cn('text-[14px] font-semibold text-foreground line-clamp-2', !showChoices && 'flex-1')}>
                  {question.text}
                </p>
              </div>
              <span className="text-[13px] text-muted-foreground shrink-0">{question.points}점</span>
            </div>

            {/* 펼침 영역: 선지 + 정답 */}
            {showChoices && isExpandable && (
              <div className="px-4 pb-4 pt-0">
                {/* 선택지 리스트 */}
                {question.choices && question.choices.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {question.choices.map((choice, i) => {
                      const isCorrect = choice === question.correctAnswer
                      return (
                        <div key={i} className={cn(
                          'flex items-baseline gap-2 text-[13px] leading-[1.5] px-2.5 py-1.5 rounded-md transition-colors',
                          isCorrect ? 'bg-accent text-primary font-semibold' : 'text-secondary-foreground'
                        )}>
                          <span className="flex-shrink-0 w-4 text-right">{i + 1}.</span>
                          <span>{choice}</span>
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

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex border-b-2 border-slate-200">
          {[
            { key: 'responses', icon: <Users size={12} />, label: `응시 현황`, count: students.length },
            { key: 'stats', icon: <BarChart3 size={12} />, label: '통계' },
          ].map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap -mb-0.5 border-b-2',
                activeTab === key ? 'text-primary border-primary' : 'text-gray-400 border-transparent'
              )}
            >
              {icon}
              {label}
              {count != null && (
                <span className={cn('ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold', activeTab === key ? 'bg-accent text-primary' : 'bg-slate-100 text-gray-400')}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'responses' && (
          <div className="flex items-center gap-2">
            {canRegrade && (
              <Button variant="outline" size="xs" className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" onClick={() => setShowRegrade(true)}>
                <RefreshCw size={12} />
                재채점
              </Button>
            )}
            {question.type === 'file_upload' && (
              <Button variant="outline" size="xs" onClick={() => showToast('프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다')}>
                <FolderDown size={12} />
                제출물 일괄 다운로드
              </Button>
            )}
            <Button variant="soft" size="xs" onClick={onExcel}>
              <Download size={12} />
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

      {showRegrade && (
        <RegradeQuestionModal
          question={question}
          students={students}
          questionsModifiedAt={questionsModifiedAt}
          onClose={() => setShowRegrade(false)}
          onDone={(count, ids) => { setShowRegrade(false); setChangedStudentIds(ids); onGradeSaved(); showToast(count > 0 ? `재채점 완료: ${count}명의 점수가 변경되었습니다.` : '재채점 완료: 점수 변경 없음') }}
        />
      )}
    </div>
  )
}
