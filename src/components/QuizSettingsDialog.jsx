import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'


const STORAGE_KEY = 'xnq_global_settings'

const DEFAULTS = {
  multipleAnswersScoringMode: 'all_correct',
  penaltyMethod: 'none',
  caseSensitive: false,
  whitespaceSensitive: false,
}

export function getGlobalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveGlobalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

const SCORING_MODES = [
  {
    value: 'all_correct',
    label: '전체 정답 시에만 만점',
    desc: '정답을 모두 맞혀야 점수를 받습니다. 하나라도 틀리면 0점.',
  },
  {
    value: 'partial',
    label: '정답 비율 배점 (부분 점수)',
    desc: '맞힌 정답 비율만큼 부분 점수를 받습니다.',
  },
]

const PENALTY_METHODS = [
  {
    value: 'none',
    label: '감점 없음',
    desc: '오답을 선택해도 감점하지 않습니다.',
  },
  {
    value: 'right_minus_wrong',
    label: '오답 차감',
    desc: '오답 1개당 정답 1개분의 점수를 차감합니다.',
    formula: '(정답 수 - 오답 수) / 전체 정답 수 x 배점 (최소 0점)',
  },
  {
    value: 'formula_scoring',
    label: '추측 보정 감점',
    desc: '선택지 수에 따라 감점을 자동 조절하여, 찍기를 억제합니다.',
    formula: '(정답 수 - 오답 수 / (선택지 수 - 1)) / 전체 정답 수 x 배점 (최소 0점)',
  },
]

export default function QuizSettingsDialog({ open, onOpenChange }) {
  const [local, setLocal] = useState(DEFAULTS)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local with global on open
    if (open) setLocal(getGlobalSettings())
  }, [open])

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }))

  const handleSave = () => {
    saveGlobalSettings(local)
    onOpenChange(false)
    window.dispatchEvent(new CustomEvent('xnq-settings-changed'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>퀴즈 전역 설정</DialogTitle>
          <p className="text-[15px] text-muted-foreground">이 설정은 모든 퀴즈에 공통으로 적용됩니다.</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* 복수선택 채점 방식 */}
          <SettingsSection title="복수선택 채점 방식">
            <div className="space-y-2">
              {SCORING_MODES.map(opt => (
                <RadioOption
                  key={opt.value}
                  active={local.multipleAnswersScoringMode === opt.value}
                  onClick={() => {
                    set('multipleAnswersScoringMode', opt.value)
                    if (opt.value === 'all_correct') set('penaltyMethod', 'none')
                  }}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>

            {/* 감점 방식 (partial 선택 시만) */}
            {local.multipleAnswersScoringMode === 'partial' && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                <p className="text-[15px] font-semibold text-slate-600 mb-2">오답 감점 방식</p>
                {PENALTY_METHODS.map(opt => (
                  <RadioOption
                    key={opt.value}
                    active={local.penaltyMethod === opt.value}
                    onClick={() => set('penaltyMethod', opt.value)}
                    label={opt.label}
                    desc={opt.desc}
                    formula={opt.formula}
                  />
                ))}
              </div>
            )}

            {/* 채점 시뮬레이션 */}
            {local.multipleAnswersScoringMode === 'partial' && (
              <ScoringSimulation penaltyMethod={local.penaltyMethod} />
            )}
          </SettingsSection>

          {/* 정답 판정 */}
          <SettingsSection title="정답 판정">
            <SettingsToggle
              checked={local.caseSensitive}
              onChange={v => set('caseSensitive', v)}
              label="영문 대소문자 구분"
              description="단답형/수치형 등 자동채점 시 대소문자를 구분하여 정답을 판정합니다"
            />
            {!local.caseSensitive && (
              <p className="text-xs text-muted-foreground pl-11">
                현재: "Answer"와 "answer"를 동일한 정답으로 처리합니다.
              </p>
            )}
            {local.caseSensitive && (
              <div className="ml-11 flex items-center gap-2 p-2.5 rounded text-xs bg-amber-50/40 border border-amber-300 text-slate-600">
                <span>"Answer"와 "answer"를 다른 답으로 처리합니다. 학생 혼란 방지를 위해 퀴즈 안내사항에 명시를 권장합니다.</span>
              </div>
            )}

            <div className="pt-3 mt-1 border-t border-slate-100">
              <SettingsToggle
                checked={local.whitespaceSensitive}
                onChange={v => set('whitespaceSensitive', v)}
                label="띄어쓰기 구분"
                description="단답형/빈칸 채우기 등 자동채점 시 띄어쓰기를 구분하여 정답을 판정합니다"
              />
              {!local.whitespaceSensitive && (
                <p className="text-xs text-muted-foreground pl-11 mt-2">
                  현재: "key word"와 "keyword"를 동일한 정답으로 처리합니다.
                </p>
              )}
              {local.whitespaceSensitive && (
                <div className="ml-11 flex items-center gap-2 p-2.5 rounded text-xs bg-amber-50/40 border border-amber-300 text-slate-600 mt-2">
                  <span>"key word"와 "keyword"를 다른 답으로 처리합니다. 학생 혼란 방지를 위해 퀴즈 안내사항에 명시를 권장합니다.</span>
                </div>
              )}
            </div>
          </SettingsSection>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RadioOption({ active, onClick, label, desc, formula }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-all border',
        active ? 'border-primary bg-accent' : 'border-border bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-colors',
          active ? 'border-primary' : 'border-slate-300'
        )}>
          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-[15px] font-semibold flex items-center gap-1', active ? 'text-primary' : 'text-slate-700')}>
            {label}
            {formula && <FormulaTooltip formula={formula} />}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  )
}

function FormulaTooltip({ formula }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold border border-slate-300 text-muted-foreground cursor-help leading-none">?</span>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max max-w-[260px] px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-[11px] leading-relaxed shadow-lg pointer-events-none">
          <span className="font-semibold block mb-0.5">산출 공식</span>
          {formula}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-800" />
        </span>
      )}
    </span>
  )
}

