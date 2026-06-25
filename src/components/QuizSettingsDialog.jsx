import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { GLOBAL_SETTINGS_DEFAULTS as DEFAULTS, getGlobalSettings, saveGlobalSettings } from '@/utils/quizGlobalSettings'
import { DEMO_STUDENTS } from '@/context/role'
import CustomSelect from './CustomSelect'

const ACCOMMODATION_UNITS = [
  { value: 'minutes', label: '분' },
  { value: 'percent', label: '%' },
]

const SCORE_POLICY_OPTIONS = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))
const REVEAL_TIMING_OPTIONS = [
  { value: 'immediately', label: '제출 즉시' },
  { value: 'after_due', label: '마감 후' },
  { value: 'period', label: '기간 설정' },
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

  // 응시 편의 지원: 학생별 추가 시간 (수량 + 단위). 수량 0/빈값은 미적용이지만,
  // 단위 선택을 유지하려고 입력 중에는 항목을 보존하고 저장 시점에 0 이하를 걸러낸다.
  const updateAccommodation = (studentId, patch) => {
    setLocal(prev => {
      const list = prev.accommodations || []
      const existing = list.find(a => a.studentId === studentId) || { studentId, extraAmount: 0, extraUnit: 'minutes' }
      const next = { studentId, extraAmount: existing.extraAmount ?? existing.extraTimePercent ?? 0, extraUnit: existing.extraUnit ?? (existing.extraTimePercent != null ? 'percent' : 'minutes'), ...patch }
      return { ...prev, accommodations: [...list.filter(a => a.studentId !== studentId), next] }
    })
  }

  const handleSave = () => {
    // 수량 0 이하 항목은 저장하지 않는다
    const cleaned = { ...local, accommodations: (local.accommodations || []).filter(a => Number(a.extraAmount) > 0) }
    saveGlobalSettings(cleaned)
    onOpenChange(false)
    window.dispatchEvent(new CustomEvent('xnq-settings-changed'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>퀴즈 기본 설정</DialogTitle>
          <p className="text-[15px] text-muted-foreground">이 설정은 모든 퀴즈에 기본값으로 적용됩니다. 복수 선택 문항은 문항 단위로 정책을 변경할 수 있습니다.</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* 복수 정답 문항 부분 점수 */}
          <SettingsSection title="복수선택 채점 방식 기본값">
            <p className="text-xs text-muted-foreground -mt-1">복수 선택 문항을 기본적으로 어떻게 채점할지 정합니다. 문항별로 다르게 설정할 수 있습니다.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <RadioChoice
                active={local.multipleAnswersScoringMode === 'all_correct'}
                onClick={() => { set('multipleAnswersScoringMode', 'all_correct'); set('penaltyMethod', 'none') }}
                label="전체 정답 시 만점"
              />
              <RadioChoice
                active={local.multipleAnswersScoringMode === 'partial'}
                onClick={() => set('multipleAnswersScoringMode', 'partial')}
                label="부분 점수"
              />
            </div>

            {local.multipleAnswersScoringMode === 'partial' && (
              <div className="pt-3 mt-1 border-t border-slate-100 space-y-2">
                <p className="text-[15px] font-semibold text-slate-700">감점 방식</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {PENALTY_METHODS.map(p => {
                    const active = local.penaltyMethod === p.value
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => set('penaltyMethod', p.value)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors',
                          active ? 'border-primary bg-accent text-primary font-medium' : 'border-border bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <span>{p.label}</span>
                        <HoverHint>
                          {p.desc}
                          {p.formula && <span className="block mt-1 text-white/80">{p.formula}</span>}
                        </HoverHint>
                      </button>
                    )
                  })}
                </div>
              </div>
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
              <div className="ml-11 flex items-center gap-2 p-2.5 rounded text-xs bg-warning-bg/40 border border-warning-border text-slate-600">
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
                <div className="ml-11 flex items-center gap-2 p-2.5 rounded text-xs bg-warning-bg/40 border border-warning-border text-slate-600 mt-2">
                  <span>"key word"와 "keyword"를 다른 답으로 처리합니다. 학생 혼란 방지를 위해 퀴즈 안내사항에 명시를 권장합니다.</span>
                </div>
              )}
            </div>

            <div className="pt-3 mt-1 border-t border-slate-100">
              <SettingsToggle
                checked={local.shortAnswerFuzzy}
                onChange={v => set('shortAnswerFuzzy', v)}
                label="단답형 유사 표현 허용"
                description="단답형·빈칸 채점 시 오탈자를 일정 글자 수까지 정답으로 인정합니다"
              />
              {local.shortAnswerFuzzy ? (
                <div className="ml-11 mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-xs">허용 오타</span>
                  <Stepper value={local.shortAnswerFuzzyDistance ?? 1} min={1} max={5} suffix="글자" onChange={v => set('shortAnswerFuzzyDistance', v)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-11 mt-2">현재: "데이터베이스"와 "데이타베이스"를 다른 답으로 처리합니다.</p>
              )}
            </div>

            <div className="pt-3 mt-1 border-t border-slate-100">
              <SettingsToggle
                checked={local.matchingPartial}
                onChange={v => set('matchingPartial', v)}
                label="짝짓기 부분 점수"
                description="연결형(짝짓기) 문항에서 맞힌 연결 개수 비율만큼 부분 점수를 부여합니다"
              />
            </div>
          </SettingsSection>

          {/* 신규 퀴즈 기본값 (D-05) */}
          <SettingsSection title="신규 퀴즈 기본값">
            <p className="text-xs text-muted-foreground -mt-1">새 퀴즈를 만들 때 자동으로 적용됩니다. 개별 퀴즈에서 언제든 변경할 수 있습니다.</p>

            {/* 응시 횟수 */}
            <div className="space-y-2">
              <p className="text-[15px] font-medium text-slate-700">응시 횟수</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[{ v: 1, l: '1회' }, { v: 2, l: '여러 번' }, { v: -1, l: '무제한' }].map(opt => {
                  const active = opt.v === 1 ? local.defaultAllowAttempts === 1
                    : opt.v === -1 ? local.defaultAllowAttempts === -1
                    : local.defaultAllowAttempts >= 2
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set('defaultAllowAttempts', opt.v)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm border transition-colors',
                        active ? 'border-primary bg-accent text-primary font-medium' : 'border-border bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {opt.l}
                    </button>
                  )
                })}
                {local.defaultAllowAttempts >= 2 && (
                  <input
                    type="number" min={2} max={99} value={local.defaultAllowAttempts}
                    onChange={e => set('defaultAllowAttempts', Math.max(2, Number(e.target.value) || 2))}
                    className="w-16 text-center text-sm px-2 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            </div>

            {/* 성적 반영 방식 */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <p className="text-[15px] font-medium text-slate-700">성적 반영 방식</p>
              <p className="text-xs text-muted-foreground">여러 번 응시한 경우 어떤 점수를 성적으로 반영할지 정합니다.</p>
              <PillGroup options={SCORE_POLICY_OPTIONS} value={local.defaultScorePolicy} onChange={v => set('defaultScorePolicy', v)} />
            </div>

            {/* 결과 공개 */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <SettingsToggle
                checked={local.defaultScoreRevealEnabled}
                onChange={v => set('defaultScoreRevealEnabled', v)}
                label="결과 공개"
                description="제출 후 학생에게 점수와 정답을 공개합니다. 기본값은 비공개입니다."
              />
              {local.defaultScoreRevealEnabled && (
                <div className="ml-11">
                  <p className="text-xs text-muted-foreground mb-1.5">공개 시점</p>
                  <PillGroup options={REVEAL_TIMING_OPTIONS} value={local.defaultScoreRevealTiming} onChange={v => set('defaultScoreRevealTiming', v)} />
                </div>
              )}
            </div>
          </SettingsSection>

          {/* 응시 편의 지원 (Accommodation, 7.7) */}
          <SettingsSection title="응시 편의 지원">
            <p className="text-xs text-muted-foreground -mt-1">특정 학생에게 추가 시간을 부여합니다. 한 번 설정하면 이 과목의 모든 시간 제한 퀴즈에 자동 적용됩니다. 날짜 연장은 퀴즈별 추가 할당에서 설정합니다.</p>
            <div className="space-y-2">
              {DEMO_STUDENTS.map(s => {
                const acc = (local.accommodations || []).find(a => a.studentId === s.id)
                const rawAmount = acc?.extraAmount ?? acc?.extraTimePercent
                const amount = Number(rawAmount) > 0 ? String(rawAmount) : ''
                const unit = acc?.extraUnit ?? (acc?.extraTimePercent != null ? 'percent' : 'minutes')
                const active = amount !== ''
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors',
                      active ? 'border-primary/40 bg-accent/40' : 'border-border bg-white'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.studentId} · {s.department}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">추가 시간</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={e => updateAccommodation(s.id, { extraAmount: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                        placeholder="0"
                        aria-label={`${s.name} 추가 시간 수량`}
                        className="w-16 text-center text-sm px-2 py-2.5 rounded-md border border-border bg-white text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"
                      />
                      <CustomSelect
                        value={unit}
                        onChange={v => updateAccommodation(s.id, { extraUnit: v })}
                        options={ACCOMMODATION_UNITS}
                        className="w-[68px]"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">예: 제한 시간 60분 퀴즈 기준 +50%는 90분, +30분은 90분이 부여됩니다.</p>
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

// 모달 안에서는 portal 드롭다운(CustomSelect)이 막히므로 인라인 pill 버튼 사용
function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(opt => {
        const active = String(opt.value) === String(value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm border transition-colors',
              active ? 'border-primary bg-accent text-primary font-medium' : 'border-border bg-white text-slate-600 hover:border-slate-300'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// 기본값을 고르는 라디오 버튼 (항상 하나 선택, border 없이 가볍게)
function RadioChoice({ active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-left">
      <span className={cn(
        'w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-colors',
        active ? 'border-primary' : 'border-slate-300'
      )}>
        {active && <span className="w-2 h-2 rounded-full bg-primary" />}
      </span>
      <span className={cn('text-sm', active ? 'text-primary font-medium' : 'text-slate-600')}>{label}</span>
    </button>
  )
}

function Stepper({ value, min = 1, max = 9, onChange, suffix = '' }) {
  const v = Number(value) || min
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, v - 1))}
        disabled={v <= min}
        className="px-2.5 py-1 text-slate-500 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="감소"
      >
        −
      </button>
      <span className="px-3 py-1 text-sm font-medium text-foreground tabular-nums border-x border-border min-w-[52px] text-center">{v}{suffix}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, v + 1))}
        disabled={v >= max}
        className="px-2.5 py-1 text-slate-500 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="증가"
      >
        +
      </button>
    </div>
  )
}

// 안내 아이콘(?) 호버 시 설명 툴팁 표시 (포털 없이 인라인 absolute)
function HoverHint({ children }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold border border-slate-300 text-muted-foreground cursor-help leading-none">?</span>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max max-w-[260px] px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-[11px] leading-relaxed shadow-lg pointer-events-none text-left">
          {children}
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
