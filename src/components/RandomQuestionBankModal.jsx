import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { useQuestionBank } from '../context/questionBank'
import { DropdownSelect } from './DropdownSelect'
import { QUIZ_TYPES } from '../data/mockData'
import { createRandomGroupItem } from '@/utils/randomGroups'
import { questionSearchText } from '@/utils/bankSearch'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }
const DIFFICULTY_COLORS = {
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-green-50 text-green-800',
}

export default function RandomQuestionBankModal({ open, onOpenChange, onAdd, added = [] }) {
  const { banks, getBankQuestions } = useQuestionBank()

  // 좌측 — 복수 은행 선택 (사용자 단위 전체 탐색)
  const [selectedBankIds, setSelectedBankIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCourse, setFilterCourse] = useState('all')

  // 우측 — 은행별 출제 설정
  const [bankConfigs, setBankConfigs] = useState({})
  const [useDifficultyScoring, setUseDifficultyScoring] = useState(false)

  // 인라인 문항 미리보기 (한 번에 하나만 펼침)
  const [previewBankId, setPreviewBankId] = useState(null)

  const allCourses = useMemo(
    () => [...new Set(banks.map(b => b.course).filter(Boolean))].sort(),
    [banks]
  )

  // 통합검색(은행명 + 문항 본문) + 난이도/출처 과목 필터
  const filteredBanks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return banks
      .filter(b => filterDiff === 'all' || (b.difficulty || '') === filterDiff)
      .filter(b => filterCourse === 'all' || b.course === filterCourse)
      .filter(b => {
        if (!term) return true
        if (b.name.toLowerCase().includes(term)) return true
        return getBankQuestions(b.id).some(q => questionSearchText(q).includes(term))
      })
  }, [banks, search, filterDiff, filterCourse, getBankQuestions])

  // 은행 선택 시 기본 설정값 생성
  const initBankConfig = (bankId) => {
    const questions = getBankQuestions(bankId)
    const available = questions.filter(q => !added.includes(q.id))
    const byDifficulty = { high: 0, medium: 0, low: 0 }
    available.forEach(q => {
      if (q.difficulty && byDifficulty[q.difficulty] !== undefined) byDifficulty[q.difficulty]++
    })
    return {
      count: Math.min(5, available.length),
      maxCount: available.length,
      points: 5,
      difficultyPoints: { high: 6, medium: 5, low: 4 },
      byDifficulty,
      totalAvailable: available.length,
    }
  }

  const toggleBank = (id) => {
    const isSelected = selectedBankIds.has(id)
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      isSelected ? next.delete(id) : next.add(id)
      return next
    })
    setBankConfigs(prev => {
      if (isSelected) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: initBankConfig(id) }
    })
    if (isSelected && previewBankId === id) setPreviewBankId(null)
  }

  const updateConfig = (bankId, key, value) => {
    setBankConfigs(prev => ({ ...prev, [bankId]: { ...prev[bankId], [key]: value } }))
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

  // 랜덤 출제 그룹 생성: 그룹 추가 시점에 은행 문항을 bankSnapshot 으로 복사 → 그 시점부터 독립
  const handleConfirm = () => {
    Object.entries(bankConfigs).forEach(([bankId, cfg]) => {
      const bank = banks.find(b => b.id === bankId)
      const bankQs = getBankQuestions(bankId)
      const bankSnapshot = bankQs.map(q => JSON.parse(JSON.stringify(q)))

      let estimatedTotalPoints = cfg.count * cfg.points
      if (useDifficultyScoring) {
        const diffCounts = { high: 0, medium: 0, low: 0, none: 0 }
        bankSnapshot.forEach(q => {
          if (q.difficulty && diffCounts[q.difficulty] !== undefined) diffCounts[q.difficulty]++
          else diffCounts.none++
        })
        const total = bankSnapshot.length || 1
        estimatedTotalPoints = Math.round(
          cfg.count * (
            (diffCounts.high / total) * cfg.difficultyPoints.high +
            (diffCounts.medium / total) * cfg.difficultyPoints.medium +
            (diffCounts.low / total) * cfg.difficultyPoints.low +
            (diffCounts.none / total) * cfg.points
          )
        )
      }

      const groupItem = createRandomGroupItem({
        bankId,
        bankName: bank?.name ?? '문제은행',
        bankCourse: bank?.course,
        count: cfg.count,
        pointsPerQuestion: cfg.points,
        useDifficultyScoring,
        difficultyPoints: cfg.difficultyPoints,
        maxAvailable: cfg.totalAvailable,
        estimatedTotalPoints,
        bankSnapshot,
      })
      onAdd(groupItem)
    })
    handleClose()
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedBankIds(new Set())
    setBankConfigs({})
    setUseDifficultyScoring(false)
    setPreviewBankId(null)
    setSearch('')
    setFilterDiff('all')
    setFilterCourse('all')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[calc(100vw-24px)] sm:w-[calc(100vw-160px)] min-h-[480px] sm:min-h-[640px] max-h-[90vh] sm:max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── 헤더 ── */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0 border-b border-border">
          <DialogTitle>랜덤 출제</DialogTitle>
          <DialogDescription className="hidden sm:block">좌측에서 문제은행을 선택하고, 우측에서 출제 문항 수와 배점을 설정하세요</DialogDescription>
          <DialogDescription className="sm:hidden">문제은행을 선택하고 출제 옵션을 설정하세요</DialogDescription>
        </DialogHeader>

        {/* ── 본문: 좌측 은행 선택 + 우측 설정 ── */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">

          {/* 좌측 사이드바 — 문제은행 선택 */}
          <div className="flex flex-col shrink-0 w-full sm:w-[280px] sm:border-r border-b sm:border-b-0 border-border max-h-[200px] sm:max-h-none">
            <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">문제은행</p>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이름·문항 내용 검색"
                  className="w-full text-xs pl-8 pr-7 py-1.5 border border-border rounded-md focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                <DropdownSelect
                  value={filterDiff}
                  onChange={setFilterDiff}
                  options={[
                    { value: 'all', label: '난이도 전체' },
                    { value: 'high', label: '상' },
                    { value: 'medium', label: '중' },
                    { value: 'low', label: '하' },
                  ]}
                  size="sm"
                  filterMode
                  className="flex-1 min-w-0"
                />
                <DropdownSelect
                  value={filterCourse}
                  onChange={setFilterCourse}
                  options={[
                    { value: 'all', label: '과목 전체' },
                    ...allCourses.map(c => ({ value: c, label: c })),
                  ]}
                  size="sm"
                  filterMode
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredBanks.length === 0 ? (
                <p className="py-8 px-3 text-center text-xs text-muted-foreground">
                  {search.trim() || filterDiff !== 'all' || filterCourse !== 'all' ? '조건에 맞는 문제은행이 없습니다' : '등록된 문제은행이 없습니다'}
                </p>
              ) : (
                filteredBanks.map(b => {
                  const isSelected = selectedBankIds.has(b.id)
                  const available = getBankQuestions(b.id).filter(q => !added.includes(q.id)).length
                  const diffLabel = b.difficulty ? DIFFICULTY_LABELS[b.difficulty] : null
                  const diffColor = b.difficulty ? DIFFICULTY_COLORS[b.difficulty] : null
                  return (
                    <div
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleBank(b.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBank(b.id) } }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-l-2',
                        isSelected
                          ? 'border-l-primary bg-accent font-medium text-primary'
                          : 'border-l-transparent text-secondary-foreground hover:bg-secondary/40'
                      )}
                    >
                      <span className={cn(
                        'w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                      )}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{b.name}</span>
                          {diffLabel && (
                            <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium shrink-0', diffColor)}>{diffLabel}</span>
                          )}
                        </div>
                        {b.course && <span className="text-[10px] text-muted-foreground truncate block">{b.course}</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{available}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 우측 — 출제 옵션 설정 */}
          <div className="flex flex-col flex-1 min-w-0">
            {selectedBankIds.size === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1 px-6 text-center">
                <p className="text-[14px] text-muted-foreground">좌측에서 문제은행을 선택하세요</p>
                <p className="text-xs text-muted-foreground/70">선택한 은행마다 출제 문항 수와 배점을 설정할 수 있습니다</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
                {/* 난이도별 차등 배점 토글 */}
                <div className="bg-background px-4 py-3 rounded-lg border border-border">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-[15px] font-medium text-slate-700">난이도별 차등 배점</p>
                      <p className="text-xs text-muted-foreground mt-0.5">난이도(상/중/하)에 따라 서로 다른 배점을 적용합니다.</p>
                    </div>
                    <Switch
                      checked={useDifficultyScoring}
                      onCheckedChange={setUseDifficultyScoring}
                      className="shrink-0 ml-4 data-[state=checked]:bg-primary"
                    />
                  </label>
                </div>

                {/* 은행별 설정 카드 */}
                <div className="mt-4 space-y-4">
                  {[...selectedBankIds].map(bankId => {
                    const bank = banks.find(b => b.id === bankId)
                    const cfg = bankConfigs[bankId]
                    if (!bank || !cfg) return null
                    const isPreview = previewBankId === bankId
                    const previewQs = isPreview ? getBankQuestions(bankId) : []
                    return (
                      <div key={bankId} className="rounded-xl border border-border overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                          <span className="text-[14px] font-semibold text-foreground truncate">{bank.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[12px] text-muted-foreground">{cfg.totalAvailable}개 출제 가능</span>
                            <button
                              type="button"
                              onClick={() => setPreviewBankId(isPreview ? null : bankId)}
                              className={cn(
                                'flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md transition-colors',
                                isPreview ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                              )}
                            >
                              미리보기
                              <ChevronDown size={13} className={cn('transition-transform', isPreview && 'rotate-180')} />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3.5 space-y-3">
                          {/* 출제 문항 수 + (단일) 문항당 배점 */}
                          <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 w-20 shrink-0">출제 문항 수</span>
                              <input
                                type="number"
                                min={1}
                                max={cfg.maxCount}
                                value={cfg.count}
                                onChange={e => updateConfig(bankId, 'count', Math.max(1, Math.min(cfg.maxCount, Number(e.target.value) || 1)))}
                                className="w-16 text-center text-[15px] rounded-lg bg-white border border-border focus:outline-none focus:border-primary transition-colors px-3 py-2"
                              />
                              <span className="text-xs text-muted-foreground">/ {cfg.maxCount}개</span>
                            </div>
                            {!useDifficultyScoring && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 w-20 shrink-0">문항당 배점</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={cfg.points}
                                  onChange={e => updateConfig(bankId, 'points', Math.max(1, Number(e.target.value) || 1))}
                                  className="w-16 text-center text-[15px] rounded-lg bg-white border border-border focus:outline-none focus:border-primary transition-colors px-3 py-2"
                                />
                                <span className="text-xs text-muted-foreground">점</span>
                              </div>
                            )}
                          </div>

                          {/* 난이도별 배점 (옵션) */}
                          {useDifficultyScoring && (
                            <div className="space-y-2">
                              <span className="text-xs text-slate-500">난이도별 배점</span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { key: 'high', label: '상', cls: 'text-destructive' },
                                  { key: 'medium', label: '중', cls: 'text-amber-500' },
                                  { key: 'low', label: '하', cls: 'text-correct' },
                                  { key: 'none', label: '미설정', cls: 'text-muted-foreground' },
                                ].map(({ key, label, cls }) => {
                                  const isNone = key === 'none'
                                  const value = isNone ? cfg.points : cfg.difficultyPoints[key]
                                  const count = isNone ? 0 : cfg.byDifficulty[key]
                                  return (
                                    <div key={key} className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg">
                                      <span className={cn('text-xs font-semibold shrink-0', cls)}>{label}</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={value}
                                        onChange={e => {
                                          const v = Math.max(1, Number(e.target.value) || 1)
                                          isNone ? updateConfig(bankId, 'points', v) : updateDifficultyPoints(bankId, key, v)
                                        }}
                                        className="w-10 text-center text-xs py-1 rounded-md bg-white border border-border focus:outline-none focus:border-primary transition-colors"
                                      />
                                      <span className="text-xs text-muted-foreground">점</span>
                                      {count > 0 && (
                                        <span className="text-[11px] ml-auto text-muted-foreground">({count}개)</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 인라인 문항 미리보기 */}
                        {isPreview && (
                          <div className="border-t border-border bg-secondary/30">
                            <div className="max-h-[220px] overflow-auto">
                              <table className="w-full min-w-[440px] text-[12px] table-fixed">
                                <thead className="sticky top-0 bg-gray-50">
                                  <tr className="border-y border-gray-200 text-gray-500">
                                    <th className="text-center font-medium px-3 py-2 w-[48px]">번호</th>
                                    <th className="text-left font-medium px-3 py-2">문항</th>
                                    <th className="text-center font-medium px-3 py-2 w-[68px]">유형</th>
                                    <th className="text-center font-medium px-3 py-2 w-[56px]">난이도</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {previewQs.slice(0, 10).map((q, i) => (
                                    <tr key={q.id ?? i} className="border-b border-gray-100 last:border-b-0">
                                      <td className="px-3 py-2.5 text-center text-muted-foreground">{i + 1}</td>
                                      <td className="px-3 py-2.5 text-slate-600 truncate">{q.text}</td>
                                      <td className="px-3 py-2.5 text-center">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">{QUIZ_TYPES[q.type]?.label}</span>
                                      </td>
                                      <td className="px-3 py-2.5 text-center">
                                        {q.difficulty ? (
                                          <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium', DIFFICULTY_COLORS[q.difficulty])}>
                                            {DIFFICULTY_LABELS[q.difficulty]}
                                          </span>
                                        ) : <span className="text-muted-foreground">-</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {previewQs.length > 10 && (
                                <p className="text-[11px] text-muted-foreground text-center py-2 border-t border-gray-200 bg-white">외 {previewQs.length - 10}개 문항</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="shrink-0 border-t border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-secondary-foreground">
            {summary.totalCount > 0 ? (
              <>
                <span className="font-semibold text-foreground">{summary.totalCount}문항</span> 출제 / 예상 총점 <span className="font-semibold text-foreground">{summary.totalPoints}점</span>
              </>
            ) : (
              <span className="text-muted-foreground">문제은행을 선택하세요</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="bg-secondary text-secondary-foreground hover:bg-border hover:text-secondary-foreground border-0"
            >취소</Button>
            <Button onClick={handleConfirm} disabled={summary.totalCount === 0}>
              {summary.totalCount > 0 ? `${summary.totalCount}문항 랜덤 출제` : '랜덤 출제'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
