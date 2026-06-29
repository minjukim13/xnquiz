import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { REGRADE_OPTIONS } from '@/components/RegradeOptionsModal'

// XQ-57 / XQ-D-06 R-008: 채점 화면 재채점 2단계 위저드
// 1단계 정답 검토/변경(추가 인정 답안 포함) → 2단계 재채점 방식 선택.
// 자동채점 유형만 1단계 노출, 그 외(서술형/파일 등)는 바로 2단계.
const AUTO_TYPES = ['short_answer', 'multiple_choice', 'multiple_answers', 'true_false', 'numerical']

const toText = v => String(v ?? '').trim()

// 현재 정답을 유형별 초기 편집 상태로 변환
function initAnswerState(q) {
  const ca = q.correctAnswer
  if (q.type === 'short_answer') {
    const arr = Array.isArray(ca) ? ca.map(toText).filter(Boolean) : (toText(ca) ? [toText(ca)] : [])
    const extra = (q.acceptedAnswers ?? []).map(toText).filter(Boolean)
    const all = [...new Set([...arr, ...extra])]
    return { main: all[0] ?? '', accepted: all.slice(1) }
  }
  if (q.type === 'multiple_answers') {
    const opts = q.choices ?? q.options ?? []
    let set = []
    if (Array.isArray(ca)) set = ca.map(a => (typeof a === 'number' ? opts[a] : a)).map(toText)
    else if (typeof ca === 'string') set = ca.split(',').map(s => s.trim())
    return { selected: set.filter(Boolean) }
  }
  if (q.type === 'true_false') {
    const v = typeof ca === 'boolean' ? (ca ? '참' : '거짓') : toText(ca)
    return { tf: v || '참' }
  }
  if (q.type === 'numerical') {
    return { num: toText(ca), tol: toText(q.tolerance) }
  }
  // multiple_choice
  const opts = q.choices ?? q.options ?? []
  const v = typeof ca === 'number' ? opts[ca] : toText(ca)
  return { choice: v }
}

