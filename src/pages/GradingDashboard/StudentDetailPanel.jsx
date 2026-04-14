import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import AnswerCard from './AnswerCard'

// ─── 학생 중심: 학생별 전체 문항 패널 ─────────────────────────────────────
export default function StudentDetailPanel({ student, questions, quizId }) {
  const studentIdx = parseInt(student.id.replace('s', '')) - 1
  const [savedQIds, setSavedQIds] = useState(new Set())
  const cardRefs = useRef({})

  const handleSaved = useCallback((qId) => {
    setSavedQIds(prev => {
      const next = new Set(prev)
      next.add(qId)
      const manualQs = questions.filter(q => !q.autoGrade)
      const currentIdx = manualQs.findIndex(q => q.id === qId)
      for (let i = currentIdx + 1; i < manualQs.length; i++) {
        if (!next.has(manualQs[i].id)) {
          setTimeout(() => {
            cardRefs.current[manualQs[i].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 150)
          break
        }
      }
      return next
    })
  }, [questions])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200">
      {/* 학생 정보 헤더 */}
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] bg-accent text-primary">
              {student.name[0]}
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{student.name}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">{student.studentId} · {student.department}</p>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">{student.submitted ? `제출 ${student.endTime || '-'}` : '미제출'}</p>
        </div>
        <div className="h-px bg-border mt-5" />
      </div>

      {/* 문항별 답안 카드 목록 */}
      {!student.submitted ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-sm text-caption">제출된 답안이 없습니다</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6">
          {questions.map(q => (
            <div key={q.id} ref={el => { cardRefs.current[q.id] = el }}>
              <AnswerCard question={q} student={student} studentIdx={studentIdx} quizId={quizId} onSaved={() => handleSaved(q.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
