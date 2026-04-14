import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import TypeBadge from '../../components/TypeBadge'
import { Users, BarChart3, RefreshCw, Download, FolderDown } from 'lucide-react'
import { getStudentAnswer } from '../../data/mockData'
import ResponsesTab from './ResponsesTab'
import StatsTab from './StatsTab'
import RegradeQuestionModal from './RegradeQuestionModal'

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
export default function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed, questionsModifiedAt, showToast }) {
  const canRegrade = questionsModifiedAt && question.autoGrade
  const [showRegrade, setShowRegrade] = useState(false)
  const [changedStudentIds, setChangedStudentIds] = useState(new Set())

  // 문항 전환 시 초기화
  useEffect(() => { setChangedStudentIds(new Set()) }, [question?.id])

  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 */}
      <div className="bg-white mb-3 border border-border rounded-2xl p-6">
        {/* 헤더: Q번호 · 유형 | 점수 */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] text-muted-foreground leading-[1.5]">Q{question.order} <TypeBadge type={question.type} /></span>
          <span className="text-[14px] text-muted-foreground leading-[1.5]">{question.points}점</span>
        </div>
        {/* 문제 본문 */}
        <p className="text-[18px] font-bold text-foreground leading-[1.5] mt-2">{question.text}</p>

        {/* 선택지 리스트 */}
        {question.choices && question.choices.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {question.choices.map((choice, i) => {
              const isCorrect = choice === question.correctAnswer
              return (
                <div key={i} className={cn(
                  'flex items-baseline gap-2.5 text-[14px] leading-[1.5] px-3 py-2 rounded-lg transition-colors',
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
          <div className="mt-4 flex items-center gap-2.5 bg-background rounded-lg px-4 py-3">
            <span className="text-[13px] font-medium px-2 py-0.5 rounded bg-correct-bg text-correct shrink-0">정답</span>
            {question.type === 'true_false' ? (
              <div className="flex items-center gap-1.5">
                {['참', '거짓'].map(opt => {
                  const isCorrect = opt === question.correctAnswer
                  return (
                    <span key={opt} className={cn('px-2.5 py-0.5 rounded-full text-[13px] font-medium', isCorrect ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400')}>
                      {opt}
                    </span>
                  )
                })}
              </div>
            ) : (
              <span className="text-[14px] font-medium text-foreground">{question.correctAnswer}</span>
            )}
          </div>
        )}
      </div>

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
