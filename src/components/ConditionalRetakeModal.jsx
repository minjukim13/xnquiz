import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { UserCheck, AlertCircle, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const STORAGE_KEY = 'xnq_conditional_retakes'

function getRetakeRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveRetakeRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch { /* ignore */ }
}

export function getRetakeGrants(quizId) {
  const records = getRetakeRecords()
  return records[quizId] || []
}

export default function ConditionalRetakeModal({ open, onOpenChange, quizId, quizInfo, students, onComplete }) {
  const [step, setStep] = useState(1)

  const [includeNotSubmitted, setIncludeNotSubmitted] = useState(true)
  const [includeScoreBelow, setIncludeScoreBelow] = useState(true)
  const [scoreThreshold, setScoreThreshold] = useState(60)
  const [excludedIds, setExcludedIds] = useState(new Set())
  const [additionalAttempts, setAdditionalAttempts] = useState(1)
  const [retakeDeadline, setRetakeDeadline] = useState('')

  const totalPoints = quizInfo?.totalPoints || 100
  const thresholdScore = Math.round(totalPoints * scoreThreshold / 100)

  const matchedStudents = useMemo(() => {
    if (!students) return []
    const matched = []
    students.forEach(s => {
      let reason = null
      if (!s.submitted && includeNotSubmitted) {
        reason = '미응시'
      } else if (s.submitted && includeScoreBelow && s.score !== null && s.score < thresholdScore) {
        reason = `${s.score}점`
      } else if (s.submitted && includeScoreBelow && s.score === null) {
        reason = '채점 미완료'
      }
      if (reason) matched.push({ ...s, retakeReason: reason })
    })
    return matched
  }, [students, includeNotSubmitted, includeScoreBelow, thresholdScore])

  const finalTargets = matchedStudents.filter(s => !excludedIds.has(s.id))
  const noConditionSelected = !includeNotSubmitted && !includeScoreBelow

  const notSubmittedCount = matchedStudents.filter(s => s.retakeReason === '미응시').length
  const scoreBelowCount = matchedStudents.filter(s => s.retakeReason !== '미응시' && s.retakeReason !== '채점 미완료').length
  const ungradedCount = matchedStudents.filter(s => s.retakeReason === '채점 미완료').length

  const toggleExclude = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const records = getRetakeRecords()
    const existing = records[quizId] || []
    const now = new Date().toISOString()
    const newGrants = finalTargets.map(s => ({
      studentId: s.id, studentName: s.name, studentNumber: s.studentId,
      reason: s.retakeReason, additionalAttempts,
      retakeDeadline: retakeDeadline || null, grantedAt: now,
      scoreThreshold: includeScoreBelow ? scoreThreshold : null,
    }))
    records[quizId] = [...existing, ...newGrants]
    saveRetakeRecords(records)
    onComplete?.(finalTargets.length, additionalAttempts)
    onOpenChange(false)
    setStep(1); setExcludedIds(new Set()); setRetakeDeadline('')
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep(1); setExcludedIds(new Set()); setRetakeDeadline('')
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <div>

          {/* --- 헤더 --- */}
          <DialogHeader className="mb-6">
            <DialogTitle>조건부 재응시 부여</DialogTitle>
            <DialogDescription>조건에 해당하는 학생에게만 추가 응시 기회를 부여합니다.</DialogDescription>
          </DialogHeader>

          {/* --- 스텝 바 --- */}
          <div className="flex items-center justify-center gap-5 mb-8">
            {[
              { n: 1, label: '조건 설정' },
              { n: 2, label: '대상자 확인' },
              { n: 3, label: '횟수 부여' },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-5">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    step >= n ? 'bg-primary text-white' : 'bg-secondary text-caption',
                  )}>
                    {step > n ? <Check size={12} /> : n}
                  </span>
                  <span className={cn(
                    'text-[13px] whitespace-nowrap',
                    step === n ? 'font-bold text-foreground' : step > n ? 'font-medium text-secondary-foreground' : 'font-medium text-caption',
                  )}>{label}</span>
                </div>
                {i < 2 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
              </div>
            ))}
          </div>

          {/* --- Step 1: 조건 설정 --- */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="bg-secondary rounded-xl p-5">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <Switch checked={includeNotSubmitted} onCheckedChange={setIncludeNotSubmitted} className="mt-0.5 data-[state=checked]:bg-primary" />
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">미응시자 포함</p>
                    <p className="text-[13px] text-muted-foreground mt-1">퀴즈에 응시하지 않은 학생을 재응시 대상에 포함합니다.</p>
                  </div>
                </label>

                <div className="h-px bg-border my-5" />

                <label className="flex items-start gap-3.5 cursor-pointer">
                  <Switch checked={includeScoreBelow} onCheckedChange={setIncludeScoreBelow} className="mt-0.5 data-[state=checked]:bg-primary" />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-foreground">점수 미달자 포함</p>
                    <p className="text-[13px] text-muted-foreground mt-1">기준 점수 미만인 학생을 재응시 대상에 포함합니다.</p>
                    {includeScoreBelow && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[13px] text-secondary-foreground">기준 점수</span>
                        <input
                          type="number" min={0} max={100} value={scoreThreshold}
                          onChange={e => setScoreThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          className="w-14 text-center text-sm font-semibold px-2 py-1.5 rounded-lg border border-border text-foreground outline-none"
                        />
                        <span className="text-[13px] text-secondary-foreground">% 미만</span>
                        <span className="text-xs text-caption ml-1">({thresholdScore}점 / {totalPoints}점)</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {noConditionSelected && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span className="text-[13px] text-amber-800">조건을 하나 이상 선택해주세요.</span>
                </div>
              )}

              {!noConditionSelected && (
                <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-secondary">
                  <span className="text-[15px] font-bold text-foreground">총 {matchedStudents.length}명 대상</span>
                  <span className="text-[13px] text-muted-foreground">
                    {[
                      includeNotSubmitted && notSubmittedCount > 0 && `미응시 ${notSubmittedCount}명`,
                      includeScoreBelow && scoreBelowCount > 0 && `점수 미달 ${scoreBelowCount}명`,
                      ungradedCount > 0 && `채점 미완료 ${ungradedCount}명`,
                    ].filter(Boolean).join(' / ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* --- Step 2: 대상자 확인 --- */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-secondary-foreground">
                총 <span className="font-bold text-primary">{matchedStudents.length}</span>명 중{' '}
                <span className="font-bold text-foreground">{finalTargets.length}</span>명 선택됨
              </p>

              <div className="border border-border rounded-xl overflow-hidden">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-[36px_1fr_1fr_1fr_0.7fr] items-center px-4 py-2.5 bg-slate-50 border-b border-border">
                  <button
                    type="button"
                    onClick={() => {
                      if (excludedIds.size === 0) setExcludedIds(new Set(matchedStudents.map(s => s.id)))
                      else setExcludedIds(new Set())
                    }}
                    className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center cursor-pointer p-0 transition-all',
                      excludedIds.size === 0 && matchedStudents.length > 0
                        ? 'bg-primary border-[1.5px] border-primary'
                        : 'bg-white border-[1.5px] border-slate-300',
                    )}
                  >
                    {excludedIds.size === 0 && matchedStudents.length > 0 && <Check size={12} className="text-white" />}
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground text-center">이름</span>
                  <span className="text-xs font-semibold text-muted-foreground text-center">학번</span>
                  <span className="text-xs font-semibold text-muted-foreground text-center">학과</span>
                  <span className="text-xs font-semibold text-muted-foreground text-center">사유</span>
                </div>
                {/* 테이블 바디 */}
                <div className="max-h-80 overflow-y-auto">
                  {matchedStudents.length === 0 ? (
                    <div className="py-10 text-center text-sm text-caption">조건에 해당하는 학생이 없습니다.</div>
                  ) : (
                    matchedStudents.map((s, idx) => {
                      const isExcluded = excludedIds.has(s.id)
                      return (
                        <button
                          key={s.id} type="button"
                          onClick={() => toggleExclude(s.id)}
                          className={cn(
                            'grid grid-cols-[36px_1fr_1fr_1fr_0.7fr] items-center w-full text-center px-4 py-3 border-0 cursor-pointer transition-all hover:bg-slate-50',
                            isExcluded ? 'bg-slate-50 opacity-45' : 'bg-white',
                            idx < matchedStudents.length - 1 && 'border-b border-secondary',
                          )}
                        >
                          <span className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all',
                            isExcluded
                              ? 'bg-white border-[1.5px] border-slate-300'
                              : 'bg-primary border-[1.5px] border-primary',
                          )}>
                            {!isExcluded && <Check size={12} className="text-white" />}
                          </span>
                          <span className="text-sm font-semibold text-foreground text-center">{s.name}</span>
                          <span className="text-[13px] text-slate-500 text-center">{s.studentId}</span>
                          <span className="text-[13px] text-slate-500 text-center">{s.department}</span>
                          <span className={cn(
                            'text-[13px] font-medium text-center',
                            s.retakeReason === '미응시' ? 'text-muted-foreground' : 'text-destructive',
                          )}>
                            {s.retakeReason}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- Step 3: 횟수 부여 --- */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="bg-secondary rounded-xl px-5 py-4">
                <p className="text-[15px] font-bold text-foreground">{finalTargets.length}명에게 추가 응시 기회를 부여합니다.</p>
              </div>

              <div className="bg-secondary rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-semibold text-foreground">추가 응시 횟수</p>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setAdditionalAttempts(prev => Math.max(1, prev - 1))}
                      disabled={additionalAttempts <= 1}
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-l-lg border border-border border-r-0 bg-white text-lg font-medium',
                        additionalAttempts <= 1 ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-secondary-foreground',
                      )}
                    >-</button>
                    <span className="w-12 h-9 flex items-center justify-center text-[15px] font-bold text-foreground border-t border-b border-border bg-white">
                      {additionalAttempts}회
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdditionalAttempts(prev => Math.min(5, prev + 1))}
                      disabled={additionalAttempts >= 5}
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-r-lg border border-border border-l-0 bg-white text-lg font-medium',
                        additionalAttempts >= 5 ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-secondary-foreground',
                      )}
                    >+</button>
                  </div>
                </div>

                <div className="h-px bg-border my-5" />

                <p className="text-[15px] font-semibold text-foreground mb-1.5">재응시 기한</p>
                <p className="text-[13px] text-muted-foreground mb-3">미설정 시 기존 퀴즈 마감일을 따릅니다.</p>
                <input
                  type="datetime-local" value={retakeDeadline}
                  onChange={e => setRetakeDeadline(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-[10px] border border-border text-foreground outline-none"
                />
              </div>

              {/* 최종 요약 */}
              <div className="bg-secondary rounded-xl p-5">
                <p className="text-[15px] font-semibold text-foreground mb-3.5">최종 요약</p>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-foreground">대상 인원</span>
                    <span className="text-sm font-semibold text-foreground">{finalTargets.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-foreground">추가 응시 횟수</span>
                    <span className="text-sm font-semibold text-foreground">{additionalAttempts}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-foreground">재응시 기한</span>
                    <span className="text-sm font-semibold text-foreground">{retakeDeadline ? retakeDeadline.replace('T', ' ') : '퀴즈 마감일 따름'}</span>
                  </div>
                  {includeNotSubmitted && (
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary-foreground">미응시자</span>
                      <span className="text-sm font-semibold text-muted-foreground">{finalTargets.filter(s => s.retakeReason === '미응시').length}명</span>
                    </div>
                  )}
                  {includeScoreBelow && (
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary-foreground">점수 미달 ({scoreThreshold}% 미만)</span>
                      <span className="text-sm font-semibold text-muted-foreground">{finalTargets.filter(s => s.retakeReason !== '미응시' && s.retakeReason !== '채점 미완료').length}명</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- 하단 버튼 바 --- */}
        <div className="flex items-center justify-between pt-3 gap-3">
          <div>
            {step > 1 && (
              <Button size="sm" variant="outline" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={14} />
                이전
              </Button>
            )}
          </div>
          <div className="flex gap-2.5">
            <Button size="sm" variant="outline" onClick={handleClose}>취소</Button>
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={noConditionSelected || (step === 2 && finalTargets.length === 0)}
              >
                다음
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={finalTargets.length === 0}
              >
                <UserCheck size={14} />
                재응시 부여
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
