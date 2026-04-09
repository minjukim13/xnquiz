import { useState, useCallback } from 'react'
import { BookOpen, Search, X, ChevronLeft } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { useQuestionBank } from '../context/QuestionBankContext'
import { DropdownSelect } from './DropdownSelect'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }
const DIFFICULTY_COLORS = {
  high:   { bg: '#FFF0EF', text: '#B91C1C' },
  medium: { bg: '#FFFBEB', text: '#92400E' },
  low:    { bg: '#F0FDF4', text: '#166534' },
}

export default function QuestionBankModal({ onClose, onAdd, added, currentCourse }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [showOtherCourses, setShowOtherCourses] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [checked, setChecked] = useState(new Set()) // 현재 모달에서 선택 중인 문항 IDs
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

  // 전체 선택 상태: 필터된 항목 중 이미 추가된 것 제외 후 판단
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

  const handleConfirmAdd = () => {
    checked.forEach(id => {
      const q = bankQuestions.find(q => q.id === id)
      if (q) onAdd({ ...q, bankName: selectedBank?.name })
    })
    onClose()
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-2xl bg-white flex flex-col"
        style={{ maxHeight: '85vh', border: '1px solid #E0E0E0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            {selectedBankId && (
              <button
                onClick={handleBack}
                className="p-1 transition-colors"
                style={{ color: '#9E9E9E', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold" style={{ color: '#222222' }}>
              {selectedBank ? selectedBank.name : '문제은행에서 추가'}
            </h3>
            {selectedBank && (
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{bankQuestions.length}개 문항</span>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* Step 1: 은행 선택 */}
        {!selectedBankId ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs" style={{ color: '#9E9E9E' }}>문제를 가져올 은행을 선택하세요</p>

            {/* 현재 과목 은행 */}
            {(() => {
              const currentBanks = currentCourse
                ? banks.filter(b => b.course === currentCourse)
                : banks
              return (
                <div className="space-y-2">
                  {currentCourse && (
                    <p className="text-xs font-medium" style={{ color: '#616161' }}>{currentCourse}</p>
                  )}
                  {currentBanks.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: '#BDBDBD' }}>이 과목에 등록된 문제은행이 없습니다</p>
                  ) : (
                    currentBanks.map(b => {
                      const count = getBankQuestions(b.id).length
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBankId(b.id)}
                          className="w-full flex items-center justify-between p-3 text-left transition-colors"
                          style={{ border: '1px solid #E0E0E0', borderRadius: 6 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#FAFAFA' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} style={{ color: '#9E9E9E' }} />
                            <span className="text-sm font-medium" style={{ color: '#222222' }}>{b.name}</span>
                          </div>
                          <span className="text-xs" style={{ color: '#9E9E9E' }}>{count}개 문항</span>
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
                  className="flex items-center gap-1.5 text-xs mb-2 transition-colors"
                  style={{ color: showOtherCourses ? '#6366f1' : '#9E9E9E' }}
                >
                  <ChevronLeft
                    size={13}
                    style={{ transform: showOtherCourses ? 'rotate(-90deg)' : 'rotate(-180deg)', transition: 'transform 0.15s' }}
                  />
                  다른 과목 문제은행
                </button>
                {showOtherCourses && (() => {
                  const otherBanks = banks.filter(b => b.course !== currentCourse)
                  // 과목별 그룹핑
                  const grouped = otherBanks.reduce((acc, b) => {
                    const key = b.course ?? '기타'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(b)
                    return acc
                  }, {})
                  return (
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([course, courseBanks]) => (
                        <div key={course} className="space-y-2">
                          <p className="text-xs font-medium" style={{ color: '#616161' }}>{course}</p>
                          {courseBanks.map(b => {
                            const count = getBankQuestions(b.id).length
                            return (
                              <button
                                key={b.id}
                                onClick={() => setSelectedBankId(b.id)}
                                className="w-full flex items-center justify-between p-3 text-left transition-colors"
                                style={{ border: '1px solid #E0E0E0', borderRadius: 6 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#FAFAFA' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.background = 'transparent' }}
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen size={14} style={{ color: '#9E9E9E' }} />
                                  <span className="text-sm font-medium" style={{ color: '#222222' }}>{b.name}</span>
                                </div>
                                <span className="text-xs" style={{ color: '#9E9E9E' }}>{count}개 문항</span>
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
            <div className="p-3 space-y-2 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
                  placeholder="문항 내용 검색"
                  className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none"
                  style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 전체 선택 */}
                {filtered.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer mr-1">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={toggleAll}
                      className="rounded"
                      style={{ accentColor: '#6366f1', width: 14, height: 14 }}
                    />
                    <span className="text-xs font-medium" style={{ color: '#424242' }}>전체</span>
                  </label>
                )}
                {/* 유형 필터 */}
                <DropdownSelect
                  value={filterType}
                  onChange={v => { setFilterType(v); setVisibleCount(15) }}
                  filterMode
                  options={[
                    { value: 'all', label: '모든 유형' },
                    ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
                  ]}
                />
                {/* 난이도 필터 */}
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
                <span className="text-xs ml-auto" style={{ color: '#9E9E9E' }}>{filtered.length}개</span>
              </div>
            </div>

            {/* 문항 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" onScroll={handleScroll}>
              {visible.map(q => {
                const isAdded = added.includes(q.id)
                const isChecked = checked.has(q.id)
                const diff = DIFFICULTY_COLORS[q.difficulty]
                return (
                  <label
                    key={q.id}
                    className="flex items-start gap-3 p-3 transition-all cursor-pointer"
                    style={{
                      border: isAdded ? '1px solid #c7d2fe' : isChecked ? '1px solid #a5b4fc' : '1px solid #E0E0E0',
                      borderRadius: 6,
                      background: isAdded ? '#EEF2FF' : isChecked ? '#F5F3FF' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked || isAdded}
                      disabled={isAdded}
                      onChange={() => !isAdded && toggleOne(q.id)}
                      className="mt-0.5 rounded shrink-0"
                      style={{ accentColor: '#6366f1', width: 14, height: 14 }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                        {q.difficulty && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: diff?.bg, color: diff?.text }}>
                            {DIFFICULTY_LABELS[q.difficulty]}
                          </span>
                        )}
                        {isAdded && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#6366f1' }}>추가됨</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                  </label>
                )
              })}
              {hasMore && <div className="py-4 text-center text-xs" style={{ color: '#9E9E9E' }}>스크롤하면 더 불러옵니다...</div>}
              {!hasMore && filtered.length > 0 && <div className="py-4 text-center text-xs" style={{ color: '#BDBDBD' }}>모든 문항을 불러왔습니다</div>}
              {filtered.length === 0 && <div className="py-10 text-center text-sm" style={{ color: '#BDBDBD' }}>검색 결과가 없습니다</div>}
            </div>

            {/* 하단 확인 버튼 */}
            <div className="p-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: '1px solid #EEEEEE' }}>
                <button
                  onClick={onClose}
                  className="text-sm px-3 py-1.5 rounded transition-colors"
                  style={{ color: '#616161', background: '#F5F5F5' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEEEEE'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F5F5F5'}
                >
                  닫기
                </button>
                <button
                  onClick={handleConfirmAdd}
                  disabled={checked.size === 0}
                  className="text-sm px-4 py-1.5 rounded transition-colors text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#6366f1' }}
                  onMouseEnter={e => { if (checked.size > 0) e.currentTarget.style.background = '#4f46e5' }}
                  onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
                >
                  {checked.size > 0 ? `${checked.size}개 추가` : '추가'}
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
