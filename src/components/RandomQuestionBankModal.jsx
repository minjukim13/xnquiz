import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useQuestionBank } from '../context/QuestionBankContext'
import { QUIZ_TYPES } from '../data/mockData'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }
const DIFFICULTY_COLORS = {
  high:   { bg: '#FFF0EF', text: '#B91C1C', border: '#FECACA' },
  medium: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  low:    { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
}

export default function RandomQuestionBankModal({ open, onOpenChange, currentCourse, onAdd, added = [] }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [step, setStep] = useState(1)

  // Step 1: 복수 은행 선택
  const [selectedBankIds, setSelectedBankIds] = useState(new Set())
  const [showOtherCourses, setShowOtherCourses] = useState(false)

  // Step 2: 은행별 설정
  const [bankConfigs, setBankConfigs] = useState({})
  const [useDifficultyScoring, setUseDifficultyScoring] = useState(false)

  // 미리보기 상태
  const [previewBankId, setPreviewBankId] = useState(null)

  const currentBanks = currentCourse ? banks.filter(b => b.course === currentCourse) : banks
  const otherBanks = currentCourse ? banks.filter(b => b.course !== currentCourse) : []

  // 과목별 그룹핑
  const otherGrouped = useMemo(() => {
    return otherBanks.reduce((acc, b) => {
      const key = b.course ?? '기타'
      if (!acc[key]) acc[key] = []
      acc[key].push(b)
      return acc
    }, {})
  }, [otherBanks])

  const toggleBank = (id) => {
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllCurrent = () => {
    const ids = currentBanks.map(b => b.id)
    const allSelected = ids.every(id => selectedBankIds.has(id))
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  // Step 2 초기화
  const goToStep2 = () => {
    const configs = {}
    selectedBankIds.forEach(bankId => {
      const questions = getBankQuestions(bankId)
      const available = questions.filter(q => !added.includes(q.id))
      const byDifficulty = { high: 0, medium: 0, low: 0 }
      available.forEach(q => {
        if (q.difficulty && byDifficulty[q.difficulty] !== undefined) {
          byDifficulty[q.difficulty]++
        }
      })
      configs[bankId] = {
        count: Math.min(5, available.length),
        maxCount: available.length,
        points: 5,
        difficultyPoints: { high: 6, medium: 5, low: 4 },
        byDifficulty,
        totalAvailable: available.length,
      }
    })
    setBankConfigs(configs)
    setStep(2)
  }

  const updateConfig = (bankId, key, value) => {
    setBankConfigs(prev => ({
      ...prev,
      [bankId]: { ...prev[bankId], [key]: value },
    }))
  }

  const updateDifficultyPoints = (bankId, difficulty, value) => {
    setBankConfigs(prev => ({
      ...prev,
      [bankId]: {
        ...prev[bankId],
        difficultyPoints: { ...prev[bankId].difficultyPoints, [difficulty]: value },
      },
    }))
  }

  // 총 출제 문항 수 / 총점
  const summary = useMemo(() => {
    let totalCount = 0
    let totalPoints = 0
    Object.entries(bankConfigs).forEach(([bankId, cfg]) => {
      totalCount += cfg.count
      if (useDifficultyScoring) {
        const questions = getBankQuestions(bankId).filter(q => !added.includes(q.id))
        // 난이도별 비율 기반 추정 점수
        const diffCounts = { high: 0, medium: 0, low: 0, none: 0 }
        questions.forEach(q => {
          if (q.difficulty && diffCounts[q.difficulty] !== undefined) diffCounts[q.difficulty]++
          else diffCounts.none++
        })
        const total = questions.length || 1
        totalPoints += Math.round(
          cfg.count * (
            (diffCounts.high / total) * cfg.difficultyPoints.high +
            (diffCounts.medium / total) * cfg.difficultyPoints.medium +
            (diffCounts.low / total) * cfg.difficultyPoints.low +
            (diffCounts.none / total) * cfg.points
          )
        )
      } else {
        totalPoints += cfg.count * cfg.points
      }
    })
    return { totalCount, totalPoints }
  }, [bankConfigs, useDifficultyScoring, getBankQuestions, added])

  // 랜덤 출제 실행
  const handleConfirm = () => {
    const addedQuestions = []

    Object.entries(bankConfigs).forEach(([bankId, cfg]) => {
      const questions = getBankQuestions(bankId).filter(q => !added.includes(q.id))
      const bank = banks.find(b => b.id === bankId)

      // 셔플 후 count만큼 선택
      const shuffled = [...questions].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, cfg.count)

      selected.forEach(q => {
        const points = useDifficultyScoring && q.difficulty && cfg.difficultyPoints[q.difficulty]
          ? cfg.difficultyPoints[q.difficulty]
          : cfg.points
        addedQuestions.push({
          ...q,
          points,
          bankName: bank?.name,
          randomPicked: true,
        })
      })
    })

    addedQuestions.forEach(q => onAdd(q))
    handleClose()
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
    setSelectedBankIds(new Set())
    setBankConfigs({})
    setUseDifficultyScoring(false)
    setPreviewBankId(null)
  }

  const previewQuestions = previewBankId ? getBankQuestions(previewBankId) : []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            복수 문제은행 랜덤 출제
          </DialogTitle>
          <DialogDescription>여러 문제은행에서 조건에 맞는 문항을 랜덤으로 출제합니다.</DialogDescription>
        </DialogHeader>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-1">
          {[
            { n: 1, label: '문제은행 선택' },
            { n: 2, label: '출제 옵션 설정' },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  step > n ? 'bg-green-500 text-white'
                    : step === n ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-muted-foreground'
                )}>
                  {step > n ? <Check size={10} /> : n}
                </span>
                <span className={cn(
                  'text-xs whitespace-nowrap',
                  step === n ? 'font-semibold text-slate-700' : 'text-muted-foreground'
                )}>{label}</span>
              </div>
              {i < 1 && <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step 1: 문제은행 복수 선택 */}
        {step === 1 && (
          <div className="space-y-4">
            {/* 현재 과목 은행 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {currentCourse && (
                  <p className="text-[13px]">
                    <span className="font-semibold text-foreground">{currentCourse.split(' ').slice(1).join(' ')}</span>
                    {' '}
                    <span className="text-muted-foreground">{currentCourse.split(' ')[0]}</span>
                  </p>
                )}
                {currentBanks.length > 0 && (
                  <button onClick={toggleAllCurrent} className="text-xs text-primary hover:underline">
                    {currentBanks.every(b => selectedBankIds.has(b.id)) ? '전체 해제' : '전체 선택'}
                  </button>
                )}
              </div>

              {currentBanks.length === 0 ? (
                <p className="text-xs py-3 text-center text-muted-foreground">이 과목에 등록된 문제은행이 없습니다</p>
              ) : (
                <div className="rounded-lg space-y-1">
                  {currentBanks.map(b => {
                    const questions = getBankQuestions(b.id)
                    const available = questions.filter(q => !added.includes(q.id))
                    const isSelected = selectedBankIds.has(b.id)
                    const diffLabel = b.difficulty ? DIFFICULTY_LABELS[b.difficulty] : null
                    const diffColor = b.difficulty ? DIFFICULTY_COLORS[b.difficulty] : null
                    return (
                      <div key={b.id} className={cn(
                        'group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                        isSelected ? 'bg-background' : ''
                      )}>
                        <button
                          type="button"
                          onClick={() => toggleBank(b.id)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                          )}
                        >
                          {isSelected && <Check size={10} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{b.name}</span>
                            {diffLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: diffColor?.bg, color: diffColor?.text }}>
                                {diffLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{available.length}개 출제 가능 (전체 {questions.length}개)</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewBankId(previewBankId === b.id ? null : b.id) }}
                          className={cn(
                            'text-[13px] font-semibold px-[10px] py-[6px] rounded-[6px] transition-colors shrink-0 bg-transparent border-0',
                            previewBankId === b.id
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-foreground group-hover:text-foreground'
                          )}
                        >
                          미리보기
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 미리보기 패널 */}
            {previewBankId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 max-h-[200px] overflow-y-auto">
                <p className="text-xs font-semibold text-primary mb-2">
                  {banks.find(b => b.id === previewBankId)?.name} - 문항 미리보기
                </p>
                <div className="space-y-1.5">
                  {previewQuestions.slice(0, 10).map((q, i) => {
                    const diff = DIFFICULTY_COLORS[q.difficulty]
                    return (
                      <div key={q.id} className="flex items-start gap-2 text-xs bg-white rounded px-2.5 py-2 border border-slate-100">
                        <span className="text-muted-foreground font-medium shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                              {QUIZ_TYPES[q.type]?.label}
                            </span>
                            {q.difficulty && (
                              <span className="px-1 py-0.5 rounded text-[10px] font-medium" style={{ background: diff?.bg, color: diff?.text }}>
                                {DIFFICULTY_LABELS[q.difficulty]}
                              </span>
                            )}
                            <span className="text-muted-foreground">{q.points}점</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed line-clamp-1">{q.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  {previewQuestions.length > 10 && (
                    <p className="text-[11px] text-muted-foreground text-center py-1">외 {previewQuestions.length - 10}개 문항...</p>
                  )}
                </div>
              </div>
            )}

            {/* 다른 과목 */}
            {currentCourse && Object.keys(otherGrouped).length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowOtherCourses(v => !v)}
                  className="flex items-center gap-1 text-[13px] font-medium text-secondary-foreground hover:text-foreground transition-colors mb-3"
                >
                  <ChevronLeft
                    size={14}
                    style={{ transform: showOtherCourses ? 'rotate(-90deg)' : 'rotate(-180deg)', transition: 'transform 0.15s' }}
                  />
                  다른 과목 문제은행
                </button>
                {showOtherCourses && (
                  <div className="space-y-4">
                    {Object.entries(otherGrouped).map(([course, courseBanks]) => (
                      <div key={course} className="space-y-1">
                        <p className="text-[12px] px-4">
                          <span className="font-medium text-secondary-foreground">{course.split(' ').slice(1).join(' ')}</span>
                          {' '}
                          <span className="text-muted-foreground">{course.split(' ')[0]}</span>
                        </p>
                        <div className="rounded-lg space-y-1">
                          {courseBanks.map(b => {
                            const questions = getBankQuestions(b.id)
                            const available = questions.filter(q => !added.includes(q.id))
                            const isSelected = selectedBankIds.has(b.id)
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => toggleBank(b.id)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors',
                                  isSelected ? 'bg-background' : 'hover:bg-slate-50'
                                )}
                              >
                                <span className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                  isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                                )}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </span>
                                <span className="text-sm font-medium text-slate-700 flex-1">{b.name}</span>
                                <span className="text-xs text-muted-foreground">{available.length}개</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 선택 요약 */}
            {selectedBankIds.size > 0 && (
              <p className="text-[13px] text-muted-foreground px-1 pt-1 border-t border-secondary">
                <span className="text-secondary-foreground font-medium">{selectedBankIds.size}개</span> 문제은행 선택됨
                {' / '}
                총 <span className="text-secondary-foreground font-medium">{[...selectedBankIds].reduce((sum, id) => sum + getBankQuestions(id).filter(q => !added.includes(q.id)).length, 0)}개</span> 문항 출제 가능
              </p>
            )}
          </div>
        )}

        {/* Step 2: 은행별 출제 옵션 설정 */}
        {step === 2 && (
          <div className="space-y-3">
            {/* 난이도별 차등 배점 토글 */}
            <div className="bg-background px-5 py-4 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-700">난이도별 차등 배점</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    난이도(상/중/하)에 따라 서로 다른 배점을 적용합니다.
                  </p>
                </div>
                <Switch
                  checked={useDifficultyScoring}
                  onCheckedChange={setUseDifficultyScoring}
                  className="shrink-0 ml-4 data-[state=checked]:bg-primary"
                />
              </label>
            </div>

            {/* 은행별 설정 카드 */}
            <div className="space-y-4 divide-y divide-secondary">
              {[...selectedBankIds].map(bankId => {
                const bank = banks.find(b => b.id === bankId)
                const cfg = bankConfigs[bankId]
                if (!bank || !cfg) return null
                return (
                  <div key={bankId} className="space-y-3 pt-4 first:pt-0">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-semibold text-foreground">{bank.name}</span>
                      <span className="text-[13px] text-muted-foreground">{cfg.totalAvailable}개 출제 가능</span>
                    </div>
                    <div className="space-y-3">
                      {/* 출제 문항 수 */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-20 shrink-0">출제 문항 수</span>
                        <input
                          type="number"
                          min={1}
                          max={cfg.maxCount}
                          value={cfg.count}
                          onChange={e => updateConfig(bankId, 'count', Math.max(1, Math.min(cfg.maxCount, Number(e.target.value) || 1)))}
                          className="w-16 text-center text-sm rounded-lg bg-background border-0 focus:outline-none transition-colors px-3 py-2"
                        />
                        <span className="text-xs text-muted-foreground">/ {cfg.maxCount}개</span>
                      </div>

                      {/* 배점 */}
                      {!useDifficultyScoring ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-20 shrink-0">문항당 배점</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={cfg.points}
                            onChange={e => updateConfig(bankId, 'points', Math.max(1, Number(e.target.value) || 1))}
                            className="w-16 text-center text-sm rounded-lg bg-background border-0 focus:outline-none transition-colors px-3 py-2"
                          />
                          <span className="text-xs text-muted-foreground">점</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-xs text-slate-500">난이도별 배점</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'high', label: '상', cls: 'text-destructive' },
                              { key: 'medium', label: '중', cls: 'text-amber-500' },
                              { key: 'low', label: '하', cls: 'text-correct' },
                            ].map(({ key, label, cls }) => (
                              <div key={key} className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg">
                                <span className={cn('text-xs font-semibold shrink-0', cls)}>{label}</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={cfg.difficultyPoints[key]}
                                  onChange={e => updateDifficultyPoints(bankId, key, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-10 text-center text-xs py-1 rounded-md bg-white focus:outline-none transition-colors"
                                />
                                <span className="text-xs text-muted-foreground">점</span>
                                {cfg.byDifficulty[key] > 0 && (
                                  <span className="text-[11px] ml-auto text-muted-foreground">({cfg.byDifficulty[key]}개)</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* 난이도 미지정 문항용 기본 배점 */}
                          <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg w-fit">
                            <span className="text-xs text-muted-foreground shrink-0">미지정</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={cfg.points}
                              onChange={e => updateConfig(bankId, 'points', Math.max(1, Number(e.target.value) || 1))}
                              className="w-10 text-center text-xs py-1 rounded-md bg-white focus:outline-none transition-colors"
                            />
                            <span className="text-xs text-muted-foreground">점</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 총 출제 요약 */}
            <div className="border-t border-border pt-3 mt-4 flex items-center justify-between px-1">
              <p className="text-[13px] text-secondary-foreground">
                <span className="font-semibold text-foreground">{summary.totalCount}문항</span> 출제 / 예상 총점 <span className="font-semibold text-foreground">{summary.totalPoints}점</span>
              </p>
              <p className="text-[13px] text-muted-foreground">
                {[...selectedBankIds].map(bankId => {
                  const bank = banks.find(b => b.id === bankId)
                  const cfg = bankConfigs[bankId]
                  if (!bank || !cfg) return null
                  return `${bank.name} ${cfg.count}문항`
                }).filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between w-full pt-2">
          <div>
            {step > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(1)}
                className="bg-secondary text-secondary-foreground hover:bg-border hover:text-secondary-foreground border-0"
              >
                <ChevronLeft size={14} className="mr-1" />
                이전
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="bg-secondary text-secondary-foreground hover:bg-border hover:text-secondary-foreground border-0"
            >취소</Button>
            {step === 1 ? (
              <Button
                size="sm"
                onClick={goToStep2}
                disabled={selectedBankIds.size === 0}
              >
                다음
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={summary.totalCount === 0}
              >
                {summary.totalCount}문항 랜덤 출제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
