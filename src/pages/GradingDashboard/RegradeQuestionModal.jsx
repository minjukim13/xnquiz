import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getStudentAnswer } from '../../data/mockData'
import { RefreshCw } from 'lucide-react'
import TypeBadge from '../../components/TypeBadge'

// ─── 모달: 재채점 ──────────────────────────────────────────────────────────
export default function RegradeQuestionModal({ question, students, questionsModifiedAt, onClose, onDone }) {
  const submitted = students.filter(s => s.submitted)

  const handleRegrade = () => {
    let count = 0
    const changedIds = new Set()
    const correctAnswer = question.correctAnswer
    submitted.forEach(s => {
      const studentIdx = parseInt(s.id.replace(/\D/g, ''))
      const answer = s.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
      if (!answer && answer !== 0) return
      let isCorrect = false
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        isCorrect = String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
      } else if (question.type === 'short_answer') {
        const accepted = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
        isCorrect = accepted.some(a => String(answer).trim().toLowerCase() === String(a).trim().toLowerCase())
      } else if (question.type === 'numerical') {
        const num = parseFloat(answer)
        const correct = parseFloat(correctAnswer)
        const tol = question.tolerance ?? 0
        isCorrect = !isNaN(num) && Math.abs(num - correct) <= tol
      } else { return }
      const newScore = isCorrect ? question.points : 0
      if (!s.autoScores) s.autoScores = {}
      const oldScore = s.autoScores[question.id] ?? 0
      s.autoScores[question.id] = newScore
      const autoTotal = Object.values(s.autoScores).reduce((a, b) => a + b, 0)
      const manualTotal = s.manualScores ? Object.values(s.manualScores).reduce((a, b) => a + (b || 0), 0) : 0
      s.score = autoTotal + manualTotal
      if (newScore !== oldScore) { count++; changedIds.add(s.id) }
    })
    onDone(count, changedIds)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{`Q${question.order} 재채점`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500 mb-1"><TypeBadge type={question.type} small /> {question.points}점</p>
            <p className="text-sm font-medium text-slate-800 line-clamp-2">{question.text}</p>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-200">
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">정답</span>
              <span className="text-[13px] font-medium text-slate-700">{String(question.correctAnswer)}</span>
            </div>
          </div>

          <p className="text-[12px] text-slate-400 leading-relaxed">
            제출한 {submitted.length}명을 대상으로, 변경된 정답 기준으로 자동채점 문항만 재채점됩니다.<br />수동 조정 점수는 유지됩니다.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button className="flex-1" onClick={handleRegrade} disabled={submitted.length === 0}>
              <RefreshCw size={13} />
              {submitted.length}명 재채점 실행
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
