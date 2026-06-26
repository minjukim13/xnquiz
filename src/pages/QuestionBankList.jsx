import { useState, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, Pencil, Search, X, Tag, LayoutGrid, List as ListIcon } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useQuestionBank } from '../context/questionBank'
import { useRole } from '../context/role'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import AddBankModal from '../components/AddBankModal'
import { DropdownSelect } from '../components/DropdownSelect'
import { DIFFICULTY_META, DIFF_LABEL } from '../components/bankDifficulty'
import { questionSearchText } from '../utils/bankSearch'

const CURRENT_COURSE = 'CS301 데이터베이스'
function resolveCurrentCourseCode() {
  return CURRENT_COURSE.split(/\s+/)[0].toUpperCase()
}

// "CS301 데이터베이스" → { code: 'CS301', name: '데이터베이스' }. 코드 패턴이 없으면 code=null.
function parseCourse(course) {
  const m = course.match(/^([A-Za-z]+\s*\d+)\s+(.+)$/)
  if (m) return { code: m[1].replace(/\s+/g, '').toUpperCase(), name: m[2].trim() }
  return { code: null, name: course }
}

const SORT_OPTIONS = [
  { value: 'updated', label: '최근 수정순' },
  { value: 'created', label: '생성일순' },
  { value: 'name', label: '이름순' },
  { value: 'count', label: '문항 수순' },
]

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { role } = useRole()
  const { banks, addBank, deleteBank, getBankQuestions, addQuestions, updateBank } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [editingBankId, setEditingBankId] = useState(null)
  const [bankNameDraft, setBankNameDraft] = useState('')
  // 사용자 단위 조직화 — 검색/정렬/필터 + 과목 탐색기 + 보기 모드
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  // 과목 탐색기 — 기본은 현재 과목만 표시. '__all__' 이면 전체.
  const [selectedCourse, setSelectedCourse] = useState(CURRENT_COURSE)
  // 보기 모드(카드/리스트) — 로컬에 유지
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('xnq_bank_view') || 'card' } catch { return 'card' }
  })
  const changeViewMode = (m) => {
    setViewMode(m)
    try { localStorage.setItem('xnq_bank_view', m) } catch { /* noop */ }
  }

  const NO_COURSE = '미지정'
  const allTags = useMemo(
    () => [...new Set(banks.flatMap(b => b.tags ?? []))].sort(),
    [banks]
  )

  // 난이도 탭 카운트 — 현재 과목 + 검색 + 태그 범위에서 난이도 선택만 제외하고 집계
  const diffCounts = useMemo(() => {
    const term = search.trim().toLowerCase()
    const inScope = banks.filter(b => {
      const c = b.course || NO_COURSE
      if (selectedCourse !== '__all__' && c !== selectedCourse) return false
      if (filterTag !== 'all' && !(b.tags ?? []).includes(filterTag)) return false
      if (term) {
        const nameHit = b.name.toLowerCase().includes(term)
        const qHit = getBankQuestions(b.id).some(q => questionSearchText(q).includes(term))
        if (!nameHit && !qHit) return false
      }
      return true
    })
    const counts = { all: inScope.length, high: 0, medium: 0, low: 0, unset: 0 }
    inScope.forEach(b => {
      const d = b.difficulty || ''
      if (d === 'high') counts.high++
      else if (d === 'medium') counts.medium++
      else if (d === 'low') counts.low++
      else counts.unset++
    })
    return counts
  }, [banks, search, filterTag, selectedCourse, getBankQuestions])

  // 과목 탐색기 항목: 현재 과목(고정) → 전체 → 그 외 과목들. 각 개수는 과목별 전체 은행 수(검색/필터 무관, 순수 탐색용).
  const courseNav = useMemo(() => {
    const counts = {}
    banks.forEach(b => {
      const c = b.course || NO_COURSE
      counts[c] = (counts[c] || 0) + 1
    })
    const others = [...new Set(banks.map(b => b.course || NO_COURSE))]
      .filter(c => c !== CURRENT_COURSE)
      .sort((a, b) => (a === NO_COURSE ? 1 : b === NO_COURSE ? -1 : a.localeCompare(b, 'ko')))
    return {
      current: { key: CURRENT_COURSE, label: '현재 과목', count: counts[CURRENT_COURSE] || 0 },
      all: { key: '__all__', label: '전체 과목', count: banks.length },
      others: others.map(c => (
        c === NO_COURSE
          ? { key: c, label: '출처 미지정', count: counts[c] || 0 }
          : { key: c, ...parseCourse(c), count: counts[c] || 0 }
      )),
    }
  }, [banks])

  // 선택 과목 범위 안에서 검색 + 난이도 + 태그 필터 + 정렬 적용. qHits = 본문으로 매칭된 문항 수.
  const visibleBanks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return banks
      .filter(b => selectedCourse === '__all__' || (b.course || NO_COURSE) === selectedCourse)
      .map(b => {
        const qs = getBankQuestions(b.id)
        let qHits = 0
        let nameHit = true
        if (term) {
          nameHit = b.name.toLowerCase().includes(term)
          qHits = qs.filter(q => questionSearchText(q).includes(term)).length
        }
        return { bank: b, count: qs.length, matched: !term || nameHit || qHits > 0, qHits: nameHit ? 0 : qHits }
      })
      .filter(x => x.matched)
      .filter(x => filterDiff === 'all' || (filterDiff === 'unset' ? !x.bank.difficulty : (x.bank.difficulty || '') === filterDiff))
      .filter(x => filterTag === 'all' || (x.bank.tags ?? []).includes(filterTag))
      .sort((a, b) => {
        if (sortBy === 'name') return a.bank.name.localeCompare(b.bank.name, 'ko')
        if (sortBy === 'count') return b.count - a.count
        if (sortBy === 'created') return (b.bank.createdAt || '').localeCompare(a.bank.createdAt || '')
        return (b.bank.updatedAt || '').localeCompare(a.bank.updatedAt || '') // updated
      })
  }, [banks, selectedCourse, search, filterDiff, filterTag, sortBy, getBankQuestions])

  const hasActiveFilter = search.trim() || filterDiff !== 'all' || filterTag !== 'all'

  if (role !== 'instructor') return <Navigate to="/" replace />

  const showToast = (msg, bankId) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

  const toggleBankTag = (bank, tag) => {
    const current = bank.tags ?? []
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    updateBank(bank.id, { tags: next })
  }
  const addBankTag = (bank, raw) => {
    const t = raw.trim()
    if (!t) return
    const current = bank.tags ?? []
    if (!current.includes(t)) updateBank(bank.id, { tags: [...current, t] })
  }

  const executeCopyBank = async (bank) => {
    const newName = `${bank.name}-사본`
    try {
      const created = await addBank({
         
        id: `bank_copy_${Date.now()}`,
        name: newName,
        difficulty: bank.difficulty,
        course: bank.course,
        courseCode: bank.courseCode,
        updatedAt: new Date().toISOString().split('T')[0],
        usedInQuizIds: [],
      })
      const bankId = created?.id
      if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
      const bankQs = getBankQuestions(bank.id)
      if (bankQs.length > 0) {
        await addQuestions(bankQs.map(q => ({
          ...q,
          id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          bankId,
        })))
      }
      showToast(`'${newName}' 문제은행이 생성되었습니다`, bankId)
    } catch (err) {
      console.error('[QuestionBankList] 복사 실패', err)
      showToast('복사 중 오류가 발생했습니다')
    }
  }

  // 카드/리스트 공용 핸들러 묶음
  const bankHandlers = {
    navigate,
    editingBankId, setEditingBankId,
    bankNameDraft, setBankNameDraft,
    updateBank,
    executeCopyBank,
    setDeleteTarget,
    allTags, toggleBankTag, addBankTag,
  }

  return (
    <>
      <div className="pb-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4" style={{ paddingTop: 32, paddingBottom: 20 }}>
          <h1 className="text-[24px] font-bold text-foreground leading-tight">문제은행</h1>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              새 문제은행
            </Button>
          </div>
        </div>

        {/* 안내: 사용자 단위 자산 */}
        <p className="text-[13px] text-muted-foreground -mt-1 mb-3">
          문제은행은 과목과 무관하게 내 모든 과목에서 공유됩니다. 좌측에서 과목을 골라 탐색하세요.
        </p>

        {/* 탐색기: 좌측 과목 사이드바 + 우측(검색/필터/정렬 + 은행 목록) */}
        {banks.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mt-1">
            <CourseSidebar
              nav={courseNav}
              selected={selectedCourse}
              onSelect={setSelectedCourse}
            />

            <div className="flex-1 min-w-0">
              {/* 검색/필터 툴바 — 1행: 난이도 탭 ... 정렬 + 보기 / 2행: 검색 + 태그 드롭다운 */}
              <div className="mb-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <DifficultyFilterTabs value={filterDiff} onChange={setFilterDiff} counts={diffCounts} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DropdownSelect
                      value={sortBy}
                      onChange={setSortBy}
                      options={SORT_OPTIONS}
                      size="md"
                      ghost
                      className="w-[120px] sm:w-[136px]"
                    />
                    <ViewToggle value={viewMode} onChange={changeViewMode} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="문제은행 이름 또는 문항 내용 검색"
                      className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    )}
                  </div>
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
                      ghost
                      className="w-[130px] sm:w-[150px] shrink-0"
                    />
                  )}
                </div>
              </div>

              {visibleBanks.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border rounded-xl">
                  <Search size={32} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1 text-muted-foreground">
                    {hasActiveFilter ? '조건에 맞는 문제은행이 없습니다' : '이 과목에 문제은행이 없습니다'}
                  </p>
                  <p className="text-xs mb-4 text-muted-foreground">
                    {hasActiveFilter ? '검색어나 필터를 바꿔 보세요' : '다른 과목을 선택하거나 새 문제은행을 만드세요'}
                  </p>
                  {hasActiveFilter ? (
                    <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterDiff('all'); setFilterTag('all') }}>
                      필터 초기화
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus size={14} /> 새 문제은행
                    </Button>
                  )}
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleBanks.map(entry => (
                    <BankCard key={entry.bank.id} entry={entry} h={bankHandlers} />
                  ))}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px] border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus size={20} />
                    <span className="text-sm font-medium">새 문제은행 추가</span>
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-xl bg-white overflow-hidden divide-y divide-border">
                  {visibleBanks.map(entry => (
                    <BankRow key={entry.bank.id} entry={entry} h={bankHandlers} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {banks.length === 0 && (
          <div className="mt-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1 text-muted-foreground">문제은행이 없습니다</p>
            <p className="text-xs mb-4 text-muted-foreground">새 문제은행을 만들어 문항을 관리하세요</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm font-medium px-4 py-2 bg-primary text-primary-foreground rounded transition-colors hover:bg-primary-hover"
            >
              첫 문제은행 만들기
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddBankModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (name, difficulty, tags = []) => {
            try {
              const today = new Date().toISOString().split('T')[0]
              await addBank({
                id: `bank_custom_${Date.now()}`,
                name,
                difficulty,
                course: CURRENT_COURSE,
                courseCode: resolveCurrentCourseCode(),
                tags,
                createdAt: today,
                updatedAt: today,
                usedInQuizIds: [],
              })
              setShowAddModal(false)
            } catch (err) {
              console.error('[QuestionBankList] 은행 생성 실패', err)
              showToast('생성 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`'${deleteTarget.name}' 문제은행을 삭제할까요?`}
          message={`은행에 포함된 문항 ${getQuestionCount(deleteTarget.id)}개가 함께 삭제되며 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmDanger
          onConfirm={async () => {
            const target = deleteTarget
            setDeleteTarget(null)
            try {
              await deleteBank(target.id)
            } catch (err) {
              console.error('[QuestionBankList] 삭제 실패', err)
              showToast('삭제 중 오류가 발생했습니다')
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          action={toast.bankId ? { label: '바로가기', onClick: () => { navigate(`/question-banks/${toast.bankId}`); setToast(null) } } : undefined}
        />
      )}
    </>
  )
}

// ── 난이도 필터 탭 ──────────────────────────────────────────────────────────
const DIFF_TABS = [
  { value: 'all', label: '전체' },
  { value: 'high', label: DIFFICULTY_META.high.label },
  { value: 'medium', label: DIFFICULTY_META.medium.label },
  { value: 'low', label: DIFFICULTY_META.low.label },
]

function DifficultyFilterTabs({ value, onChange, counts }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto -mx-0.5 px-0.5 py-0.5">
      {DIFF_TABS.map(t => {
        const active = value === t.value
        const count = counts[t.value] ?? 0
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            aria-pressed={active}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] whitespace-nowrap transition-colors',
              active
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'font-medium text-secondary-foreground hover:bg-secondary'
            )}
          >
            <span>{t.label}</span>
            <span className={cn('text-[11px] tabular-nums', active ? 'text-accent-foreground/70' : 'text-muted-foreground')}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 카드/리스트 보기 토글 ──────────────────────────────────────────────────
function ViewToggle({ value, onChange }) {
  const base = 'flex items-center justify-center w-8 h-8 rounded-md transition-colors'
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border shrink-0">
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={value === 'card'}
        title="카드 보기"
        className={cn(base, value === 'card' ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground')}
      >
        <LayoutGrid size={15} />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
        title="리스트 보기"
        className={cn(base, value === 'list' ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground')}
      >
        <ListIcon size={15} />
      </button>
    </div>
  )
}

// ── 과목 탐색기 사이드바 ────────────────────────────────────────────────────
function CourseNavItem({ item, active, onSelect }) {
  const hasCode = !!item.code
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      title={hasCode ? `${item.code} ${item.name}` : item.label}
      className={cn(
        'w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-colors shrink-0',
        active ? 'bg-accent text-primary font-semibold' : 'text-secondary-foreground hover:bg-secondary'
      )}
    >
      {hasCode && (
        <span className="shrink-0 text-[11px] font-semibold tracking-tight px-1.5 py-0.5 rounded-md tabular-nums bg-accent text-accent-foreground">
          {item.code}
        </span>
      )}
      <span className="flex-1 min-w-0 truncate text-sm">{hasCode ? item.name : item.label}</span>
      <span className={cn('text-xs tabular-nums shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{item.count}</span>
    </button>
  )
}

function CourseSidebar({ nav, selected, onSelect }) {
  return (
    <aside className="sm:w-52 shrink-0">
      <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
        <CourseNavItem item={nav.current} active={selected === nav.current.key} onSelect={onSelect} />
        <CourseNavItem item={nav.all} active={selected === nav.all.key} onSelect={onSelect} />
        {nav.others.length > 0 && (
          <>
            <div className="hidden sm:block px-3 pt-2 pb-1">
              <span className="text-[11px] font-medium text-muted-foreground">다른 과목</span>
            </div>
            {nav.others.map(o => (
              <CourseNavItem key={o.key} item={o} active={selected === o.key} onSelect={onSelect} />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}

// ── 은행 카드 ───────────────────────────────────────────────────────────────
function BankCard({ entry, h }) {
  const { bank, count: qCount, qHits } = entry
  const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
  const course = bank.course ? parseCourse(bank.course) : null
  return (
    <div
      onClick={() => h.navigate(`/question-banks/${bank.id}`)}
      className="flex flex-col min-h-[168px] bg-white p-5 cursor-pointer transition-all border border-border rounded-xl hover:shadow-md hover:border-primary/40"
    >
      {/* 1줄: 과목(eyebrow) + 액션 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {course ? (
            <div className="flex items-center gap-1.5">
              {course.code && (
                <span className="-ml-1.5 shrink-0 text-[11px] font-semibold tracking-tight px-1.5 py-0.5 rounded-md tabular-nums bg-accent text-accent-foreground">
                  {course.code}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate" title={`출처: ${bank.course}`}>
                {course.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">과목 미지정</span>
          )}

          {/* 2줄: 문제은행명 */}
          {h.editingBankId === bank.id ? (
            <input
              autoFocus
              value={h.bankNameDraft}
              onClick={e => e.stopPropagation()}
              onChange={e => h.setBankNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && h.bankNameDraft.trim()) {
                  h.updateBank(bank.id, { name: h.bankNameDraft.trim() })
                  h.setEditingBankId(null)
                }
                if (e.key === 'Escape') h.setEditingBankId(null)
              }}
              onBlur={() => {
                if (h.bankNameDraft.trim()) h.updateBank(bank.id, { name: h.bankNameDraft.trim() })
                h.setEditingBankId(null)
              }}
              className="mt-2 font-semibold text-base leading-snug text-foreground focus:outline-none border-b-2 border-primary bg-transparent min-w-0 w-full"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/title min-w-0 mt-2">
              <h3 className="font-semibold text-base leading-snug text-foreground truncate">{bank.name}</h3>
              <button
                onClick={e => { e.stopPropagation(); h.setBankNameDraft(bank.name); h.setEditingBankId(bank.id) }}
                className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary shrink-0"
                title="이름 수정"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1">
          <button
            onClick={e => { e.stopPropagation(); h.executeCopyBank(bank) }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-secondary-foreground hover:bg-secondary transition-colors"
            title="복사"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); h.setDeleteTarget(bank) }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {qHits > 0 && (
        <p className="text-xs text-primary mt-2.5">문항 {qHits}개에 검색어 포함</p>
      )}

      {/* 3줄: 난이도 · 문항수 · 수정일 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto pt-4">
        <span className={cn(
          '-ml-1.5 px-1.5 py-0.5 rounded-md font-medium',
          bank.difficulty && DIFFICULTY_META[bank.difficulty]
            ? DIFFICULTY_META[bank.difficulty].cls
            : 'bg-secondary text-muted-foreground'
        )}>
          {diffLabel || '미설정'}
        </span>
        <span className="text-secondary-foreground font-medium shrink-0">{qCount}개 문항</span>
        <span aria-hidden>·</span>
        <span className="truncate">{bank.updatedAt}</span>
      </div>

      {/* 4줄: 태그 */}
      <div className="flex items-center flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60" onClick={e => e.stopPropagation()}>
        {(bank.tags ?? []).map(t => (
          <span key={t} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">
            {t}
            <button onClick={() => h.toggleBankTag(bank, t)} className="hover:text-destructive" title="태그 제거">
              <X size={10} />
            </button>
          </span>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" title="태그 추가">
              <Tag size={11} /> 태그
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-2">
            <TagEditor bank={bank} allTags={h.allTags} onAdd={h.addBankTag} onToggle={h.toggleBankTag} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// ── 은행 리스트 행 ──────────────────────────────────────────────────────────
function BankRow({ entry, h }) {
  const { bank, count: qCount, qHits } = entry
  const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
  const course = bank.course ? parseCourse(bank.course) : null
  return (
    <div
      onClick={() => h.navigate(`/question-banks/${bank.id}`)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-background"
    >
      <span className={cn(
        'text-[11px] px-1.5 py-0.5 rounded-md font-medium shrink-0 w-9 text-center',
        bank.difficulty && DIFFICULTY_META[bank.difficulty]
          ? DIFFICULTY_META[bank.difficulty].cls
          : 'bg-secondary text-muted-foreground'
      )}>
        {diffLabel || '-'}
      </span>

      <div className="flex-1 min-w-0">
        {h.editingBankId === bank.id ? (
          <input
            autoFocus
            value={h.bankNameDraft}
            onClick={e => e.stopPropagation()}
            onChange={e => h.setBankNameDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && h.bankNameDraft.trim()) { h.updateBank(bank.id, { name: h.bankNameDraft.trim() }); h.setEditingBankId(null) }
              if (e.key === 'Escape') h.setEditingBankId(null)
            }}
            onBlur={() => { if (h.bankNameDraft.trim()) h.updateBank(bank.id, { name: h.bankNameDraft.trim() }); h.setEditingBankId(null) }}
            className="font-medium text-sm text-foreground focus:outline-none border-b-2 border-primary bg-transparent min-w-0 w-full"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">{bank.name}</span>
            {(bank.tags ?? []).slice(0, 2).map(t => (
              <span key={t} className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground shrink-0">{t}</span>
            ))}
            {qHits > 0 && <span className="text-[11px] text-primary shrink-0">문항 {qHits}개 일치</span>}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          {course?.code && (
            <span className="shrink-0 text-[10px] font-semibold tracking-tight px-1 py-0.5 rounded tabular-nums bg-accent text-accent-foreground" title={`출처: ${bank.course}`}>
              {course.code}
            </span>
          )}
          <span>{qCount}개 문항</span>
          {course && (
            <>
              <span>·</span>
              <span className="truncate max-w-[160px]">{course.name}</span>
            </>
          )}
          <span className="hidden sm:inline">· 최종 수정 {bank.updatedAt}</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { h.setBankNameDraft(bank.name); h.setEditingBankId(bank.id) }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="이름 수정"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => h.executeCopyBank(bank)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-secondary-foreground hover:bg-secondary transition-colors"
          title="복사"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => h.setDeleteTarget(bank)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
          title="삭제"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── 태그 편집기 (카드 내 팝오버) ──────────────────────────────────────────────
function TagEditor({ bank, allTags, onAdd, onToggle }) {
  const [draft, setDraft] = useState('')
  const current = bank.tags ?? []
  const suggestions = allTags.filter(t => !current.includes(t))
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onAdd(bank, draft); setDraft('') } }}
        placeholder="태그 입력 후 Enter"
        autoFocus
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-white focus:outline-none focus:border-primary"
      />
      {current.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {current.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">
              {t}
              <button onClick={() => onToggle(bank, t)} className="hover:text-destructive"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">기존 태그</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map(t => (
              <button key={t} onClick={() => onToggle(bank, t)} className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 새 문제은행 모달 ──────────────────────────────────────────────────────────
