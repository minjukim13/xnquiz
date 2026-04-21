import { useState, useCallback } from 'react'
import { BookOpen, Search, ChevronLeft } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { useQuestionBank } from '../context/questionBank'
import { DropdownSelect } from './DropdownSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import TypeBadge from './TypeBadge'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }
const DIFFICULTY_COLORS = {
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-green-50 text-green-800',
}

export default function QuestionBankModal({ open, onOpenChange, onAdd, added, currentCourse }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [showOtherCourses, setShowOtherCourses] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [checked, setChecked] = useState(new Set())
  const [visibleCount, setVisibleCount] = useState(15)

  const selectedBank = banks.find(b => b.id === selectedBankId)
  const bankQuestions = selectedBankId ? getBankQuestions(selectedBankId) : []

  const filtered = bankQuestions.filter(q => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType !== 'all' && q.type !== filterType) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    return true
  })

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

  const handleClose = () => {
    onOpenChange(false)
    setSelectedBankId(null)
    setSearch('')
    setFilterType('all')
    setFilterDifficulty('all')
    setVisibleCount(15)
    setChecked(new Set())
    setShowOtherCourses(false)
  }

  const handleConfirmAdd = () => {
    checked.forEach(id => {
      const q = bankQuestions.find(q => q.id === id)
      if (q) onAdd({ ...q, bankName: selectedBank?.name })
    })
    handleClose()
  }

  const handleBack = () => {
    setSelectedBankId(null)
    setSearch('')
    setFilterType('all')
    setFilterDifficulty('all')
    setVisibleCount(15)
    setChecked(new Set())
    setShowOtherCourses(false)
  }

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount(prev => prev + 10)
    }
  }, [hasMore])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl min-h-[600px] max-h-[85vh] overflow-hidden flex flex-col p-0">

        {/* 헤더 */}
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            {selectedBankId && (
              <Button variant="ghost" size="icon-xs" onClick={handleBack}>
                <ChevronLeft size={16} />
              </Button>
            )}
            <div className="flex flex-col gap-2.5">
              <DialogTitle>
                {selectedBank ? selectedBank.name : '문제은행에서 추가'}
              </DialogTitle>
              {selectedBank ? (
                <DialogDescription>{bankQuestions.length}개 문항</DialogDescription>
              ) : (
                <DialogDescription>문제를 가져올 은행을 선택하세요</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: 은행 선택 */}
        {!selectedBankId ? (
          <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-4">
            {/* 현재 과목 은행 */}
            {(() => {
              const currentBanks = currentCourse
                ? banks.filter(b => b.course === currentCourse)
                : banks
              return (
                <div>
                  {currentCourse && (
                    <div className="flex items-center gap-2 mb-2 px-4">
                      <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-medium">{currentCourse.split(' ')[0]}</span>
                      <span className="text-[13px] font-semibold text-foreground">{currentCourse.split(' ').slice(1).join(' ')}</span>
                    </div>
                  )}
                  {currentBanks.length === 0 ? (
                    <p className="text-sm py-6 text-center text-muted-foreground">이 과목에 등록된 문제은행이 없습니다</p>
                  ) : (
                    currentBanks.map(b => {
                      const count = getBankQuestions(b.id).length
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBankId(b.id)}
                          className="w-full flex items-center justify-between py-3 px-4 text-left rounded-lg transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-muted-foreground" />
                            <span className="text-[15px] font-medium text-foreground">{b.name}</span>
                          </div>
                          <span className="text-[15px] text-muted-foreground">{count}개 문항</span>
                        </button>
                      )
                    })
                  )}
                </div>
              )
            })()}

            {/* 다른 과목 은행 */}
            {currentCourse && banks.some(b => b.course !== currentCourse) && (
              <div>
                <button
                  onClick={() => setShowOtherCourses(v => !v)}
                  className="w-full flex items-center gap-1.5 py-3 px-4 mb-2 rounded-lg transition-colors text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft
                    size={13}
                    style={{ transform: showOtherCourses ? 'rotate(-90deg)' : 'rotate(-180deg)', transition: 'transform 0.15s' }}
                  />
                  다른 과목 문제은행
                </button>
                {showOtherCourses && (() => {
                  const otherBanks = banks.filter(b => b.course !== currentCourse)
                  const grouped = otherBanks.reduce((acc, b) => {
                    const key = b.course ?? '기타'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(b)
                    return acc
                  }, {})
                  return (
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([course, courseBanks]) => (
                        <div key={course}>
                          <div className="flex items-center gap-2 mb-2 px-4">
                            <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-medium">{course.split(' ')[0]}</span>
                            <span className="text-[13px] font-semibold text-foreground">{course.split(' ').slice(1).join(' ')}</span>
                          </div>
                          {courseBanks.map(b => {
                            const count = getBankQuestions(b.id).length
                            return (
                              <button
                                key={b.id}
                                onClick={() => setSelectedBankId(b.id)}
                                className="w-full flex items-center justify-between py-3 px-4 text-left rounded-lg transition-colors hover:bg-muted"
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen size={14} className="text-muted-foreground" />
                                  <span className="text-[15px] font-medium text-foreground">{b.name}</span>
                                </div>
                                <span className="text-[15px] text-muted-foreground">{count}개 문항</span>
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 필터 영역 */}
            <div className="px-6 pb-4 space-y-2 shrink-0 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
                  placeholder="문항 내용 검색"
                  className="w-full text-[15px] pl-9 pr-3 py-2 focus:outline-none bg-secondary border border-border rounded text-foreground"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {filtered.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer mr-1">
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
                <DropdownSelect
                  value={filterType}
                  onChange={v => { setFilterType(v); setVisibleCount(15) }}
                  filterMode
                  options={[
                    { value: 'all', label: '모든 유형' },
                    ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
                  ]}
                />
                <DropdownSelect
                  value={filterDifficulty}
                  onChange={v => { setFilterDifficulty(v); setVisibleCount(15) }}
                  filterMode
                  options={[
                    { value: 'all', label: '모든 난이도' },
                    { value: '', label: '미지정' },
                    { value: 'high', label: '상' },
                    { value: 'medium', label: '중' },
                    { value: 'low', label: '하' },
                  ]}
                />
                <span className="text-xs ml-auto text-muted-foreground">{filtered.length}개</span>
              </div>
            </div>

            {/* 문항 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2" onScroll={handleScroll}>
              {visible.map(q => {
                const isAdded = added.includes(q.id)
                const isChecked = checked.has(q.id)
                const diff = DIFFICULTY_COLORS[q.difficulty]
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 p-3 transition-all cursor-pointer border rounded-lg ${
                      isAdded ? 'border-accent bg-accent/50' : isChecked ? 'border-primary/30 bg-accent/30' : 'border-border bg-white'
                    }`}
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <TypeBadge type={q.type} small />
                        <span className="text-xs text-muted-foreground">{q.points}점</span>
                        {q.difficulty && (
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', diff)}>
                            {DIFFICULTY_LABELS[q.difficulty]}
                          </span>
                        )}
                        {isAdded && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-primary">추가됨</span>
                        )}
                      </div>
                      <p className="text-[15px] leading-relaxed text-foreground">{q.text}</p>
                    </div>
                  </label>
                )
              })}
              {hasMore && <div className="py-4 text-center text-xs text-muted-foreground">스크롤하면 더 불러옵니다</div>}
              {!hasMore && filtered.length > 0 && <div className="py-4 text-center text-xs text-muted-foreground/50">모든 문항을 불러왔습니다</div>}
              {filtered.length === 0 && <div className="py-10 text-center text-[15px] text-muted-foreground/50">검색 결과가 없습니다</div>}
            </div>

            {/* 하단 확인 버튼 */}
            <div className="px-6 py-4 flex items-center justify-end gap-2 shrink-0 border-t border-border">
                <Button variant="ghost" onClick={handleClose}>닫기</Button>
                <Button
                  onClick={handleConfirmAdd}
                  disabled={checked.size === 0}
                >
                  {checked.size > 0 ? `${checked.size}개 추가` : '추가'}
                </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