function SettingsSection({ title, children }) {
  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-3">
        <h3 className="text-[15px] font-semibold pb-2 border-b border-border text-slate-700">{title}</h3>
        {children}
      </CardContent>
    </Card>
  )
}

function SettingsToggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 data-[state=checked]:bg-primary" />
      <div>
        <p className="text-[15px] font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs mt-0.5 text-muted-foreground">{description}</p>}
      </div>
    </label>
  )
}

const SIM_INPUT = "w-14 text-center text-xs px-1.5 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:border-primary transition-colors"
const CHOICE_LABELS = 'ABCDEFGHIJ'.split('')

function ScoringSimulation({ penaltyMethod }) {
  const [expanded, setExpanded] = useState(false)
  const [points, setPoints] = useState(10)
  const [totalCorrect, setTotalCorrect] = useState(2)
  const [totalChoices, setTotalChoices] = useState(5)
  const [selected, setSelected] = useState(new Set())

  const safeCorrect = Math.max(1, Math.min(totalCorrect, totalChoices - 1))
  const correctSet = new Set(Array.from({ length: safeCorrect }, (_, i) => i))

  // 조건 변경 시 선택 초기화
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection on constraint change
    setSelected(new Set())
  }, [totalChoices, totalCorrect, points])

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const correctCount = [...selected].filter(i => correctSet.has(i)).length
  const wrongCount = [...selected].filter(i => !correctSet.has(i)).length

  function calc(method) {
    if (selected.size === 0) return 0
    const tc = safeCorrect, p = points
    if (method === 'none') return Math.round((correctCount / tc) * p * 10) / 10
    if (method === 'right_minus_wrong') return Math.max(0, Math.round(((correctCount - wrongCount) / tc) * p * 10) / 10)
    const divisor = Math.max(totalChoices - 1, 1)
    return Math.max(0, Math.round(((correctCount - wrongCount / divisor) / tc) * p * 10) / 10)
  }

  const methods = [
    { key: 'none', label: '감점 없음' },
    { key: 'right_minus_wrong', label: '오답 차감' },
    { key: 'formula_scoring', label: '추측 보정' },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
      >
        <span>채점 시뮬레이션</span>
        <svg
          className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!expanded ? null : <div className="mt-2.5">
      {/* 조건 입력 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 text-xs text-slate-600">
        <label className="flex items-center gap-1.5">
          배점
          <input type="number" min={1} max={100} value={points} onChange={e => setPoints(Math.max(1, Number(e.target.value) || 1))} className={SIM_INPUT} />
          점
        </label>
        <label className="flex items-center gap-1.5">
          선택지
          <input type="number" min={2} max={10} value={totalChoices} onChange={e => { const v = Math.max(2, Number(e.target.value) || 2); setTotalChoices(v); if (totalCorrect >= v) setTotalCorrect(v - 1) }} className={SIM_INPUT} />
          개
        </label>
        <label className="flex items-center gap-1.5">
          정답
          <input type="number" min={1} max={totalChoices - 1} value={safeCorrect} onChange={e => setTotalCorrect(Math.max(1, Math.min(totalChoices - 1, Number(e.target.value) || 1)))} className={SIM_INPUT} />
          개
        </label>
      </div>

      {/* 선택지 버튼 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from({ length: totalChoices }, (_, i) => {
          const isCorrect = correctSet.has(i)
          const isSelected = selected.has(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all',
                isSelected
                  ? isCorrect
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-red-300 bg-red-50 text-red-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              )}
            >
              <span className={cn(
                'w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px] shrink-0',
                isSelected
                  ? isCorrect ? 'bg-green-500 border-green-500 text-white' : 'bg-red-400 border-red-400 text-white'
                  : 'border-slate-300'
              )}>
                {isSelected && '✓'}
              </span>
              {CHOICE_LABELS[i]}
              {isCorrect && (
                <span className="text-[9px] text-green-500 font-normal">정답</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 점수 결과 */}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        {/* 현재 선택 요약 */}
        <div className="px-2.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {selected.size === 0
              ? '선택지를 클릭해보세요'
              : `정답 ${correctCount}개, 오답 ${wrongCount}개 선택`
            }
          </span>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-[11px] text-muted-foreground hover:text-slate-600 transition-colors">초기화</button>
          )}
        </div>

        {/* 방식별 점수 비교 */}
        <div className="grid grid-cols-3 divide-x divide-slate-200">
          {methods.map(m => {
            const score = calc(m.key)
            const isActive = m.key === penaltyMethod
            return (
              <div key={m.key} className={cn('py-2 px-2 text-center', isActive && 'bg-blue-50/60')}>
                <p className={cn('text-[10px] mb-0.5', isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>{m.label}</p>
                <p className={cn(
                  'text-[15px] tabular-nums font-bold',
                  isActive
                    ? score === points ? 'text-primary' : score === 0 && selected.size > 0 ? 'text-red-500' : 'text-slate-800'
                    : 'text-muted-foreground'
                )}>
                  {score}점
                </p>
              </div>
            )
          })}
        </div>
      </div>
      </div>}
    </div>
  )
}