export default function ManualRegradeWizard({ question, students, quizId, submittedCount, onCancel, onConfirm }) {
  const isAuto = AUTO_TYPES.includes(question.type)
  const choices = question.choices ?? question.options ?? []

  const [step, setStep] = useState(isAuto ? 1 : 2)
  const [changeMode, setChangeMode] = useState('keep') // 'keep' | 'change'
  const [ans, setAns] = useState(() => initAnswerState(question))
  const [draft, setDraft] = useState('')

  const answerChanged = isAuto && changeMode === 'change'

  // 2단계 옵션: 정답 변경 시 이전+수정 인정 옵션 포함, 미변경/비자동 시 축소
  const stepTwoOptions = useMemo(() => {
    let ids
    if (answerChanged) ids = ['award_both', 'new_answer_only', 'full_points', 'exclude']
    else if (isAuto) ids = ['new_answer_only', 'full_points', 'exclude']
    else ids = ['full_points', 'exclude']
    return REGRADE_OPTIONS.filter(o => ids.includes(o.id))
  }, [answerChanged, isAuto])

  const [selectedOption, setSelectedOption] = useState(isAuto ? 'new_answer_only' : 'full_points')

  // 정답 변경 여부에 따라 기본 선택 옵션 보정
  const ensureValidOption = (opts) => {
    if (!opts.find(o => o.id === selectedOption)) setSelectedOption(opts[0]?.id)
  }

  const addAccepted = () => {
    const t = draft.trim()
    if (t && t !== ans.main && !(ans.accepted || []).includes(t)) {
      setAns(a => ({ ...a, accepted: [...(a.accepted || []), t] }))
    }
    setDraft('')
  }
  const removeAccepted = (t) => setAns(a => ({ ...a, accepted: (a.accepted || []).filter(x => x !== t) }))
  const toggleMA = (c) => setAns(a => ({
    ...a,
    selected: (a.selected || []).includes(c) ? a.selected.filter(x => x !== c) : [...(a.selected || []), c],
  }))

  const goStepTwo = () => {
    ensureValidOption(stepTwoOptions)
    setStep(2)
  }

  const handleConfirm = () => {
    const oldQuestion = { ...question }
    if (answerChanged) {
      // 영구 반영: 문항 정답 자체를 변경 (이후 응시에도 적용)
      if (question.type === 'short_answer') {
        const list = [toText(ans.main), ...(ans.accepted || []).map(toText)].filter(Boolean)
        // eslint-disable-next-line react-hooks/immutability
        question.correctAnswer = [...new Set(list)]
        // eslint-disable-next-line react-hooks/immutability
        question.acceptedAnswers = (ans.accepted || []).map(toText).filter(Boolean)
      } else if (question.type === 'multiple_answers') {
        // eslint-disable-next-line react-hooks/immutability
        question.correctAnswer = (ans.selected || []).map(toText).filter(Boolean)
      } else if (question.type === 'true_false') {
        // eslint-disable-next-line react-hooks/immutability
        question.correctAnswer = ans.tf
      } else if (question.type === 'numerical') {
        // eslint-disable-next-line react-hooks/immutability
        question.correctAnswer = toText(ans.num)
        // eslint-disable-next-line react-hooks/immutability
        question.tolerance = parseFloat(ans.tol) || 0
      } else {
        // multiple_choice
        // eslint-disable-next-line react-hooks/immutability
        question.correctAnswer = toText(ans.choice)
      }
    }
    onConfirm(selectedOption, { answerChanged, oldQuestion })
  }

  // ── 1단계: 정답 검토/변경 ──
  const renderAnswerEditor = () => {
    switch (question.type) {
      case 'short_answer':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">정답</p>
              <input
                value={ans.main}
                onChange={e => setAns(a => ({ ...a, main: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary"
                placeholder="정답 입력"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">추가 인정 답안</p>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAccepted() } }}
                  className="flex-1 h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary"
                  placeholder="동의어, 약어 등 인정할 표현"
                />
                <Button variant="soft" size="sm" onClick={addAccepted}>추가</Button>
              </div>
              {(ans.accepted || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ans.accepted.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent text-primary">
                      {t}
                      <button type="button" onClick={() => removeAccepted(t)} className="hover:text-primary-hover">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'multiple_choice':
        return (
          <div className="space-y-1.5">
            {choices.map((c, i) => {
              const v = toText(c)
              const active = ans.choice === v
              return (
                <button key={i} type="button" onClick={() => setAns(a => ({ ...a, choice: v }))}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                    active ? 'border-correct bg-correct-bg text-correct font-medium' : 'border-border hover:bg-slate-50 text-secondary-foreground')}>
                  <span className={cn('w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center', active ? 'border-correct' : 'border-slate-300')}>
                    {active && <span className="w-2 h-2 rounded-full bg-correct" />}
                  </span>
                  <span className="flex-1 min-w-0">{v}</span>
                </button>
              )
            })}
          </div>
        )
      case 'multiple_answers':
        return (
          <div className="space-y-1.5">
            {choices.map((c, i) => {
              const v = toText(c)
              const active = (ans.selected || []).includes(v)
              return (
                <button key={i} type="button" onClick={() => toggleMA(v)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                    active ? 'border-correct bg-correct-bg text-correct font-medium' : 'border-border hover:bg-slate-50 text-secondary-foreground')}>
                  <span className={cn('w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center', active ? 'border-correct bg-correct' : 'border-slate-300')}>
                    {active && <span className="text-white text-[10px] leading-none">✓</span>}
                  </span>
                  <span className="flex-1 min-w-0">{v}</span>
                </button>
              )
            })}
          </div>
        )
      case 'true_false':
        return (
          <div className="flex gap-2">
            {['참', '거짓'].map(opt => (
              <button key={opt} type="button" onClick={() => setAns(a => ({ ...a, tf: opt }))}
                className={cn('flex-1 h-10 rounded-lg border text-sm font-medium transition-colors',
                  ans.tf === opt ? 'border-correct bg-correct-bg text-correct' : 'border-border hover:bg-slate-50 text-secondary-foreground')}>
                {opt}
              </button>
            ))}
          </div>
        )
      case 'numerical':
        return (
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">정답 값</p>
              <input value={ans.num} onChange={e => setAns(a => ({ ...a, num: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary" placeholder="예) 15" />
            </div>
            <div className="w-32">
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">허용 오차 (±)</p>
              <input value={ans.tol} onChange={e => setAns(a => ({ ...a, tol: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary" placeholder="0" />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderOptionList = () => (
    <div className="space-y-2">
      {stepTwoOptions.map(opt => {
        const isActive = selectedOption === opt.id
        return (
          <button key={opt.id} type="button" onClick={() => setSelectedOption(opt.id)}
            className={cn('w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
              isActive ? cn(opt.activeBorder, opt.bg) : 'border-border bg-white hover:bg-slate-50')}>
            <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
              isActive ? cn(opt.activeBorder, 'bg-white') : 'border-slate-300 bg-white')}>
              {isActive && <div className={cn('w-2 h-2 rounded-full', opt.dotColor)} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[15px] font-semibold', isActive ? opt.color : 'text-foreground')}>
                {!answerChanged && opt.manualTitle ? opt.manualTitle : opt.title}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground leading-relaxed">
                {!answerChanged && opt.manualDesc ? opt.manualDesc : opt.desc}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )

  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>문항 재채점</DialogTitle>
          <DialogDescription>
            {step === 1
              ? '정답을 변경할지 먼저 확인하고, 다음 단계에서 재채점 방식을 선택하세요'
              : '재채점 방식을 선택하세요'}
          </DialogDescription>
        </DialogHeader>

        {/* 단계 표시 */}
        {isAuto && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className={cn('px-2.5 py-1 rounded-full font-medium', step === 1 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}>1 정답 검토</span>
            <span className="text-muted-foreground">—</span>
            <span className={cn('px-2.5 py-1 rounded-full font-medium', step === 2 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}>2 재채점 방식</span>
          </div>
        )}

        <div className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <button type="button" onClick={() => setChangeMode('keep')}
                  className={cn('w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                    changeMode === 'keep' ? 'border-primary bg-accent' : 'border-border bg-white hover:bg-slate-50')}>
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center', changeMode === 'keep' ? 'border-primary bg-white' : 'border-slate-300 bg-white')}>
                    {changeMode === 'keep' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[15px] font-semibold', changeMode === 'keep' ? 'text-primary' : 'text-foreground')}>정답을 변경하지 않음</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">현재 정답 기준으로 재채점합니다</p>
                  </div>
                </button>
                <button type="button" onClick={() => setChangeMode('change')}
                  className={cn('w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                    changeMode === 'change' ? 'border-primary bg-accent' : 'border-border bg-white hover:bg-slate-50')}>
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center', changeMode === 'change' ? 'border-primary bg-white' : 'border-slate-300 bg-white')}>
                    {changeMode === 'change' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[15px] font-semibold', changeMode === 'change' ? 'text-primary' : 'text-foreground')}>정답 변경</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">정답을 수정하거나 추가 인정 답안을 등록합니다</p>
                  </div>
                </button>
              </div>

              {changeMode === 'change' && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  {renderAnswerEditor()}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={onCancel}>취소</Button>
                <Button onClick={goStepTwo}>다음</Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-warning-bg/40 border border-warning-border px-4 py-3">
                <p className="text-[13px] leading-relaxed text-slate-600">
                  이 문항에 응시한 <span className="font-bold">{submittedCount}명</span>의 학생에 대해 재채점을 실행합니다. 확인 시 즉시 반영됩니다.
                </p>
              </div>
              {renderOptionList()}
              <div className="flex justify-between gap-2 pt-1">
                <div>
                  {isAuto && <Button variant="ghost" onClick={() => setStep(1)}>이전</Button>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onCancel}>취소</Button>
                  <Button onClick={handleConfirm}>재채점</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
