import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft, ChevronDown, Check, Search, X } from 'lucide-react'
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
  const [step, setStep] = useState(1)

  // Step 1: 복수 은행 선택 (사용자 단위 — 전체 문제은행을 검색/필터로 탐색)
  const [selectedBankIds, setSelectedBankIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterTag, setFilterTag] = useState('all')

  // Step 2: 은행별 설정
  const [bankConfigs, setBankConfigs] = useState({})
  const [useDifficultyScoring, setUseDifficultyScoring] = useState(false)

  // 미리보기 상태
  const [previewBankId, setPreviewBankId] = useState(null)

  const allCourses = useMemo(
    () => [...new Set(banks.map(b => b.course).filter(Boolean))].sort(),
    [banks]
  )
  const allTags = useMemo(
    () => [...new Set(banks.flatMap(b => b.tags ?? []))].sort(),
    [banks]
  )

  // 통합검색(은행명 + 문항 본문) + 난이도/출처 과목/태그 필터
  const filteredBanks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return banks
      .filter(b => filterDiff === 'all' || (b.difficulty || '') === filterDiff)
      .filter(b => filterCourse === 'all' || b.course === filterCourse)
      .filter(b => filterTag === 'all' || (b.tags ?? []).includes(filterTag))
      .filter(b => {
        if (!term) return true
        if (b.name.toLowerCase().includes(term)) return true
        return getBankQuestions(b.id).some(q => questionSearchText(q).includes(term))
      })
  }, [banks, search, filterDiff, filterCourse, filterTag, getBankQuestions])

  const toggleBank = (id) => {
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
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

  // 랜덤 출제 그룹 생성: 학생별로 다른 문항이 뽑히도록 placeholder 만 시험 정의에 저장
  // 실제 문항은 응시 시점에 학생 단위 시드로 결정 (utils/randomGroups.js expandRandomGroups)
  // 사용자 원칙: 그룹 추가 시점에 은행 문항을 bankSnapshot 으로 복사 → 그 시점부터 독립
  const handleConfirm = () => {
    Object.entries(bankConfigs).forEach(([bankId, cfg]) => {
      const bank = banks.find(b => b.id === bankId)
      const bankQs = getBankQuestions(bankId)
      // 그룹 추가 시점의 스냅샷 (깊은 복사 — 은행 원본 변경에 영향 X)
      const bankSnapshot = bankQs.map(q => JSON.parse(JSON.stringify(q)))

      // 난이도별 차등 배점 사용 시, 시험 정의 단위 합계 추정 (실제 학생별 합계는 응시 시 재계산)
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
    setStep(1)
    setSelectedBankIds(new Set())
    setBankConfigs({})
    setUseDifficultyScoring(false)
    setPreviewBankId(null)
    setSearch('')
    setFilterDiff('all')
    setFilterCourse('all')
    setFilterTag('all')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[calc(100vw-24px)] sm:w-[calc(100vw-160px)] min-h-[480px] sm:min-h-[600px] max-h-[90vh] sm:max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── 상단 고정 헤더 ── */}
        <div className="shrink-0 px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200">
          <DialogHeader>
            <DialogTitle>랜덤 출제</DialogTitle>
            <DialogDescription>문제은행을 골라 학생마다 다른 문항이 출제되도록 설정합니다.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mt-4">
            {[
              { n: 1, label: '문제은행 선택' },
              { n: 2, label: '출제 옵션 설정' },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    step > n ? 'bg-success text-white'
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
        </div>

        {/* ── 본문 스크롤 영역 ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">

          {/* Step 1: 문제은행 복수 선택 (사용자 단위 전체 탐색) */}
          {step === 1 && (
            <div>
              {/* 검색/필터 툴바 */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="문제은행 이름 또는 문항 내용 검색"
                    className="w-full text-sm pl-9 pr-8 py-2 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <DropdownSelect
                  value={filterDiff}
                  onChange={setFilterDiff}
                  options={[
                    { value: 'all', label: '난이도 전체' },
                    { value: 'high', label: '상' },
                    { value: 'medium', label: '중' },
                    { value: 'low', label: '하' },
                    { value: '', label: '미설정' },
                  ]}
                  size="md"
                  filterMode
                  className="w-[112px] shrink-0"
                />
                <DropdownSelect
                  value={filterCourse}
                  onChange={setFilterCourse}
                  options={[
                    { value: 'all', label: '출처 과목 전체' },
                    ...allCourses.map(c => ({ value: c, label: c })),
                  ]}
                  size="md"
                  filterMode
                  className="w-[150px] sm:w-[180px] shrink-0"
                />
                {allTags.length > 0 && (
                  <DropdownSelect
                    value={filterTag}
                    onChange={setFilterTag}
                    options={[
                      { value: 'all', label: '태그 전체' },
                      ...allTags.map(t => ({ value: t, label: t })),
                    ]}
                    size="md"
                    filterMode
                    className="w-[130px] sm:w-[150px] shrink-0"
                  />
                )}
              </div>

              <div>
                {filteredBanks.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">조건에 맞는 문제은행이 없습니다</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">검색어나 필터를 바꿔 보세요</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {filteredBanks.map((b) => {
                      const available = getBankQuestions(b.id).filter(q => !added.includes(q.id))
                      const isSelected = selectedBankIds.has(b.id)
                      const diffLabel = b.difficulty ? DIFFICULTY_LABELS[b.difficulty] : null
                      const diffColor = b.difficulty ? DIFFICULTY_COLORS[b.difficulty] : null
                      const isPreview = previewBankId === b.id
                      const previewQs = isPreview ? getBankQuestions(b.id) : []
                      return (
                        <div key={b.id} className={cn('transition-colors', isSelected ? 'bg-accent/60' : 'bg-white')}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleBank(b.id)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBank(b.id) } }}
                            className={cn(
                              'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                              isSelected ? '' : 'hover:bg-secondary/50'
                            )}
                          >
                            <span className={cn(
                              'w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
                              isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white group-hover:border-slate-400'
                            )}>
                              {isSelected && <Check size={11} className="text-white" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[15px] font-medium text-foreground">{b.name}</span>
                                {diffLabel && (
                                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', diffColor)}>
                                    {diffLabel}
                                  </span>
                                )}
                                {b.course && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground truncate max-w-[140px]" title={`출처: ${b.course}`}>
                                    {b.course}
                                  </span>
                                )}
                                {(b.tags ?? []).slice(0, 3).map(t => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{t}</span>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{available.length}문항</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewBankId(isPreview ? null : b.id) }}
                              className={cn(
                                'flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md transition-colors shrink-0',
                                isPreview ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                              )}
                            >
                              미리보기
                              <ChevronDown size={13} className={cn('transition-transform', isPreview && 'rotate-180')} />
                            </button>
                          </div>

                          {/* 인라인 미리보기 패널 */}
                          {isPreview && (
                            <div className="mx-4 mb-3 -mt-0.5 rounded-lg border border-border bg-secondary/40 overflow-hidden">
                              <div className="max-h-[220px] overflow-auto">
                                <table className="w-full min-w-[480px] text-[12px] table-fixed">
                                  <thead className="sticky top-0 bg-gray-50">
                                    <tr className="border-y border-gray-200 text-gray-500">
                                      <th className="text-center font-medium px-3 py-2.5 w-[52px] whitespace-nowrap">번호</th>
                                      <th className="text-left font-medium px-3 py-2.5">문항</th>
                                      <th className="text-center font-medium px-3 py-2.5 w-[72px] whitespace-nowrap">유형</th>
                                      <th className="text-center font-medium px-3 py-2.5 w-[64px] whitespace-nowrap">난이도</th>
                                      <th className="text-right font-medium px-4 py-2.5 w-[64px] whitespace-nowrap">배점</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {previewQs.slice(0, 10).map((q, i) => {
                                      const diff = DIFFICULTY_COLORS[q.difficulty]
                                      return (
                                        <tr key={q.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                                          <td className="px-3 py-3 text-center text-muted-foreground font-medium whitespace-nowrap">{i + 1}</td>
                                          <td className="px-3 py-3 text-slate-600 truncate">{q.text}</td>
                                          <td className="px-3 py-3 text-center whitespace-nowrap">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">
                                              {QUIZ_TYPES[q.type]?.label}
                                            </span>
                                          </td>
                                          <td className="px-3 py-3 text-center whitespace-nowrap">
                                            {q.difficulty ? (
                                              <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium', diff)}>
                                                {DIFFICULTY_LABELS[q.difficulty]}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{q.points}점</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {previewQs.length > 10 && (
                                  <p className="text-[11px] text-muted-foreground text-center py-2.5 border-t border-gray-200 bg-white">외 {previewQs.length - 10}개 문항</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 선택 요약 */}
              {selectedBankIds.size > 0 && (
                <p className="text-[13px] text-muted-foreground px-1 pt-4 mt-4 border-t border-gray-100">
                  <span className="text-secondary-foreground font-medium">{selectedBankIds.size}개</span> 문제은행 선택됨
                  {' / '}
                  총 <span className="text-secondary-foreground font-medium">{[...selectedBankIds].reduce((sum, id) => sum + getBankQuestions(id).filter(q => !added.includes(q.id)).length, 0)}개</span> 문항 출제 가능
                </p>
              )}
            </div>
          )}

          {/* Step 2: 은행별 출제 옵션 설정 */}
          {step === 2 && (
            <div>
              {/* 난이도별 차등 배점 토글 */}
              <div className="bg-background px-4 py-3 rounded-lg border border-border">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-[15px] font-medium text-slate-700">난이도별 차등 배점</p>
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
              <div className="mt-5 space-y-5">
                {[...selectedBankIds].map(bankId => {
                  const bank = banks.find(b => b.id === bankId)
                  const cfg = bankConfigs[bankId]
                  if (!bank || !cfg) return null
                  return (
                    <div key={bankId} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[15px] font-semibold text-foreground">{bank.name}</span>
                        <span className="text-[13px] text-muted-foreground">{cfg.totalAvailable}개 출제 가능</span>
                      </div>
                      <div className="space-y-3 pl-1">
                        {/* 출제 문항 수 + 문항당 배점 (한 줄) */}
                        {!useDifficultyScoring ? (
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
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}

                        {/* 난이도별 배점 (옵션) — 상/중/하/미설정 한 줄(넓은 화면) · 2x2(좁은 화면) */}
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
                    </div>
                  )
                })}
              </div>

              {/* 총 출제 요약 */}
              <div className="border-t border-border pt-3 mt-5 flex items-center justify-between px-1">
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
        </div>

        {/* ── 하단 고정 푸터 ── */}
        <div className="shrink-0 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 1 && (
                <Button
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
                variant="ghost"
                onClick={handleClose}
                className="bg-secondary text-secondary-foreground hover:bg-border hover:text-secondary-foreground border-0"
              >취소</Button>
              {step === 1 ? (
                <Button
                  onClick={goToStep2}
                  disabled={selectedBankIds.size === 0}
                >
                  다음
                </Button>
              ) : (
                <Button
                  onClick={handleConfirm}
                  disabled={summary.totalCount === 0}
                >
                  {summary.totalCount}문항 랜덤 출제
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
