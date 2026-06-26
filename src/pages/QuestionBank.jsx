import { useState, useMemo } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Upload, Pencil } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { QUIZ_TYPES } from '../data/mockData'
import { useRole } from '../context/role'
import { DropdownSelect } from '../components/DropdownSelect'
import { useQuestionBank } from '../context/questionBank'
import AddQuestionModal from '../components/AddQuestionModal'
import InlineQuestionEditor from '../components/InlineQuestionEditor'
import BankUploadModal from '../components/BankUploadModal'
import MoveQuestionsModal from '../components/MoveQuestionsModal'
import TypeBadge from '../components/TypeBadge'
import PageHeader from '../components/PageHeader'
import { htmlToPlainText, RichTextRenderer } from '../components/RichText'
import QuestionAnswer from '../components/QuestionAnswer'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '../components/ConfirmDialog'

const DIFFICULTY_META = {
  high:   { label: '상', className: 'bg-red-50 text-red-600' },
  medium: { label: '중', className: 'bg-amber-50 text-amber-600' },
  low:    { label: '하', className: 'bg-green-50 text-green-600' },
}

const DIFF_TABS = [
  { value: 'all', label: '전체' },
  { value: 'high', label: DIFFICULTY_META.high.label },
  { value: 'medium', label: DIFFICULTY_META.medium.label },
  { value: 'low', label: DIFFICULTY_META.low.label },
]

