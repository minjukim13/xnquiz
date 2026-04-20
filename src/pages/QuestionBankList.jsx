import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, FolderInput, FolderOutput, Search, X, Pencil } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/questionBank'
import { QUIZ_TYPES, MOCK_COURSES } from '../data/mockData'
import { useRole } from '../context/role'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '../components/ConfirmDialog'

const CURRENT_COURSE = 'CS301 데이터베이스'

const DIFFICULTY_META = {
  high:   { label: '상', cls: 'text-destructive bg-incorrect-bg', textCls: 'text-destructive' },
  medium: { label: '중', cls: 'text-amber-500 bg-amber-50', textCls: 'text-amber-500' },
  low:    { label: '하', cls: 'text-correct bg-correct-bg', textCls: 'text-correct' },
}

const DIFF_LABEL = { '': '미지정', high: '상', medium: '중', low: '하' }

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { role } = useRole()
  const { banks, addBank, deleteBank, getBankQuestions, addQuestions, updateBank } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [editingBankId, setEditingBankId] = useState(null)
  const [bankNameDraft, setBankNameDraft] = useState('')

  if (role !== 'instructor') return <Navigate to="/" replace />

  const showToast = (msg, bankId) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

  const executeCopyBank = async (bank) => {
    const newName = `${bank.name}-사본`
    try {
      const created = await addBank({
        // eslint-disable-next-line react-hooks/purity -- event-handler-only ID generation
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
    <Layout>
      <div className="max-w-6xl mx-auto pb-8">
        {/* 헤더 */}
        <div className="flex items-end justify-between gap-4" style={{ paddingTop: 32, paddingBottom: 20 }}>
          <h1 className="text-[24px] font-bold text-foreground leading-tight">문제은행</h1>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="outline" onClick={() => setShowCopyModal(true)}>
              <FolderInput size={14} />
              가져오기
            </Button>
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <FolderOutput size={14} />
              내보내기
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              새 문제은행
            </Button>
          </div>
        </div>

        {/* 은행 카드 그리드 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const qCount = getQuestionCount(bank.id)
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

                  {/* 2열: 난이도 뱃지 · N개 문항 */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-md font-medium',
                      bank.difficulty && DIFFICULTY_META[bank.difficulty]
                        ? DIFFICULTY_META[bank.difficulty].cls
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {diffLabel || '미지정'}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-secondary-foreground">{qCount}개 문항</span>
                  </div>
                </div>

                {/* 하단: 최종 수정일 */}
                <p className="text-[13px] text-muted-foreground">최종 수정 {bank.updatedAt}</p>
              </div>
            )
          })}

          {/* 추가 카드 */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px] border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">새 문제은행 추가</span>
          </button>
        </div>

        {/* 빈 상태 */}
        {banks.length === 0 && (
          <div className="mt-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
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
          onAdd={async (name, difficulty) => {
            try {
              await addBank({
                id: `bank_custom_${Date.now()}`,
                name,
                difficulty,
                course: CURRENT_COURSE,
                updatedAt: new Date().toISOString().split('T')[0],
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

      {showCopyModal && (
        <ImportModal
          onClose={() => setShowCopyModal(false)}
          onImport={async (selectedQs, bankName, difficulty, existingBankId) => {
            try {
              let bankId, toastName
              if (existingBankId) {
                bankId = existingBankId
                toastName = banks.find(b => b.id === existingBankId)?.name || '문제은행'
              } else {
                const created = await addBank({
                  id: `bank_import_${Date.now()}`,
                  name: bankName,
                  difficulty: difficulty || '',
                  course: CURRENT_COURSE,
                  updatedAt: new Date().toISOString().split('T')[0],
                  usedInQuizIds: [],
                })
                bankId = created?.id
                toastName = bankName
                if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
              }
              await addQuestions(selectedQs.map(q => ({
                ...q,
                _sourceBankName: undefined,
                id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                bankId,
              })))
              setShowCopyModal(false)
              showToast(`'${toastName}' 문제은행에 ${selectedQs.length}개 문항 가져오기 완료`, bankId)
            } catch (err) {
              console.error('[QuestionBankList] 가져오기 실패', err)
              showToast('가져오기 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {showExportModal && (
        <ExportToBankModal
          onClose={() => setShowExportModal(false)}
          onExport={async (questions, targetCourse, targetBankId, newBankName, difficulty) => {
            try {
              let bankId = targetBankId
              let bankName = newBankName
              if (targetBankId === '__new__') {
                const created = await addBank({
                  id: `bank_export_${Date.now()}`,
                  name: bankName,
                  difficulty: difficulty || '',
                  course: targetCourse,
                  updatedAt: new Date().toISOString().split('T')[0],
                  usedInQuizIds: [],
                })
                bankId = created?.id
                if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
              } else {
                bankName = banks.find(b => b.id === bankId)?.name || bankName
              }
              await addQuestions(questions.map(q => ({
                ...q,
                _sourceBankName: undefined,
                id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                bankId,
              })))
              setShowExportModal(false)
              showToast(`'${bankName}' 문제은행에 ${questions.length}개 문항을 내보냈습니다`, bankId)
            } catch (err) {
              console.error('[QuestionBankList] 내보내기 실패', err)
              showToast('내보내기 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          action={toast.bankId ? { label: '바로가기', onClick: () => { navigate(`/question-banks/${toast.bankId}`); setToast(null) } } : undefined}
        />
      )}
    </Layout>
  )
}

// ── 새 문제은행 모달 ──────────────────────────────────────────────────────────
function AddBankModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState('')

  const diffOptions = [
    { value: '', label: '미지정' },
    { value: 'high', label: '상' },
    { value: 'medium', label: '중' },
    { value: 'low', label: '하' },
  ]

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 문제은행 만들기</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim(), difficulty)}
            placeholder="문제은행 이름 (예: 기말고사 문제은행)"
            autoFocus
            className="w-full text-[15px] px-3 py-2 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">난이도</label>
          <div className="flex gap-2">
            {diffOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={cn(
                  'flex-1 text-xs py-1.5 font-medium rounded transition-all border',
                  difficulty === opt.value
                    ? 'border-blue-400 bg-accent text-primary'
                    : cn(
                        'border-slate-200',
                        opt.value === 'high' ? 'text-red-600'
                          : opt.value === 'medium' ? 'text-amber-600'
                          : opt.value === 'low' ? 'text-green-600'
                          : 'text-slate-500'
                      )
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {difficulty && (
            <p className="text-xs mt-3 text-muted-foreground">
              난이도 '{DIFF_LABEL[difficulty]}'인 문항만 추가할 수 있습니다
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => name.trim() && onAdd(name.trim(), difficulty)}
          >
            만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 난이도 뱃지 (공통) ──────────────────────────────────────────────────────
function DiffBadge({ difficulty, className }) {
  const meta = difficulty && DIFFICULTY_META[difficulty]
  return (
    <span className={cn('text-xs px-1.5 py-0.5 font-medium rounded-md', meta ? meta.cls : 'text-muted-foreground bg-secondary', className)}>
      {meta ? meta.label : '미지정'}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wizard 공통 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

function WizardSteps({ step, labels }) {
  return (
    <div className="flex items-center">
      {labels.map((label, i) => {
        const num = i + 1
        const isActive = step === num
        const isDone = step > num
        return (
          <div key={num} className="flex items-center">
            {i > 0 && <div className={cn('w-8 h-px mx-2', isDone ? 'bg-primary' : 'bg-border')} />}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold leading-none',
                isActive || isDone ? 'bg-primary text-white' : 'border border-border text-muted-foreground'
              )}>
                {isDone ? '\u2713' : num}
              </span>
              <span className={cn(
                'text-xs',
                isActive ? 'text-foreground font-semibold' : isDone ? 'text-secondary-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionRow({ q, selected, selectable, onToggle }) {
  return (
    <div
      onClick={() => selectable && onToggle(q)}
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 border rounded-lg transition-all',
        selected ? 'border-primary bg-accent' : 'border-border',
        selectable ? 'cursor-pointer hover:border-primary/40' : 'cursor-not-allowed opacity-40'
      )}
    >
      <input type="checkbox" checked={selected} readOnly disabled={!selectable} className="mt-0.5 shrink-0 accent-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <DiffBadge difficulty={q.difficulty} />
          <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-secondary text-secondary-foreground">
            {QUIZ_TYPES[q.type]?.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{q.points}점</span>
          {q._sourceBankName && (
            <span className="text-[11px] text-muted-foreground">{q._sourceBankName}</span>
          )}
        </div>
        <p className="text-xs leading-relaxed line-clamp-2 text-secondary-foreground">{q.text}</p>
      </div>
    </div>
  )
}

function ReviewRow({ q, index, onRemove }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-lg">
      <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-4 text-right">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <DiffBadge difficulty={q.difficulty} />
          <span className="text-[11px] text-secondary-foreground">{QUIZ_TYPES[q.type]?.label}</span>
          <span className="text-[11px] text-muted-foreground">{q.points}점</span>
        </div>
        <p className="text-xs leading-relaxed line-clamp-1 text-secondary-foreground mt-0.5">{q.text}</p>
      </div>
      <button
        onClick={() => onRemove(q.id)}
        className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function WizardDifficultySelector({ value, allowedDifficulties, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs shrink-0 text-muted-foreground">난이도</span>
      {['', 'high', 'medium', 'low'].map(d => {
        const isAllowed = allowedDifficulties.includes(d)
        const isActive = value === d
        return (
          <button
            key={d}
            type="button"
            disabled={!isAllowed}
            onClick={() => onChange(d)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md border transition-all font-medium disabled:opacity-30 disabled:cursor-not-allowed',
              isActive ? 'border-primary bg-primary text-white' : 'border-border text-secondary-foreground hover:border-primary/40'
            )}
          >
            {DIFF_LABEL[d]}
          </button>
        )
      })}
    </div>
  )
}

function WizardSourceBankList({ availableCourses, courseGroups, selectedSourceIds, onToggle }) {
  return (
    <>
      {availableCourses.map(c => {
        const list = (courseGroups[c.name] || [])
        if (list.length === 0) return null
        return (
          <div key={c.id}>
            <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-secondary/60 border-b border-border/60">{c.name}</p>
            {list.map(b => {
              const isChecked = selectedSourceIds.includes(b.id)
              return (
                <label
                  key={b.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-l-2',
                    isChecked ? 'border-l-primary bg-accent font-medium text-primary' : 'border-l-transparent text-secondary-foreground hover:bg-secondary/40'
                  )}
                >
                  <input type="checkbox" checked={isChecked} onChange={() => onToggle(b.id)} className="accent-primary shrink-0" />
                  <DiffBadge difficulty={b.difficulty} />
                  <span className="truncate flex-1">{b.name}</span>
                </label>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

// Step 1 공통: 소스 사이드바 + 문항 체크리스트
function WizardStep1({ courseSearch, setCourseSearch, availableCourses, courseGroups, selectedSourceIds, handleSourceToggle, filterType, setFilterType, filterDifficulty, setFilterDifficulty, filtered, selectedQuestionIds, allFilteredSelected, someFilteredSelected, toggle, toggleAll }) {
  return (
    <div className="flex flex-1 min-h-0">
      {/* 사이드바 */}
      <div className="flex flex-col shrink-0 w-[200px] border-r border-border">
        <div className="px-3 pt-3 pb-2 shrink-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">소스 문제은행</p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="검색"
              className="w-full text-xs pl-7 pr-2 py-1.5 border border-border rounded-md focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <WizardSourceBankList
            availableCourses={availableCourses}
            courseGroups={courseGroups}
            selectedSourceIds={selectedSourceIds}
            onToggle={handleSourceToggle}
          />
        </div>
      </div>

      {/* 문항 리스트 */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="px-4 py-2.5 shrink-0 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={filterType}
              onChange={setFilterType}
              filterMode
              options={[
                { value: 'all', label: '모든 유형' },
                ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
              ]}
            />
            <DropdownSelect
              value={filterDifficulty}
              onChange={setFilterDifficulty}
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
        </div>
        {selectedSourceIds.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[15px] text-muted-foreground">좌측에서 소스 문제은행을 선택하세요</p>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="px-4 py-2 flex items-center justify-between border-b border-border/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someFilteredSelected }}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                  <span className="text-xs text-secondary-foreground">{allFilteredSelected ? '전체 해제' : '전체 선택'}</span>
                </label>
                <span className="text-xs text-muted-foreground">총 {filtered.length}개</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-muted-foreground">해당하는 문항이 없습니다</p>
              ) : (
                filtered.map(q => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    selected={selectedQuestionIds.includes(q.id)}
                    selectable={true}
                    onToggle={toggle}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 내보내기 모달 (2-step wizard)
// ═══════════════════════════════════════════════════════════════════════════════

function ExportToBankModal({ onClose, onExport }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [step, setStep] = useState(1)

  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [targetCourse, setTargetCourse] = useState(CURRENT_COURSE)
  const [targetMode, setTargetMode] = useState('new')
  const [targetBankId, setTargetBankId] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [newBankDifficulty, setNewBankDifficulty] = useState(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [inlineToast, setInlineToast] = useState(null)

  const targetBank = targetBankId ? banks.find(b => b.id === targetBankId) : null
  const courseBanks = banks.filter(b => b.course === targetCourse && !selectedSourceIds.includes(b.id))

  const sourceQuestions = useMemo(() => {
    return selectedSourceIds.flatMap(bankId => {
      const bankName = banks.find(b => b.id === bankId)?.name || ''
      return getBankQuestions(bankId).map(q => ({ ...q, _sourceBankName: bankName }))
    })
  }, [selectedSourceIds, banks, getBankQuestions])

  const filtered = useMemo(() => sourceQuestions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  }), [sourceQuestions, filterType, filterDifficulty])

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selectedQuestionIds.includes(q.id))
  const someFilteredSelected = filtered.some(q => selectedQuestionIds.includes(q.id)) && !allFilteredSelected

  const toggle = (q) => {
    setSelectedQuestionIds(prev =>
      prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id]
    )
  }

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !filtered.find(q => q.id === id)))
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...filtered.map(q => q.id)])])
    }
  }

  const selectedQuestions = useMemo(() =>
    selectedQuestionIds.map(id => sourceQuestions.find(q => q.id === id)).filter(Boolean),
    [selectedQuestionIds, sourceQuestions]
  )

  const autoDifficulty = useMemo(() => {
    if (selectedQuestions.length === 0) return ''
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    return diffs.length === 1 ? diffs[0] : ''
  }, [selectedQuestions])

  const allowedDifficulties = useMemo(() => {
    if (selectedQuestions.length === 0) return ['']
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    if (diffs.length === 1 && diffs[0] !== '') return [diffs[0], '']
    if (diffs.length === 1 && diffs[0] === '') return ['', 'high', 'medium', 'low']
    return ['']
  }, [selectedQuestions])

  const effectiveNewDifficulty = newBankDifficulty !== null ? newBankDifficulty : autoDifficulty

  const handleTargetBankChange = (id) => {
    setTargetBankId(id)
    if (id) {
      const tb = banks.find(b => b.id === id)
      if (tb?.difficulty) {
        setSelectedQuestionIds(prev => {
          const next = prev.filter(qId => {
            const q = sourceQuestions.find(x => x.id === qId)
            return q?.difficulty === tb.difficulty
          })
          const removed = prev.length - next.length
          if (removed > 0) {
            setInlineToast(`난이도 불일치로 ${removed}개 문항이 제외되었습니다`)
            setTimeout(() => setInlineToast(null), 3000)
          }
          return next
        })
      }
    }
  }

  const handleSourceToggle = (bankId) => {
    const isChecked = selectedSourceIds.includes(bankId)
    setSelectedSourceIds(prev => isChecked ? prev.filter(id => id !== bankId) : [...prev, bankId])
    if (isChecked) {
      const bankQIds = getBankQuestions(bankId).map(q => q.id)
      setSelectedQuestionIds(prev => prev.filter(id => !bankQIds.includes(id)))
    }
    if (!isChecked && bankId === targetBankId) setTargetBankId(null)
  }

  const canSubmit = selectedQuestions.length > 0 &&
    (targetMode === 'new' ? newBankName.trim() !== '' : targetBankId !== null)

  const availableCourses = useMemo(() =>
    MOCK_COURSES.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courseSearch]
  )

  const courseGroups = useMemo(() => {
    const groups = {}
    banks.forEach(b => {
      const course = b.course || CURRENT_COURSE
      if (!groups[course]) groups[course] = []
      groups[course].push(b)
    })
    return groups
  }, [banks])

  const goToStep2 = () => {
    if (targetBank?.difficulty) {
      const diff = targetBank.difficulty
      setSelectedQuestionIds(prev => {
        const next = prev.filter(id => {
          const q = sourceQuestions.find(x => x.id === id)
          return q?.difficulty === diff
        })
        const removed = prev.length - next.length
        if (removed > 0) {
          setInlineToast(`난이도 불일치로 ${removed}개 문항이 제외되었습니다`)
          setTimeout(() => setInlineToast(null), 3000)
        }
        return next
      })
    }
    setStep(2)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl min-h-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle>내보내기</DialogTitle>
            </DialogHeader>
            {/* step indicator is shown in WizardSteps below */}
          </div>
          <WizardSteps step={step} labels={['문항 선택', '검토 및 설정']} />
        </div>

        {step === 1 ? (
          <WizardStep1
            courseSearch={courseSearch}
            setCourseSearch={setCourseSearch}
            availableCourses={availableCourses}
            courseGroups={courseGroups}
            selectedSourceIds={selectedSourceIds}
            handleSourceToggle={handleSourceToggle}
            filterType={filterType}
            setFilterType={setFilterType}
            filterDifficulty={filterDifficulty}
            setFilterDifficulty={setFilterDifficulty}
            filtered={filtered}
            selectedQuestionIds={selectedQuestionIds}
            allFilteredSelected={allFilteredSelected}
            someFilteredSelected={someFilteredSelected}
            toggle={toggle}
            toggleAll={toggleAll}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* 선택한 문항 검토 */}
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-foreground">선택한 문항</h3>
                <span className="text-xs text-muted-foreground">{selectedQuestions.length}개</span>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {selectedQuestions.map((q, i) => (
                  <ReviewRow key={q.id} q={q} index={i} onRemove={id => setSelectedQuestionIds(prev => prev.filter(x => x !== id))} />
                ))}
                {selectedQuestions.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">모든 문항이 제거되었습니다. 이전 단계로 돌아가 문항을 선택하세요.</p>
                )}
              </div>
            </div>

            {/* 내보낼 위치 설정 */}
            <div className="px-6 py-5">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">내보낼 위치</h3>
              <p className="text-xs text-muted-foreground mb-4">내보낼 과목과 문제은행을 선택하세요</p>

              <div className="mb-4">
                <label className="text-xs font-medium text-secondary-foreground block mb-1.5">대상 과목</label>
                <DropdownSelect
                  value={targetCourse}
                  onChange={(course) => { setTargetCourse(course); setTargetBankId(null) }}
                  options={MOCK_COURSES.map(c => ({ value: c.name, label: c.name }))}
                />
              </div>

              <div className="space-y-3">
                {/* 새 문제은행 만들기 - Option B: 테두리 통합 카드 */}
                <div
                  onClick={() => { setTargetMode('new'); setTargetBankId(null) }}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'new' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'new' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>새 문제은행 만들기</p>
                    <p className="text-xs text-muted-foreground mt-0.5">선택한 과목에 새 문제은행을 생성합니다</p>
                  </div>
                  {targetMode === 'new' && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-primary/15">
                      <input
                        type="text"
                        value={newBankName}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setNewBankName(e.target.value)}
                        placeholder="문제은행 이름"
                        autoFocus
                        className="w-full max-w-xs text-[15px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground bg-white"
                      />
                      {selectedQuestions.length > 0 && (
                        <div onClick={e => e.stopPropagation()}>
                          <WizardDifficultySelector
                            value={effectiveNewDifficulty}
                            allowedDifficulties={allowedDifficulties}
                            onChange={setNewBankDifficulty}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 기존 문제은행에 추가 - Option B: 테두리 통합 카드 */}
                <div
                  onClick={() => setTargetMode('existing')}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'existing' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'existing' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>기존 문제은행에 추가</p>
                    <p className="text-xs text-muted-foreground mt-0.5">이미 있는 문제은행에 문항을 추가합니다</p>
                  </div>
                  {targetMode === 'existing' && (
                    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-primary/15" onClick={e => e.stopPropagation()}>
                      {courseBanks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">선택한 과목에 사용 가능한 문제은행이 없습니다</p>
                      ) : (
                        courseBanks.map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleTargetBankChange(b.id)}
                            className={cn(
                              'w-full max-w-xs text-left px-3 py-2 rounded-lg border transition-colors text-xs flex items-center gap-2',
                              b.id === targetBankId ? 'border-primary bg-accent font-semibold text-primary' : 'border-border text-secondary-foreground hover:border-primary/40 bg-white'
                            )}
                          >
                            <DiffBadge difficulty={b.difficulty} />
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {inlineToast && (
          <div className="px-5 py-2 shrink-0 text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-t border-amber-200">
            {inlineToast}
          </div>
        )}

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
          {step === 1 ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
              <div className="flex items-center gap-3">
                {selectedQuestionIds.length > 0 && (
                  <span className="text-xs bg-accent text-primary px-2.5 py-1 rounded-full font-medium">{selectedQuestionIds.length}개 선택됨</span>
                )}
                <Button
                  disabled={selectedQuestionIds.length === 0}
                  onClick={goToStep2}
                >
                  다음
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>이전</Button>
              <Button
                disabled={!canSubmit}
                onClick={() => onExport(selectedQuestions, targetCourse, targetMode === 'existing' ? targetBankId : null, targetMode === 'new' ? newBankName.trim() : null, effectiveNewDifficulty)}
              >
                {selectedQuestions.length}개 내보내기
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 가져오기 모달 (2-step wizard)
// ═══════════════════════════════════════════════════════════════════════════════

function ImportModal({ onClose, onImport }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [step, setStep] = useState(1)

  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [targetMode, setTargetMode] = useState('new')
  const [targetBankId, setTargetBankId] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [manualDifficulty, setManualDifficulty] = useState(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [inlineToast, setInlineToast] = useState(null)

  const sourceQuestions = useMemo(() => {
    return selectedSourceIds.flatMap(bankId => {
      const bankName = banks.find(b => b.id === bankId)?.name || ''
      return getBankQuestions(bankId).map(q => ({ ...q, _sourceBankName: bankName }))
    })
  }, [selectedSourceIds, banks, getBankQuestions])

  const filtered = useMemo(() => sourceQuestions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  }), [sourceQuestions, filterType, filterDifficulty])

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selectedQuestionIds.includes(q.id))
  const someFilteredSelected = filtered.some(q => selectedQuestionIds.includes(q.id)) && !allFilteredSelected

  const toggle = (q) => {
    setSelectedQuestionIds(prev =>
      prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id]
    )
  }

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !filtered.find(q => q.id === id)))
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...filtered.map(q => q.id)])])
    }
  }

  const selectedQuestions = useMemo(() =>
    selectedQuestionIds.map(id => sourceQuestions.find(q => q.id === id)).filter(Boolean),
    [selectedQuestionIds, sourceQuestions]
  )

  const autoDifficulty = useMemo(() => {
    if (selectedQuestions.length === 0) return ''
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    return diffs.length === 1 ? diffs[0] : ''
  }, [selectedQuestions])

  const allowedDifficulties = useMemo(() => {
    if (selectedQuestions.length === 0) return ['']
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    if (diffs.length === 1 && diffs[0] !== '') return [diffs[0], '']
    if (diffs.length === 1 && diffs[0] === '') return ['', 'high', 'medium', 'low']
    return ['']
  }, [selectedQuestions])

  const effectiveDifficulty = manualDifficulty !== null ? manualDifficulty : autoDifficulty

  const existingTargetBanks = banks.filter(b => b.course === CURRENT_COURSE && !selectedSourceIds.includes(b.id))
  const targetBank = targetMode === 'existing' && targetBankId ? banks.find(b => b.id === targetBankId) : null

  const handleSourceToggle = (bankId) => {
    const isChecked = selectedSourceIds.includes(bankId)
    setSelectedSourceIds(prev => isChecked ? prev.filter(id => id !== bankId) : [...prev, bankId])
    if (isChecked) {
      const bankQIds = getBankQuestions(bankId).map(q => q.id)
      setSelectedQuestionIds(prev => prev.filter(id => !bankQIds.includes(id)))
    }
    if (!isChecked && bankId === targetBankId) setTargetBankId(null)
  }

  const handleTargetBankChange = (id) => {
    setTargetBankId(id)
    const tb = banks.find(b => b.id === id)
    if (tb?.difficulty) {
      setSelectedQuestionIds(prev => {
        const next = prev.filter(qId => {
          const q = sourceQuestions.find(x => x.id === qId)
          return q?.difficulty === tb.difficulty
        })
        const removed = prev.length - next.length
        if (removed > 0) {
          setInlineToast(`난이도 불일치로 ${removed}개 문항이 제외되었습니다`)
          setTimeout(() => setInlineToast(null), 3000)
        }
        return next
      })
    }
  }

  const availableCourses = useMemo(() =>
    MOCK_COURSES.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courseSearch]
  )

  const courseGroups = useMemo(() => {
    const groups = {}
    banks.forEach(b => {
      const course = b.course || CURRENT_COURSE
      if (!groups[course]) groups[course] = []
      groups[course].push(b)
    })
    return groups
  }, [banks])

  const canSubmit = selectedQuestions.length > 0 &&
    (targetMode === 'new' ? newBankName.trim() !== '' : targetBankId !== null)

  const prevSourceLen = useRef(0)
  useEffect(() => {
    if (selectedSourceIds.length === 1 && prevSourceLen.current === 0 && !newBankName) {
      const srcBank = banks.find(b => b.id === selectedSourceIds[0])
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-populate copy name once
      if (srcBank) setNewBankName(`${srcBank.name}-사본`)
    }
    prevSourceLen.current = selectedSourceIds.length
  }, [selectedSourceIds, banks, newBankName])

  const goToStep2 = () => {
    if (targetBank?.difficulty) {
      const diff = targetBank.difficulty
      setSelectedQuestionIds(prev => {
        const next = prev.filter(id => {
          const q = sourceQuestions.find(x => x.id === id)
          return q?.difficulty === diff
        })
        const removed = prev.length - next.length
        if (removed > 0) {
          setInlineToast(`난이도 불일치로 ${removed}개 문항이 제외되었습니다`)
          setTimeout(() => setInlineToast(null), 3000)
        }
        return next
      })
    }
    setStep(2)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl min-h-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle>가져오기</DialogTitle>
            </DialogHeader>
            {/* step indicator is shown in WizardSteps below */}
          </div>
          <WizardSteps step={step} labels={['문항 선택', '검토 및 설정']} />
        </div>

        {step === 1 ? (
          <WizardStep1
            courseSearch={courseSearch}
            setCourseSearch={setCourseSearch}
            availableCourses={availableCourses}
            courseGroups={courseGroups}
            selectedSourceIds={selectedSourceIds}
            handleSourceToggle={handleSourceToggle}
            filterType={filterType}
            setFilterType={setFilterType}
            filterDifficulty={filterDifficulty}
            setFilterDifficulty={setFilterDifficulty}
            filtered={filtered}
            selectedQuestionIds={selectedQuestionIds}
            allFilteredSelected={allFilteredSelected}
            someFilteredSelected={someFilteredSelected}
            toggle={toggle}
            toggleAll={toggleAll}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* 선택한 문항 검토 */}
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-foreground">선택한 문항</h3>
                <span className="text-xs text-muted-foreground">{selectedQuestions.length}개</span>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {selectedQuestions.map((q, i) => (
                  <ReviewRow key={q.id} q={q} index={i} onRemove={id => setSelectedQuestionIds(prev => prev.filter(x => x !== id))} />
                ))}
                {selectedQuestions.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">모든 문항이 제거되었습니다. 이전 단계로 돌아가 문항을 선택하세요.</p>
                )}
              </div>
            </div>

            {/* 가져올 위치 설정 */}
            <div className="px-6 py-5">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">가져올 위치</h3>
              <p className="text-xs text-muted-foreground mb-4">가져올 문제은행을 선택하세요</p>

              <div className="space-y-3">
                {/* 새 문제은행 만들기 - Option B: 테두리 통합 카드 */}
                <div
                  onClick={() => setTargetMode('new')}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'new' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'new' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>새 문제은행 만들기</p>
                    <p className="text-xs text-muted-foreground mt-0.5">새로운 문제은행을 생성하여 문항을 추가합니다</p>
                  </div>
                  {targetMode === 'new' && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-primary/15">
                      <input
                        type="text"
                        value={newBankName}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setNewBankName(e.target.value)}
                        placeholder="문제은행 이름"
                        autoFocus
                        className="w-full max-w-xs text-[15px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground bg-white"
                      />
                      {selectedQuestions.length > 0 && (
                        <div onClick={e => e.stopPropagation()}>
                          <WizardDifficultySelector
                            value={effectiveDifficulty}
                            allowedDifficulties={allowedDifficulties}
                            onChange={setManualDifficulty}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 기존 문제은행에 추가 - Option B: 테두리 통합 카드 */}
                <div
                  onClick={() => setTargetMode('existing')}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'existing' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'existing' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>기존 문제은행에 추가</p>
                    <p className="text-xs text-muted-foreground mt-0.5">이미 있는 문제은행에 문항을 추가합니다</p>
                  </div>
                  {targetMode === 'existing' && (
                    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-primary/15" onClick={e => e.stopPropagation()}>
                      {existingTargetBanks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">선택 가능한 문제은행이 없습니다</p>
                      ) : (
                        existingTargetBanks.map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleTargetBankChange(b.id)}
                            className={cn(
                              'w-full max-w-xs text-left px-3 py-2 rounded-lg border transition-colors text-xs flex items-center gap-2',
                              b.id === targetBankId ? 'border-primary bg-accent font-semibold text-primary' : 'border-border text-secondary-foreground hover:border-primary/40 bg-white'
                            )}
                          >
                            <DiffBadge difficulty={b.difficulty} />
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {inlineToast && (
          <div className="px-5 py-2 shrink-0 text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-t border-amber-200">
            {inlineToast}
          </div>
        )}

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
          {step === 1 ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
              <div className="flex items-center gap-3">
                {selectedQuestionIds.length > 0 && (
                  <span className="text-xs bg-accent text-primary px-2.5 py-1 rounded-full font-medium">{selectedQuestionIds.length}개 선택됨</span>
                )}
                <Button
                  disabled={selectedQuestionIds.length === 0}
                  onClick={goToStep2}
                >
                  다음
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>이전</Button>
              <Button
                disabled={!canSubmit}
                onClick={() => onImport(selectedQuestions, targetMode === 'new' ? newBankName.trim() : null, effectiveDifficulty, targetMode === 'existing' ? targetBankId : null)}
              >
                {selectedQuestions.length}개 가져오기
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
