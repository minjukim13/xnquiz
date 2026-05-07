import { useState, useCallback, useMemo, useEffect } from 'react'
import { Search } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { useQuestionBank } from '../context/questionBank'
import { DropdownSelect } from './DropdownSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import TypeBadge from './TypeBadge'
import { DiffBadge } from './BankWizardShared'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }
const DIFFICULTY_COLORS = {
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-green-50 text-green-800',
}

export default function QuestionBankModal({ open, onOpenChange, onAdd, added, currentCourse }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [selectedBankIds, setSelectedBankIds] = useState(new Set())
  const [bankSearch, setBankSearch] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [checked, setChecked] = useState(new Set())
  const [visibleCount, setVisibleCount] = useState(20)

  // 현재 과목 은행만 기본 표시 (다른 과목 은행은 사이드바 그룹으로 함께 노출)
  const courseGroups = useMemo(() => {
    const term = bankSearch.trim().toLowerCase()
    const groups = {}
    banks.forEach(b => {
      if (term && !b.name.toLowerCase().includes(term)) return
      const key = b.course ?? '기타'
      if (!groups[key]) groups[key] = []
      groups[key].push(b)
    })
    return groups
  }, [banks, bankSearch])

  // 현재 과목 우선, 그 외 과목 뒤로
  const orderedCourses = useMemo(() => {
    const keys = Object.keys(courseGroups)
    if (!currentCourse) return keys
    return [currentCourse, ...keys.filter(c => c !== currentCourse)].filter(c => courseGroups[c])
  }, [courseGroups, currentCourse])

  // 모달 열릴 때 현재 과목의 첫 은행을 자동 선택 (기존 UX 보존)
  useEffect(() => {
    if (!open) return
    if (selectedBankIds.size > 0) return
    const defaultBank = (currentCourse && courseGroups[currentCourse]?.[0]) || Object.values(courseGroups).flat()[0]
    if (defaultBank) {
      setSelectedBankIds(new Set([defaultBank.id]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 선택된 은행들의 문항 집계
  const sourceQuestions = useMemo(() => {
    const out = []
    selectedBankIds.forEach(id => {
      const bank = banks.find(b => b.id === id)
      const list = getBankQuestions(id)
      list.forEach(q => out.push({ ...q, _sourceBankName: bank?.name || '' }))
    })
    return out
  }, [selectedBankIds, banks, getBankQuestions])

  const filtered = useMemo(() => sourceQuestions.filter(q => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType !== 'all' && q.type !== filterType) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    return true
  }), [sourceQuestions, search, filterType, filterDifficulty])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const selectableIds = filtered.filter(q => !added.includes(q.id)).map(q => q.id)
  const allChecked = selectableIds.length > 0 && selectableIds.every(id => checked.has(id))
  const someChecked = selectableIds.some(id => checked.has(id))

  const toggleAll = () => {
    if (allChecked) {
      setChecked(prev => {
        const next = new Set(prev)
        selectableIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setChecked(prev => {
        const next = new Set(prev)
        selectableIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const toggleOne = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleBank = (bankId) => {
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      if (next.has(bankId)) {
        next.delete(bankId)
        // 해당 은행 문항을 체크 해제
        const bankQIds = getBankQuestions(bankId).map(q => q.id)
        setChecked(prevChecked => {
          const nextChecked = new Set(prevChecked)
          bankQIds.forEach(id => nextChecked.delete(id))
          return nextChecked
        })
      } else {
        next.add(bankId)
      }
      return next
    })
    setVisibleCount(20)
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedBankIds(new Set())
    setBankSearch('')
    setSearch('')
    setFilterType('all')
    setFilterDifficulty('all')
    setVisibleCount(20)
    setChecked(new Set())
  }

  const handleConfirmAdd = () => {
    const byId = new Map(sourceQuestions.map(q => [q.id, q]))
    checked.forEach(id => {
      const q = byId.get(id)
      if (q) onAdd({ ...q, bankName: q._sourceBankName })
    })
    handleClose()
  }

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount(prev => prev + 15)
    }
  }, [hasMore])

  const totalBanks = Object.values(courseGroups).reduce((s, l) => s + l.length, 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[calc(100vw-24px)] sm:w-auto min-h-[480px] sm:min-h-[640px] max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">

        {/* 헤더 */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0 border-b border-border">
          <DialogTitle>문제모음에서 추가</DialogTitle>
          <DialogDescription className="hidden sm:block">좌측에서 문제모음을 선택하고, 우측에서 추가할 문항을 골라주세요</DialogDescription>
          <DialogDescription className="sm:hidden">상단에서 문제모음을 선택하고 문항을 골라주세요</DialogDescription>
        </DialogHeader>

        {/* 본문: 사이드바 + 문항 목록 */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* ── 좌측 사이드바 (모바일에서는 상단 가로 스크롤) ── */}
          <div className="flex flex-col shrink-0 w-full sm:w-[240px] sm:border-r border-b sm:border-b-0 border-border max-h-[180px] sm:max-h-none">
            <div className="px-3 pt-3 pb-2 shrink-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">문제모음</p>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  placeholder="검색"
                  className="w-full text-xs pl-7 pr-2 py-1.5 border border-border rounded-md focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {totalBanks === 0 ? (
                <p className="py-8 px-3 text-center text-xs text-muted-foreground">
                  {bankSearch.trim() ? '검색 결과가 없습니다' : '등록된 문제모음이 없습니다'}
                </p>
              ) : (
                orderedCourses.map(course => {
                  const list = courseGroups[course] || []
                  if (list.length === 0) return null
                  const [code, ...rest] = course.split(' ')
                  const courseName = rest.join(' ')
                  return (
                    <div key={course}>
                      <div className="px-3 py-1.5 flex items-center gap-1.5 bg-secondary/60 border-b border-border/60">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-white px-1 py-0.5 rounded">{code}</span>
                        <span className="text-[11px] font-semibold text-secondary-foreground truncate">{courseName}</span>
                      </div>
                      {list.map(b => {
                        const isChecked = selectedBankIds.has(b.id)
                        const count = getBankQuestions(b.id).length
                        return (
                          <label
                            key={b.id}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-l-2',
                              isChecked
                                ? 'border-l-primary bg-accent font-medium text-primary'
                                : 'border-l-transparent text-secondary-foreground hover:bg-secondary/40'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBank(b.id)}
                              className="accent-primary shrink-0"
                            />
                            <DiffBadge difficulty={b.difficulty} />
                            <span className="truncate flex-1">{b.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{count}</span>
                          </label>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── 우측 문항 영역 ── */}
          <div className="flex flex-col flex-1 min-w-0">
            {selectedBankIds.size === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[14px] text-muted-foreground">좌측에서 문제모음을 선택하세요</p>
              </div>
            ) : (
              <>
                {/* 필터 영역 */}
                <div className="px-3 sm:px-5 pt-3 pb-3 space-y-2 shrink-0 border-b border-border">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setVisibleCount(20) }}
                      placeholder="문항 내용 검색"
                      className="w-full text-[14px] pl-9 pr-3 py-1.5 focus:outline-none bg-secondary border border-border rounded text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {filtered.length > 0 && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                          onChange={toggleAll}
                          className="rounded accent-primary"
                          style={{ width: 14, height: 14 }}
                        />
                        <span className="text-xs font-medium text-foreground">전체</span>
                      </label>
                    )}
                    <div className="flex items-center gap-2">
                      <DropdownSelect
                        value={filterType}
                        onChange={v => { setFilterType(v); setVisibleCount(20) }}
                        filterMode
                        options={[
                          { value: 'all', label: '모든 유형' },
                          ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
                        ]}
                      />
                      <DropdownSelect
                        value={filterDifficulty}
                        onChange={v => { setFilterDifficulty(v); setVisibleCount(20) }}
                        filterMode
                        options={[
                          { value: 'all', label: '모든 난이도' },
                          { value: '', label: '미지정' },
                          { value: 'high', label: '상' },
                          { value: 'medium', label: '중' },
                          { value: 'low', label: '하' },
                        ]}
                      />
                    </div>
                    <span className="text-xs ml-auto text-muted-foreground">총 {filtered.length}개</span>
                  </div>
                </div>

                {/* 문항 목록 */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-5 pt-2 pb-3 space-y-1.5" onScroll={handleScroll}>
                  {visible.map(q => {
                    const isAdded = added.includes(q.id)
                    const isChecked = checked.has(q.id)
                    const diff = DIFFICULTY_COLORS[q.difficulty]
                    return (
                      <label
                        key={q.id}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2.5 transition-all cursor-pointer border rounded-lg',
                          isAdded ? 'border-accent bg-accent/50' : isChecked ? 'border-primary/30 bg-accent/30' : 'border-border bg-white'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked || isAdded}
                          disabled={isAdded}
                          onChange={() => !isAdded && toggleOne(q.id)}
                          className="mt-0.5 rounded shrink-0 accent-primary"
                          style={{ width: 14, height: 14 }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <TypeBadge type={q.type} small />
                            <span className="text-xs text-muted-foreground">{q.points}점</span>
                            {q.difficulty && (
                              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', diff)}>
                                {DIFFICULTY_LABELS[q.difficulty]}
                              </span>
                            )}
                            {selectedBankIds.size > 1 && q._sourceBankName && (
                              <span className="text-[11px] text-muted-foreground">{q._sourceBankName}</span>
                            )}
                            {isAdded && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-primary">추가됨</span>
                            )}
                          </div>
                          <p className="text-[14px] leading-snug text-foreground">{q.text}</p>
                        </div>
                      </label>
                    )
                  })}
                  {hasMore && <div className="py-4 text-center text-xs text-muted-foreground">스크롤하면 더 불러옵니다</div>}
                  {filtered.length === 0 && <div className="py-10 text-center text-[14px] text-muted-foreground/50">검색 결과가 없습니다</div>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 하단 푸터 */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-end gap-2 shrink-0 border-t border-border">
          <Button variant="ghost" onClick={handleClose}>닫기</Button>
          <Button
            onClick={handleConfirmAdd}
            disabled={checked.size === 0}
          >
            {checked.size > 0 ? `${checked.size}개 추가` : '추가'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
