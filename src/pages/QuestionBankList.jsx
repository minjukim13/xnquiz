import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, FolderInput, FolderOutput, Search, X, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/QuestionBankContext'
import { QUIZ_TYPES, MOCK_COURSES } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const CURRENT_COURSE = 'CS301 데이터베이스'

const DIFFICULTY_META = {
  high:   { label: '상', cls: 'text-red-600 bg-red-50',     textCls: 'text-red-600' },
  medium: { label: '중', cls: 'text-amber-600 bg-amber-50', textCls: 'text-amber-600' },
  low:    { label: '하', cls: 'text-green-600 bg-green-50', textCls: 'text-green-600' },
}

const DIFF_LABEL = { '': '미지정', high: '상', medium: '중', low: '하' }

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { banks, questions, addBank, deleteBank, getBankQuestions, addQuestions } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [copyTarget, setCopyTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, bankId) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

  const executeCopyBank = (bank) => {
    const newId = `bank_copy_${Date.now()}`
    const newName = `${bank.name}-사본`
    addBank({
      id: newId,
      name: newName,
      difficulty: bank.difficulty,
      course: bank.course,
      updatedAt: new Date().toISOString().split('T')[0],
      usedInQuizIds: [],
    })
    const bankQs = getBankQuestions(bank.id)
    addQuestions(bankQs.map(q => ({
      ...q,
      id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bankId: newId,
    })))
    showToast(`"${newName}" 문제은행이 생성되었습니다`, newId)
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4 gap-4">
          <h1 className="text-2xl font-bold text-slate-900">문제은행</h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
            >
              <FolderInput size={14} />
              가져오기
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
            >
              <FolderOutput size={14} />
              내보내기
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              <Plus size={15} />
              새 문제은행
            </button>
          </div>
        </div>

        {/* 은행 카드 그리드 */}
        <p className="text-sm mb-3 text-slate-400">
          은행 <span className="font-semibold text-slate-700">{banks.length}</span>개
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const qCount = getQuestionCount(bank.id)
            const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
            return (
              <div
                key={bank.id}
                onClick={() => navigate(`/question-banks/${bank.id}`)}
                className="bg-white p-5 cursor-pointer transition-all border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    'w-9 h-9 rounded flex items-center justify-center text-xs font-bold',
                    bank.difficulty && DIFFICULTY_META[bank.difficulty]
                      ? DIFFICULTY_META[bank.difficulty].cls
                      : 'bg-slate-100 text-slate-400'
                  )}>
                    {diffLabel || '미지정'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setCopyTarget(bank) }}
                      className="p-1.5 rounded text-slate-300 hover:text-[#3182F6] hover:bg-[#E8F3FF] transition-colors"
                      title="복사본 만들기"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(bank) }}
                      className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-base mb-1 text-slate-900">{bank.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{qCount}개 문항</span>
                </div>
                <p className="text-xs mt-2 text-slate-300">최종 수정 {bank.updatedAt}</p>
              </div>
            )
          })}

          {/* 추가 카드 */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px] border-2 border-dashed border-slate-200 rounded-lg text-slate-300 hover:border-blue-400 hover:text-[#3182F6]"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">새 문제은행 추가</span>
          </button>
        </div>

        {/* 빈 상태 */}
        {banks.length === 0 && (
          <div className="mt-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium mb-1 text-slate-400">문제은행이 없습니다</p>
            <p className="text-xs mb-4 text-slate-300">새 문제은행을 만들어 문항을 관리하세요</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm font-medium px-4 py-2 bg-[#3182F6] text-white rounded transition-colors hover:bg-[#1B64DA]"
            >
              첫 문제은행 만들기
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddBankModal
          onClose={() => setShowAddModal(false)}
          onAdd={(name, difficulty) => {
            addBank({
              id: `bank_custom_${Date.now()}`,
              name,
              difficulty,
              course: CURRENT_COURSE,
              updatedAt: new Date().toISOString().split('T')[0],
              usedInQuizIds: [],
            })
            setShowAddModal(false)
          }}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={open => !open && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>문제은행 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{deleteTarget.name}</span>을(를) 삭제할까요?
            </p>
            <p className="text-xs text-slate-400">
              은행에 포함된 문항 {getQuestionCount(deleteTarget.id)}개가 함께 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { deleteBank(deleteTarget.id); setDeleteTarget(null) }}
              >
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {copyTarget && (
        <Dialog open onOpenChange={open => !open && setCopyTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>문제은행 복사</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{copyTarget.name}</span>의 복사본을 생성할까요?
            </p>
            <p className="text-xs text-slate-400">
              문항 {getQuestionCount(copyTarget.id)}개가 포함된 "{copyTarget.name}-사본" 문제은행이 생성됩니다.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setCopyTarget(null)}>취소</Button>
              <Button
                size="sm"
                className="bg-[#3182F6] hover:bg-[#1B64DA] text-white"
                onClick={() => { executeCopyBank(copyTarget); setCopyTarget(null) }}
              >
                복사
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showCopyModal && (
        <ImportModal
          onClose={() => setShowCopyModal(false)}
          onImport={(selectedQs, bankName, difficulty, existingBankId) => {
            let bankId, toastName
            if (existingBankId) {
              bankId = existingBankId
              toastName = banks.find(b => b.id === existingBankId)?.name || '문제은행'
            } else {
              bankId = `bank_import_${Date.now()}`
              toastName = bankName
              addBank({
                id: bankId,
                name: bankName,
                difficulty: difficulty || '',
                course: CURRENT_COURSE,
                updatedAt: new Date().toISOString().split('T')[0],
                usedInQuizIds: [],
              })
            }
            addQuestions(selectedQs.map(q => ({
              ...q,
              _sourceBankName: undefined,
              id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bankId,
            })))
            setShowCopyModal(false)
            showToast(`"${toastName}" 문제은행에 ${selectedQs.length}개 문항 가져오기 완료`, bankId)
          }}
        />
      )}

      {showExportModal && (
        <ExportToBankModal
          onClose={() => setShowExportModal(false)}
          onExport={(questions, targetCourse, targetBankId, newBankName, difficulty) => {
            let bankId = targetBankId
            let bankName = newBankName
            if (targetBankId === '__new__') {
              bankId = `bank_export_${Date.now()}`
              addBank({
                id: bankId,
                name: bankName,
                difficulty: difficulty || '',
                course: targetCourse,
                updatedAt: new Date().toISOString().split('T')[0],
                usedInQuizIds: [],
              })
            } else {
              bankName = banks.find(b => b.id === bankId)?.name || bankName
            }
            addQuestions(questions.map(q => ({
              ...q,
              _sourceBankName: undefined,
              id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bankId,
            })))
            setShowExportModal(false)
            showToast(`"${bankName}" 문제은행에 ${questions.length}개 문항을 내보냈습니다`, bankId)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 text-sm text-white bg-slate-900 rounded-lg shadow-xl">
          <CheckCircle2 size={15} className="shrink-0 text-blue-300" />
          <span className="font-medium">{toast.msg}</span>
          {toast.bankId && (
            <button
              onClick={() => { navigate(`/question-banks/${toast.bankId}`); setToast(null) }}
              className="shrink-0 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
            >
              바로가기 →
            </button>
          )}
        </div>
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 문제은행 만들기</DialogTitle>
        </DialogHeader>
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1 text-slate-500">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim(), difficulty)}
            placeholder="문제은행 이름 (예: 기말고사 문제은행)"
            autoFocus
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
          />
        </div>
        <div className="mb-5">
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
                    ? 'border-blue-400 bg-[#E8F3FF] text-[#1B64DA]'
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
            <p className="text-xs mt-1.5 text-slate-400">
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
            className="bg-[#3182F6] hover:bg-[#1B64DA] text-white"
          >
            만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 난이도 뱃지 (모달 내 공통) ──────────────────────────────────────────────
function DiffBadge({ difficulty, className }) {
  const meta = difficulty && DIFFICULTY_META[difficulty]
  return (
    <span className={cn('text-xs px-1.5 py-0.5 font-medium rounded', meta ? meta.cls : 'text-slate-400 bg-slate-100', className)}>
      {meta ? meta.label : '미지정'}
    </span>
  )
}

// ── 문항 행 (모달 내 체크리스트용) ────────────────────────────────────────
function QuestionRow({ q, selected, selectable, onToggle }) {
  return (
    <div
      onClick={() => selectable && onToggle(q)}
      className={cn(
        'flex items-start gap-2.5 p-2.5 rounded-md border transition-all',
        selected ? 'border-blue-300 bg-[#E8F3FF]' : selectable ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50',
        selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
      )}
    >
      <input type="checkbox" checked={selected} readOnly disabled={!selectable} className="mt-0.5 shrink-0 accent-[#3182F6]" />
      <DiffBadge difficulty={q.difficulty} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 font-medium rounded bg-slate-100 text-slate-500">
            {QUIZ_TYPES[q.type]?.label}
          </span>
          <span className="text-xs text-slate-400">{q.points}점</span>
          {q._sourceBankName && (
            <span className="text-xs text-slate-300">{q._sourceBankName}</span>
          )}
        </div>
        <p className="text-xs leading-relaxed line-clamp-2 text-slate-700">{q.text}</p>
      </div>
    </div>
  )
}

// ── 선택된 문항 드래그 행 ─────────────────────────────────────────────────
function DragRow({ q, index, dragOverIndex, onDragStart, onDragOver, onDragLeave, onDrop, onRemove }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(index)}
      className={cn(
        'flex items-start gap-1.5 p-2 bg-slate-50 rounded-md cursor-grab border-t-2 border-transparent',
        dragOverIndex === index && 'border-[#3182F6]'
      )}
    >
      <GripVertical size={13} className="shrink-0 mt-0.5 text-slate-300" />
      <DiffBadge difficulty={q.difficulty} className="shrink-0 text-[10px]" />
      <p className="flex-1 text-xs leading-relaxed line-clamp-2 text-slate-700">{q.text}</p>
      <button
        onClick={() => onRemove(q.id)}
        className="shrink-0 mt-0.5 text-slate-300 hover:text-red-500 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── 난이도 선택 버튼 그룹 (모달 내 공통) ─────────────────────────────────
function DifficultySelector({ value, allowedDifficulties, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs shrink-0 text-slate-400">난이도</span>
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
              'flex-1 text-xs py-1 whitespace-nowrap rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
              isActive
                ? 'border-blue-400 bg-[#E8F3FF] text-[#1B64DA] font-semibold'
                : cn(
                    'border-slate-200',
                    d === 'high' ? 'text-red-600'
                      : d === 'medium' ? 'text-amber-600'
                      : d === 'low' ? 'text-green-600'
                      : 'text-slate-500'
                  )
            )}
          >
            {DIFF_LABEL[d]}
          </button>
        )
      })}
    </div>
  )
}

// ── 소스 은행 선택 목록 (모달 내 공통) ────────────────────────────────────
function SourceBankList({ availableCourses, courseGroups, selectedSourceIds, onToggle }) {
  return (
    <>
      {availableCourses.map(c => {
        const list = (courseGroups[c.name] || [])
        if (list.length === 0) return null
        return (
          <div key={c.id}>
            <p className="px-3 py-1 text-xs font-medium truncate text-slate-400 bg-slate-50">{c.name}</p>
            {list.map(b => {
              const isChecked = selectedSourceIds.includes(b.id)
              return (
                <label
                  key={b.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors',
                    isChecked ? 'bg-[#E8F3FF] text-[#1B64DA]' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(b.id)}
                    className="accent-[#3182F6] shrink-0"
                  />
                  <span className="truncate flex-1">{b.name}</span>
                  {b.difficulty && (
                    <span className={cn('shrink-0 text-xs', DIFFICULTY_META[b.difficulty]?.textCls)}>
                      {DIFF_LABEL[b.difficulty]}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

// ── 대상 은행 버튼 (모달 내 공통) ─────────────────────────────────────────
function TargetBankBtn({ bank, isSelected, onClick }) {
  const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1.5 text-xs rounded border transition-colors',
        isSelected ? 'border-blue-300 bg-[#E8F3FF] text-[#1B64DA] font-semibold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{bank.name}</span>
        {diffLabel && <span className={cn('shrink-0 font-normal', DIFFICULTY_META[bank.difficulty]?.textCls)}>{diffLabel}</span>}
      </div>
    </button>
  )
}

// ── 문항 체크리스트 열 (모달 내 공통) ────────────────────────────────────
function QuestionChecklist({ selectedSourceIds, filtered, selectedQuestionIds, allFilteredSelected, someFilteredSelected, targetDifficulty, isSelectableForTarget, toggle, toggleAll }) {
  if (selectedSourceIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <p className="text-sm text-center text-slate-400">좌측에서 소스 문제은행을 선택하세요</p>
      </div>
    )
  }
  return (
    <>
      {targetDifficulty && (
        <div className="px-3 py-1.5 shrink-0 text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-b border-amber-200">
          <AlertCircle size={12} className="shrink-0" />
          난이도 '{DIFF_LABEL[targetDifficulty]}' 문제은행 — 해당 난이도 문항만 선택 가능
        </div>
      )}
      {filtered.length > 0 && (
        <div className="px-3 py-1.5 flex items-center justify-between shrink-0 border-b border-slate-50">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              ref={el => { if (el) el.indeterminate = someFilteredSelected }}
              onChange={toggleAll}
              className="accent-[#3182F6]"
            />
            <span className="text-xs font-medium text-slate-500">
              {allFilteredSelected ? '전체 해제' : '전체선택'}
            </span>
          </label>
          <span className={cn('text-xs', selectedQuestionIds.length > 0 ? 'text-[#3182F6]' : 'text-slate-400')}>
            {selectedQuestionIds.length > 0 ? `${selectedQuestionIds.length}개 선택` : `총 ${filtered.length}개`}
          </span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">해당하는 문항이 없습니다</p>
        ) : (
          filtered.map(q => (
            <QuestionRow
              key={q.id}
              q={q}
              selected={selectedQuestionIds.includes(q.id)}
              selectable={isSelectableForTarget(q)}
              onToggle={toggle}
            />
          ))
        )}
      </div>
    </>
  )
}

// ── 내보내기 모달 ─────────────────────────────────────────────────────────────
function ExportToBankModal({ onClose, onExport }) {
  const { banks, getBankQuestions } = useQuestionBank()

  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [targetCourse, setTargetCourse] = useState(CURRENT_COURSE)
  const [targetBankId, setTargetBankId] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [newBankDifficulty, setNewBankDifficulty] = useState(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const targetBank = targetBankId && targetBankId !== '__new__' ? banks.find(b => b.id === targetBankId) : null
  const targetDifficulty = targetBank?.difficulty || ''
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

  const isSelectable = (q) => !targetDifficulty || q.difficulty === targetDifficulty
  const selectableFiltered = filtered.filter(isSelectable)
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(q => selectedQuestionIds.includes(q.id))
  const someFilteredSelected = selectableFiltered.some(q => selectedQuestionIds.includes(q.id)) && !allFilteredSelected

  const toggle = (q) => {
    if (!isSelectable(q)) return
    setSelectedQuestionIds(prev =>
      prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id]
    )
  }

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !selectableFiltered.find(q => q.id === id)))
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...selectableFiltered.map(q => q.id)])])
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

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    setDragOverIndex(null)
    if (from === null || from === index) return
    setSelectedQuestionIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = null
  }

  const handleTargetBankChange = (id) => {
    setTargetBankId(id)
    if (id && id !== '__new__') {
      const tb = banks.find(b => b.id === id)
      if (tb?.difficulty) {
        setSelectedQuestionIds(prev => prev.filter(qId => {
          const q = sourceQuestions.find(x => x.id === qId)
          return q?.difficulty === tb.difficulty
        }))
      }
    }
  }

  const handleTargetCourseChange = (course) => {
    setTargetCourse(course)
    setTargetBankId(null)
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
    (targetBankId === '__new__' ? newBankName.trim() !== '' : targetBankId !== null)

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

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-slate-100 shrink-0">
          <DialogTitle>문제은행 내보내기</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* 1열: 소스 + 대상 */}
          <div className="flex flex-col shrink-0 w-[200px] border-r border-slate-100">
            {/* 소스 */}
            <div className="flex flex-col border-b border-slate-100 overflow-hidden" style={{ flex: '0 0 50%' }}>
              <div className="px-3 pt-2.5 pb-1.5 shrink-0">
                <p className="text-xs font-semibold mb-1.5 text-slate-400">소스 문제은행</p>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="과목/은행 검색"
                    className="w-full text-xs pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SourceBankList
                  availableCourses={availableCourses}
                  courseGroups={courseGroups}
                  selectedSourceIds={selectedSourceIds}
                  onToggle={handleSourceToggle}
                />
              </div>
            </div>

            {/* 대상 */}
            <div className="flex flex-col overflow-hidden" style={{ flex: '0 0 50%' }}>
              <p className="px-3 pt-2.5 pb-1 text-xs font-semibold shrink-0 text-slate-400">대상 문제은행</p>
              <div className="px-2 pb-1 shrink-0">
                <select
                  value={targetCourse}
                  onChange={e => handleTargetCourseChange(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none text-slate-700 bg-white"
                >
                  {MOCK_COURSES.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="px-2 pb-1 shrink-0 space-y-1">
                <button
                  type="button"
                  onClick={() => setTargetBankId('__new__')}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs font-semibold rounded border flex items-center gap-1 transition-colors',
                    targetBankId === '__new__'
                      ? 'border-blue-300 bg-[#E8F3FF] text-[#1B64DA]'
                      : 'border-slate-200 text-[#3182F6] hover:bg-slate-50'
                  )}
                >
                  <Plus size={11} />새 문제은행
                </button>
                {targetBankId === '__new__' && (
                  <>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={e => setNewBankName(e.target.value)}
                      placeholder="이름 입력"
                      autoFocus
                      className={cn(
                        'w-full text-xs px-2 py-1.5 border rounded focus:outline-none text-slate-900',
                        newBankName.trim() ? 'border-blue-300' : 'border-slate-200'
                      )}
                    />
                    {selectedQuestions.length > 0 && (
                      <DifficultySelector
                        value={effectiveNewDifficulty}
                        allowedDifficulties={allowedDifficulties}
                        onChange={setNewBankDifficulty}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {courseBanks.map(b => (
                  <TargetBankBtn
                    key={b.id}
                    bank={b}
                    isSelected={b.id === targetBankId}
                    onClick={() => handleTargetBankChange(b.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2열: 문항 체크리스트 */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-slate-100">
            <div className="px-3 pt-2.5 pb-2 shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
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
            <QuestionChecklist
              selectedSourceIds={selectedSourceIds}
              filtered={filtered}
              selectedQuestionIds={selectedQuestionIds}
              allFilteredSelected={allFilteredSelected}
              someFilteredSelected={someFilteredSelected}
              targetDifficulty={targetDifficulty}
              isSelectableForTarget={isSelectable}
              toggle={toggle}
              toggleAll={toggleAll}
            />
          </div>

          {/* 3열: 선택된 문항 */}
          <div className="flex flex-col shrink-0 w-[220px]">
            <div className="px-3 py-2.5 shrink-0 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500">
                선택된 문항
                <span className="ml-1.5 font-normal text-slate-400">{selectedQuestions.length}개</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedQuestions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-300">선택된 문항이 없습니다</p>
              ) : (
                selectedQuestions.map((q, index) => (
                  <DragRow
                    key={q.id}
                    q={q}
                    index={index}
                    dragOverIndex={dragOverIndex}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onRemove={id => setSelectedQuestionIds(prev => prev.filter(x => x !== id))}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 shrink-0 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => onExport(selectedQuestions, targetCourse, targetBankId, newBankName.trim(), effectiveNewDifficulty)}
            className="bg-[#3182F6] hover:bg-[#1B64DA] text-white"
          >
            {selectedQuestions.length}개 내보내기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 가져오기 모달 ──────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const { banks, getBankQuestions } = useQuestionBank()

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
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

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
  const targetDifficulty = targetBank?.difficulty || ''

  const isSelectableForTarget = (q) => !targetDifficulty || q.difficulty === targetDifficulty

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

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    setDragOverIndex(null)
    if (from === null || from === index) return
    setSelectedQuestionIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = null
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
  if (selectedSourceIds.length === 1 && prevSourceLen.current === 0 && !newBankName) {
    const srcBank = banks.find(b => b.id === selectedSourceIds[0])
    if (srcBank) setTimeout(() => setNewBankName(`${srcBank.name}-사본`), 0)
  }
  prevSourceLen.current = selectedSourceIds.length

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden" style={{ minHeight: 500 }}>
        <DialogHeader className="px-4 py-3 border-b border-slate-100 shrink-0">
          <DialogTitle>가져오기</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* 1열: 소스 은행 + 대상 설정 */}
          <div className="flex flex-col shrink-0 w-[200px] border-r border-slate-100">
            <div className="px-3 pt-2.5 pb-1.5 shrink-0">
              <p className="text-xs font-semibold mb-1.5 text-slate-400">소스 문제은행</p>
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="과목/은행 검색"
                  className="w-full text-xs pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SourceBankList
                availableCourses={availableCourses}
                courseGroups={courseGroups}
                selectedSourceIds={selectedSourceIds}
                onToggle={handleSourceToggle}
              />
            </div>
            <div className="shrink-0 border-t border-slate-100">
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setTargetMode('new')}
                  className={cn(
                    'flex-1 text-xs py-1.5 font-medium transition-colors border-b-2',
                    targetMode === 'new' ? 'border-[#3182F6] text-[#1B64DA]' : 'border-transparent text-slate-400'
                  )}
                >
                  새 은행
                </button>
                <button
                  onClick={() => setTargetMode('existing')}
                  className={cn(
                    'flex-1 text-xs py-1.5 font-medium transition-colors border-b-2',
                    targetMode === 'existing' ? 'border-[#3182F6] text-[#1B64DA]' : 'border-transparent text-slate-400'
                  )}
                >
                  기존 은행
                </button>
              </div>
              {targetMode === 'new' ? (
                <div className="p-2 space-y-1.5">
                  <input
                    type="text"
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                    placeholder="은행 이름"
                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none text-slate-900"
                  />
                  {selectedQuestions.length > 0 && (
                    <DifficultySelector
                      value={effectiveDifficulty}
                      allowedDifficulties={allowedDifficulties}
                      onChange={setManualDifficulty}
                    />
                  )}
                </div>
              ) : (
                <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 120 }}>
                  {existingTargetBanks.length === 0 ? (
                    <p className="text-xs py-2 text-center text-slate-300">선택 가능한 은행이 없습니다</p>
                  ) : (
                    existingTargetBanks.map(b => (
                      <TargetBankBtn
                        key={b.id}
                        bank={b}
                        isSelected={b.id === targetBankId}
                        onClick={() => handleTargetBankChange(b.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2열: 문항 체크리스트 */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-slate-100">
            <div className="px-3 pt-2.5 pb-2 shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
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
            <QuestionChecklist
              selectedSourceIds={selectedSourceIds}
              filtered={filtered}
              selectedQuestionIds={selectedQuestionIds}
              allFilteredSelected={allFilteredSelected}
              someFilteredSelected={someFilteredSelected}
              targetDifficulty={targetDifficulty}
              isSelectableForTarget={isSelectableForTarget}
              toggle={toggle}
              toggleAll={toggleAll}
            />
          </div>

          {/* 3열: 선택된 문항 */}
          <div className="flex flex-col shrink-0 w-[220px]">
            <div className="px-3 py-2.5 shrink-0 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500">
                선택된 문항
                <span className="ml-1.5 font-normal text-slate-400">{selectedQuestions.length}개</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedQuestions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-300">선택된 문항이 없습니다</p>
              ) : (
                selectedQuestions.map((q, index) => (
                  <DragRow
                    key={q.id}
                    q={q}
                    index={index}
                    dragOverIndex={dragOverIndex}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onRemove={id => setSelectedQuestionIds(prev => prev.filter(x => x !== id))}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {inlineToast && (
          <div className="px-4 py-2 shrink-0 text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-t border-amber-200">
            <AlertCircle size={12} className="shrink-0" />
            {inlineToast}
          </div>
        )}

        <div className="px-4 py-3 shrink-0 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => onImport(selectedQuestions, targetMode === 'new' ? newBankName.trim() : null, effectiveDifficulty, targetMode === 'existing' ? targetBankId : null)}
            className="bg-[#3182F6] hover:bg-[#1B64DA] text-white"
          >
            {selectedQuestions.length}개 가져오기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
