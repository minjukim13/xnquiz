import { useState, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, Pencil, Search, X, Tag } from 'lucide-react'
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
  // 사용자 단위 조직화 — 검색/정렬/필터
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterTag, setFilterTag] = useState('all')

  const allCourses = useMemo(
    () => [...new Set(banks.map(b => b.course).filter(Boolean))].sort(),
    [banks]
  )
  const allTags = useMemo(
    () => [...new Set(banks.flatMap(b => b.tags ?? []))].sort(),
    [banks]
  )

  // 필터 + 통합검색(은행명 + 문항 본문/보기) + 정렬 적용. qHits = 본문으로 매칭된 문항 수.
  const visibleBanks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return banks
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
      .filter(x => filterDiff === 'all' || (x.bank.difficulty || '') === filterDiff)
      .filter(x => filterCourse === 'all' || x.bank.course === filterCourse)
      .filter(x => filterTag === 'all' || (x.bank.tags ?? []).includes(filterTag))
      .sort((a, b) => {
        if (sortBy === 'name') return a.bank.name.localeCompare(b.bank.name, 'ko')
        if (sortBy === 'count') return b.count - a.count
        if (sortBy === 'created') return (b.bank.createdAt || '').localeCompare(a.bank.createdAt || '')
        return (b.bank.updatedAt || '').localeCompare(a.bank.updatedAt || '') // updated
      })
  }, [banks, search, sortBy, filterDiff, filterCourse, filterTag, getBankQuestions])

  const hasActiveFilter = search.trim() || filterDiff !== 'all' || filterCourse !== 'all' || filterTag !== 'all'

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
          문제은행은 과목과 무관하게 내 모든 과목에서 공유됩니다. 출처 과목과 태그로 분류해 찾으세요.
        </p>

        {/* 검색/정렬/필터 툴바 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
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
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            size="md"
            filterMode
            className="w-[120px] sm:w-[136px] shrink-0"
          />
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
          <span className="text-xs text-muted-foreground ml-auto">{visibleBanks.length}개 표시</span>
        </div>

        {/* 은행 카드 그리드 */}
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleBanks.map(({ bank, count: qCount, qHits }) => {
            const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
            return (
              <div
                key={bank.id}
                onClick={() => navigate(`/question-banks/${bank.id}`)}
                className="flex flex-col justify-between min-h-[148px] bg-white p-5 cursor-pointer transition-all border border-border rounded-xl hover:shadow-md"
              >
                {/* 상단 영역 */}
                <div>
                  {/* 1열: 제목 + 액션 아이콘 */}
                  <div className="flex items-start justify-between gap-3">
                    {editingBankId === bank.id ? (
                      <input
                        autoFocus
                        value={bankNameDraft}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setBankNameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && bankNameDraft.trim()) {
                            updateBank(bank.id, { name: bankNameDraft.trim() })
                            setEditingBankId(null)
                          }
                          if (e.key === 'Escape') setEditingBankId(null)
                        }}
                        onBlur={() => {
                          if (bankNameDraft.trim()) updateBank(bank.id, { name: bankNameDraft.trim() })
                          setEditingBankId(null)
                        }}
                        className="font-semibold text-[15px] leading-snug text-foreground focus:outline-none border-b-2 border-primary bg-transparent min-w-0 w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 group/title min-w-0">
                        <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate">{bank.name}</h3>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setBankNameDraft(bank.name)
                            setEditingBankId(bank.id)
                          }}
                          className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary shrink-0"
                          title="이름 수정"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0 -mt-0.5 -mr-1">
                      <button
                        onClick={e => { e.stopPropagation(); executeCopyBank(bank) }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-secondary-foreground hover:bg-secondary transition-colors"
                        title="복사"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(bank) }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 2열: 난이도 뱃지 · N개 문항 · 출처 과목 */}
                  <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-md font-medium',
                      bank.difficulty && DIFFICULTY_META[bank.difficulty]
                        ? DIFFICULTY_META[bank.difficulty].cls
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {diffLabel || '미설정'}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-secondary-foreground">{qCount}개 문항</span>
                    {bank.course && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground truncate max-w-[140px]" title={`출처: ${bank.course}`}>
                        {bank.course}
                      </span>
                    )}
                  </div>

                  {/* 태그 행 (편집 가능) */}
                  <div className="flex items-center flex-wrap gap-1 mt-2" onClick={e => e.stopPropagation()}>
                    {(bank.tags ?? []).map(t => (
                      <span key={t} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">
                        {t}
                        <button onClick={() => toggleBankTag(bank, t)} className="hover:text-destructive" title="태그 제거">
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
                        <TagEditor bank={bank} allTags={allTags} onAdd={addBankTag} onToggle={toggleBankTag} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {qHits > 0 && (
                    <p className="text-xs text-primary mt-2">문항 {qHits}개에 검색어 포함</p>
                  )}
                </div>

                {/* 하단: 최종 수정일 */}
                <p className="text-[13px] text-muted-foreground mt-2">최종 수정 {bank.updatedAt}</p>
              </div>
            )
          })}

          {/* 추가 카드 (표시할 문제은행이 있을 때만 노출) */}
          {visibleBanks.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px] border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">새 문제은행 추가</span>
            </button>
          )}
        </div>

        {/* 필터 결과 없음 */}
        {banks.length > 0 && visibleBanks.length === 0 && (
          <div className="mt-12 text-center">
            <Search size={36} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1 text-muted-foreground">조건에 맞는 문제은행이 없습니다</p>
            <p className="text-xs mb-4 text-muted-foreground">검색어나 필터를 바꿔 보세요</p>
            {hasActiveFilter && (
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterDiff('all'); setFilterCourse('all'); setFilterTag('all') }}>
                필터 초기화
              </Button>
            )}
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
