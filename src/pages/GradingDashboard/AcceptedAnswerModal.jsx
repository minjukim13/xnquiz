import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { getStudentAnswer } from '../../data/mockData'
import { getLocalGrades, setLocalGrades } from './utils'
import { recordScoreAdjustment } from '@/utils/scoreAdjustments'

// XQ-D-06 R-008: 추가 인정 답안 등록 + 일괄 재채점 (단답형)
// 채점 후 등록하지 않은 정답 표현(동의어·약어 등)을 인정하고, 해당 답안 제출 학생에게 소급 만점 부여.
function normalize(s, { ignoreCase, ignoreSpace }) {
  let v = String(s ?? '').trim()
  if (ignoreCase) v = v.toLowerCase()
  if (ignoreSpace) v = v.replace(/\s+/g, '')
  return v
}

function rawAnswerOf(student, questionId) {
  const idx = parseInt(String(student.id).replace(/\D/g, '')) || 0
  return student.selections?.[questionId] ?? getStudentAnswer(idx, questionId)
}

function currentScoreOf(student, questionId) {
  return student.manualScores?.[questionId] ?? student.autoScores?.[questionId] ?? 0
}

export default function AcceptedAnswerModal({ question, students, quizId, onClose, onApplied, showToast }) {
  const [draft, setDraft] = useState('')
  const [newAnswers, setNewAnswers] = useState([])
  const [ignoreCase, setIgnoreCase] = useState(true)
  const [ignoreSpace, setIgnoreSpace] = useState(true)

  const existingAnswers = useMemo(() => {
    const ca = question.correctAnswer
    const base = Array.isArray(ca) ? ca : (ca != null && ca !== '' ? [ca] : [])
    return [...new Set([...base, ...(question.acceptedAnswers ?? [])].map(String))]
  }, [question])

  const addDraft = () => {
    const t = draft.trim()
    if (t && !newAnswers.includes(t)) setNewAnswers([...newAnswers, t])
    setDraft('')
  }

  // 미리보기: 새 인정 답안과 일치하면서 아직 만점이 아닌 제출 학생
  const affected = useMemo(() => {
    if (newAnswers.length === 0) return []
    const opts = { ignoreCase, ignoreSpace }
    const accepted = newAnswers.map(a => normalize(a, opts))
    return students.filter(s => {
      if (!s.submitted) return false
      if (currentScoreOf(s, question.id) >= question.points) return false
      const ans = rawAnswerOf(s, question.id)
      if (Array.isArray(ans)) return false // 단답형 전용 (다중빈칸 제외)
      return accepted.includes(normalize(ans, opts))
    })
  }, [students, newAnswers, ignoreCase, ignoreSpace, question])

  const handleApply = () => {
    if (newAnswers.length === 0) return

    // 대상 학생이 있으면 소급 만점 부여 (없어도 인정 답안 등록은 진행)
    if (affected.length > 0) {
      const grades = getLocalGrades()
      affected.forEach(student => {
        grades[`${quizId}_${student.id}_${question.id}`] = question.points
        if (!student.manualScores) student.manualScores = {}
        student.manualScores[question.id] = question.points
        const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
        const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
        student.score = autoTotal + manualTotal
        // XQ-D-09 R-006: 학생 결과 화면 "점수가 조정되었습니다" 안내용 기록
        recordScoreAdjustment(quizId, student.id, student.score)
      })
      setLocalGrades(grades)

      // 재채점 로그 기록 (패널 "재채점 적용됨" 배너 연동) — 점수가 바뀐 경우만
      try {
        const raw = localStorage.getItem('xnq_regrade_log')
        const log = raw ? JSON.parse(raw) : {}
        if (!log[quizId]) log[quizId] = {}
        log[quizId][question.id] = { option: 'accepted_answer', count: affected.length, answers: newAnswers, at: new Date().toISOString() }
        localStorage.setItem('xnq_regrade_log', JSON.stringify(log))
      } catch { /* ignore */ }
    }

    // 추가 인정 답안을 문항 정답 목록에 영구 추가 — 대상 학생 유무와 무관하게 항상 등록
    // (향후 응시·재제출 시 인정. D-03 정답 목록 반영, mock 인메모리 갱신)
    // eslint-disable-next-line react-hooks/immutability
    question.acceptedAnswers = [...new Set([...(question.acceptedAnswers ?? []), ...newAnswers])]

    showToast?.(affected.length > 0
      ? `추가 인정 답안 등록 — ${affected.length}명에게 소급 점수가 부여되었습니다`
      : '추가 인정 답안이 등록되었습니다 (소급 대상 학생 없음)')
    onApplied?.(affected.length)
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>추가 인정 답안 등록</DialogTitle>
          <DialogDescription>
            채점 후 발견한 동의어·약어 등 다른 표현을 정답으로 인정하고, 해당 답안을 제출한 학생에게 점수를 소급 부여합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 기존 정답 */}
        <div>
          <p className="text-xs font-medium text-secondary-foreground mb-1.5">기존 정답</p>
          <div className="flex flex-wrap gap-1.5">
            {existingAnswers.length > 0 ? existingAnswers.map(a => (
              <span key={a} className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">{a}</span>
            )) : <span className="text-xs text-muted-foreground">등록된 정답 없음</span>}
          </div>
        </div>

        {/* 추가 인정 답안 입력 */}
        <div>
          <p className="text-xs font-medium text-secondary-foreground mb-1.5">추가 인정 답안</p>
          {newAnswers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {newAnswers.map(a => (
                <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent text-accent-foreground">
                  {a}
                  <button type="button" onClick={() => setNewAnswers(newAnswers.filter(x => x !== a))} className="hover:text-destructive"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && draft.trim()) { e.preventDefault(); addDraft() } }}
            placeholder="인정할 답안 입력 후 Enter"
            autoFocus
            className="w-full text-sm px-3 py-2 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"
          />
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-1.5 text-xs text-secondary-foreground cursor-pointer">
              <input type="checkbox" checked={ignoreCase} onChange={e => setIgnoreCase(e.target.checked)} className="accent-primary" />
              대소문자 무시
            </label>
            <label className="flex items-center gap-1.5 text-xs text-secondary-foreground cursor-pointer">
              <input type="checkbox" checked={ignoreSpace} onChange={e => setIgnoreSpace(e.target.checked)} className="accent-primary" />
              공백 무시
            </label>
          </div>
        </div>

        {/* 미리보기 — 소급 대상이 있을 때만 표시 */}
        {newAnswers.length > 0 && affected.length > 0 && (
          <div className="rounded-lg bg-secondary/40 border border-border px-3.5 py-3">
            <p className="text-sm text-foreground">이 답안을 제출한 <span className="font-semibold text-primary">{affected.length}명</span>에게 {question.points}점이 부여됩니다.</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {affected.slice(0, 8).map(s => s.name).join(', ')}{affected.length > 8 ? ` 외 ${affected.length - 8}명` : ''}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={handleApply} disabled={newAnswers.length === 0}>
            {affected.length > 0 ? `${affected.length}명 일괄 재채점` : '인정 답안 등록'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