export default function QuestionBank() {
  const { bankId } = useParams()
  const navigate = useNavigate()
  const { role } = useRole()
  const { banks, getBankQuestions, updateBank, addQuestions, updateQuestion, deleteQuestion, moveQuestions } = useQuestionBank()

  const bank = banks.find(b => b.id === bankId)
  const questions = useMemo(
    () => (bank ? getBankQuestions(bank.id) : []),
    [bank, getBankQuestions]
  )

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingBankName, setEditingBankName] = useState(false)
  const [bankNameDraft, setBankNameDraft] = useState('')
  const [toast, setToast] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [allExpanded, setAllExpanded] = useState(false)

  const filtered = useMemo(() => questions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchSearch && matchType && matchDiff
  }), [questions, search, filterType, filterDifficulty])

  // 난이도 탭 카운트 — 검색/유형 필터 적용 후 난이도별 개수
  const diffCounts = useMemo(() => {
    const base = questions.filter(q => {
      const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === 'all' || q.type === filterType
      return matchSearch && matchType
    })
    return {
      all: base.length,
      high: base.filter(q => q.difficulty === 'high').length,
      medium: base.filter(q => q.difficulty === 'medium').length,
      low: base.filter(q => q.difficulty === 'low').length,
    }
  }, [questions, search, filterType])

  const [deleteTargetId, setDeleteTargetId] = useState(null)

  if (role !== 'instructor' || !bank) return <Navigate to="/" replace />

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const allSelected = filtered.length > 0 && filtered.every(q => selectedIds.includes(q.id))
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map(q => q.id))
  const clearSelection = () => setSelectedIds([])

  const handleMove = async (targetBankId, keepOriginal) => {
    const movingCount = selectedIds.length
    const targetName = banks.find(b => b.id === targetBankId)?.name
    if (keepOriginal) {
      const copies = questions
        .filter(q => selectedIds.includes(q.id))
        .map((q, i) => {
          const { id: _id, usageCount: _u, ...rest } = q
          return { ...rest, id: `q_copy_${Date.now()}_${i}`, bankId: targetBankId, usageCount: 0 }
        })
      await addQuestions(copies)
    } else {
      await moveQuestions(selectedIds, targetBankId)
    }
    setShowMoveModal(false)
    clearSelection()
    setToast({
      msg: `${movingCount}개 문항을 "${targetName}"(으)로 ${keepOriginal ? '복사' : '이동'}했습니다`,
      bankId: targetBankId,
    })
  }

  const handleSaveEdit = (updated) => {
    if (!editingQuestion) return
    updateQuestion(editingQuestion.id, updated)
    setEditingQuestion(null)
  }
  const handleDelete = (id) => setDeleteTargetId(id)
  const confirmDelete = () => {
    if (deleteTargetId) deleteQuestion(deleteTargetId)
    setDeleteTargetId(null)
  }

  const handleAddQuestion = (newQ) => {
    addQuestions([{ ...newQ, id: `q_${Date.now()}`, bankId: bank.id, usageCount: 0 }])
    setShowInlineAdd(false)
  }

  const handleCsvImport = (rows) => {
    const newQuestions = rows.map((row, i) => ({
      id: `q_csv_${Date.now()}_${i}`,
      text: row.text, type: row.type, points: row.points,
      bankId: bank.id, usageCount: 0,
      difficulty: row.difficulty || '',
      correctAnswer: row.type === 'multiple_answers' && row.answer
        ? row.answer.split(',').map(s => s.trim()).filter(Boolean)
        : row.answer || '',
      choices: row.choices || [],
    }))
    addQuestions(newQuestions)
  }

  return (
    <>
      <div className="pb-8">

        <PageHeader
          ariaLabel="뒤로가기"
          title={
            editingBankName ? (
              <input
                autoFocus
                value={bankNameDraft}
                onChange={e => setBankNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && bankNameDraft.trim()) {
                    updateBank(bank.id, { name: bankNameDraft.trim() })
                    setEditingBankName(false)
                  }
                  if (e.key === 'Escape') setEditingBankName(false)
                }}
                onBlur={() => {
                  if (bankNameDraft.trim()) updateBank(bank.id, { name: bankNameDraft.trim() })
                  setEditingBankName(false)
                }}
                className="text-[22px] font-bold text-foreground leading-tight focus:outline-none border-b-2 border-primary bg-transparent min-w-0"
                style={{ width: `${Math.max(bankNameDraft.length, 4)}ch` }}
              />
            ) : (
              <div className="flex items-center gap-2 group min-w-0">
                <h1 className="text-[22px] font-bold text-foreground leading-tight truncate">{bank.name}</h1>
                <button
                  type="button"
                  onClick={() => { setBankNameDraft(bank.name); setEditingBankName(true) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                  aria-label="문제은행 이름 편집"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            )
          }
          description="문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다."
          actions={
            <>
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} />
                <span className="hidden sm:block">일괄 업로드</span>
              </Button>
              <Button onClick={() => setShowInlineAdd(true)} disabled={showInlineAdd}>
                <Plus size={15} />
                문항 추가
              </Button>
            </>
          }
        />

        {/* 검색 + 필터 툴바 — 1행: 난이도 탭 / 2행: 유형 드롭다운 + 검색 */}
        <div className="mt-1 mb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto -mx-0.5 px-0.5 py-0.5 min-w-0">
              {DIFF_TABS.map(t => {
                const active = filterDifficulty === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFilterDifficulty(t.value)}
                    aria-pressed={active}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
                      active ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-border',
                    )}
                  >
                    <span>{t.label}</span>
                    <span className={cn('text-[11px] tabular-nums', active ? 'text-white/70' : 'text-muted-foreground')}>
                      {diffCounts[t.value] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={filterType} onChange={setFilterType} filterMode ghost size="md"
              className="w-[120px] sm:w-[130px] shrink-0"
              options={[
                { value: 'all', label: '모든 유형' },
                ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
              ]}
            />
            <div className="relative w-full sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="문항 내용 검색"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 선택 툴바 */}
        <div className="flex items-center gap-3 mb-2 px-1 min-h-[32px]">
          {filtered.length > 0 ? (
            <div
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer"
            >
              <Checkbox
                checked={allSelected}
                indeterminate={selectedIds.length > 0 && !allSelected}
                onChange={toggleSelectAll}
                aria-label="전체 선택"
              />
              {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : `총 ${filtered.length}개 문항`}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">총 {filtered.length}개 문항</span>
          )}
          {selectedIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowMoveModal(true)}>
              다른 문제은행으로 이동
            </Button>
          )}
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0 ml-auto">
              <Switch size="sm" checked={allExpanded} onCheckedChange={setAllExpanded} />
              <span className="text-[13px] text-secondary-foreground leading-none">모두 펼치기</span>
            </label>
          )}
        </div>

        {/* 문항 목록 */}
        {filtered.length === 0 && !showInlineAdd ? (
          <Card className="overflow-hidden py-0 gap-0">
            <div className="py-16 text-center">
              <p className="text-sm mb-1 text-muted-foreground">
                {questions.length === 0 ? '아직 추가된 문항이 없습니다' : '검색 결과가 없습니다'}
              </p>
              {questions.length === 0 && (
                <Button onClick={() => setShowInlineAdd(true)} className="mt-3">
                  <Plus size={14} />
                  첫 문항 추가하기
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.length > 0 && (
              <Card className="overflow-hidden py-0 gap-0">
                {filtered.map((q, idx) => (
                  <QuestionItem
                    key={q.id}
                    question={q}
                    onEdit={() => setEditingQuestion(q)}
                    onDelete={() => handleDelete(q.id)}
                    isLast={idx === filtered.length - 1}
                    selected={selectedIds.includes(q.id)}
                    onToggleSelect={() => toggleSelect(q.id)}
                    allExpanded={allExpanded}
                  />
                ))}
              </Card>
            )}
            {showInlineAdd && (
              <InlineQuestionEditor
                index={questions.length}
                prevType={questions[questions.length - 1]?.type}
                onAdd={handleAddQuestion}
                onCancel={() => setShowInlineAdd(false)}
              />
            )}
          </div>
        )}
      </div>

      {editingQuestion && (
        <AddQuestionModal
          onClose={() => setEditingQuestion(null)}
          onAdd={handleSaveEdit}
          initialQuestion={editingQuestion}
        />
      )}

      {showUploadModal && (
        <BankUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onImport={handleCsvImport}
          bankName={bank.name}
          bankDifficulty={bank.difficulty || ''}
        />
      )}

      {showMoveModal && (
        <MoveQuestionsModal
          count={selectedIds.length}
          currentBankId={bank.id}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMove}
        />
      )}

      {deleteTargetId && (
        <ConfirmDialog
          title="문항을 삭제할까요?"
          message="삭제된 문항은 복구할 수 없습니다."
          confirmLabel="삭제"
          confirmDanger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
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

function QuestionItem({ question, onEdit, onDelete, isLast, selected, onToggleSelect, allExpanded }) {
  const diff = question.difficulty && DIFFICULTY_META[question.difficulty]
  const noAnswer = question.type === 'essay' || question.type === 'file_upload' || question.type === 'text'
  return (
    <div className={cn('flex transition-colors', selected ? 'bg-accent' : 'hover:bg-background', !isLast && 'border-b border-secondary')}>
      {/* 선택 체크박스 */}
      <div className="flex items-center px-3.5 shrink-0 self-stretch">
        <Checkbox checked={selected} onChange={onToggleSelect} aria-label="문항 선택" />
      </div>
      <div className="flex-1 min-w-0 px-2 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge type={question.type} small />
              {diff && (
                <Badge
                  variant="secondary"
                  className={cn('h-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold', diff.className)}
                >
                  {diff.label}
                </Badge>
              )}
            </div>
            {allExpanded ? (
              <RichTextRenderer html={question.text} className="text-sm leading-relaxed text-foreground" />
            ) : (
              <p className="text-sm leading-relaxed line-clamp-2">{htmlToPlainText(question.text)}</p>
            )}
            {!noAnswer && (
              allExpanded ? (
                <QuestionAnswer q={question} expanded />
              ) : (
                <div className="mt-1.5 bg-secondary/80 rounded px-2.5 py-1.5">
                  <QuestionAnswer q={question} />
                </div>
              )
            )}
            {allExpanded && noAnswer && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">정답이 없는 수동 채점 문항입니다</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">배점 {question.points}점</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost" size="icon-xs"
              onClick={onEdit}
              className="text-muted-foreground hover:text-primary hover:bg-secondary"
              title="문항 편집"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost" size="icon-xs"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive-soft"
              title="문항 삭제"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
