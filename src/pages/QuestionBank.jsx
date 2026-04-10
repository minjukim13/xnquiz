import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Upload, Download, ChevronLeft, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'
import { useQuestionBank } from '../context/QuestionBankContext'
import AddQuestionModal from '../components/AddQuestionModal'
import { downloadQuestionTemplate, parseExcelOrCsv } from '../utils/excelUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '../components/ConfirmDialog'

const DIFFICULTY_META = {
  high:   { label: '상', className: 'bg-red-50 text-red-600' },
  medium: { label: '중', className: 'bg-amber-50 text-amber-600' },
  low:    { label: '하', className: 'bg-green-50 text-green-600' },
}

export default function QuestionBank() {
  const { bankId } = useParams()
  const navigate = useNavigate()
  const { banks, getBankQuestions, addBank, updateBank, addQuestions, updateQuestion, deleteQuestion, reorderQuestions } = useQuestionBank()

  const bank = banks.find(b => b.id === bankId) ?? banks[0]
  const questions = bank ? getBankQuestions(bank.id) : []

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingBankName, setEditingBankName] = useState(false)
  const [bankNameDraft, setBankNameDraft] = useState('')
  const [toast, setToast] = useState(null)
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const isFiltered = search !== '' || filterType !== 'all' || filterDifficulty !== 'all'

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    setDragOverIndex(null)
    dragIndexRef.current = null
    if (from === null || from === index) return
    reorderQuestions(bank.id, from, index)
  }

  const showToast = (msg, bankId = null) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = useMemo(() => questions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchSearch && matchType && matchDiff
  }), [questions, search, filterType, filterDifficulty])

  const handleSaveEdit = (id, updated) => {
    const enforced = bank.difficulty ? { ...updated, difficulty: bank.difficulty } : updated
    updateQuestion(id, enforced)
    setEditingId(null)
  }

  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const handleDelete = (id) => setDeleteTargetId(id)
  const confirmDelete = () => {
    if (deleteTargetId) deleteQuestion(deleteTargetId)
    setDeleteTargetId(null)
  }

  const handleAddQuestion = (newQ) => {
    const difficulty = bank.difficulty || newQ.difficulty
    addQuestions([{ ...newQ, id: `q_${Date.now()}`, bankId: bank.id, usageCount: 0, difficulty }])
    setShowAddModal(false)
  }

  const handleCsvImport = (rows) => {
    const newQuestions = rows.map((row, i) => ({
      id: `q_csv_${Date.now()}_${i}`,
      text: row.text, type: row.type, points: row.points,
      bankId: bank.id, usageCount: 0,
      difficulty: row.difficulty || 'medium',
      groupTag: row.groupTag || '',
      correctAnswer: row.answer || '',
      choices: row.choices || [],
    }))
    addQuestions(newQuestions)
    setShowUploadModal(false)
  }

  return (
    <Layout breadcrumbs={[{ label: '문제은행', href: '/question-banks' }, { label: bank.name }]}>
      <div className="max-w-6xl mx-auto py-8">

        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/question-banks')}
            className="flex items-center gap-1 text-xs mb-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={13} />
            문제은행 목록
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              {editingBankName ? (
                <div className="flex items-center gap-2">
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
                    className="text-2xl font-bold focus:outline-none border-b-2 border-[#3182F6] bg-transparent min-w-0"
                    style={{ width: `${Math.max(bankNameDraft.length, 4)}ch` }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-bold">{bank.name}</h1>
                  <button
                    type="button"
                    onClick={() => { setBankNameDraft(bank.name); setEditingBankName(true) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-[#3182F6]"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
              <p className="text-xs mt-1 text-muted-foreground/60">
                문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} />
                <span className="hidden sm:block">일괄 업로드</span>
              </Button>
              <Button onClick={() => { setShowAddModal(true); setEditingId(null) }} className="bg-[#3182F6] hover:bg-[#1B64DA]">
                <Plus size={15} />
                문항 추가
              </Button>
            </div>
          </div>
        </div>

        {/* 필터 + 검색 툴바 */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownSelect
                value={filterType} onChange={setFilterType} filterMode
                style={{ width: 130 }}
                options={[
                  { value: 'all', label: '모든 유형' },
                  ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
              />
              <DropdownSelect
                value={filterDifficulty} onChange={setFilterDifficulty} filterMode
                style={{ width: 130 }}
                options={[
                  { value: 'all', label: '모든 난이도' },
                  { value: '', label: '미지정' },
                  { value: 'high', label: '상' },
                  { value: 'medium', label: '중' },
                  { value: 'low', label: '하' },
                ]}
              />
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="문항 내용 검색"
                  className="w-full text-sm pl-9 pr-3 py-2 bg-slate-50 border border-border rounded-md focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs mb-2 px-1 text-muted-foreground">총 {filtered.length}개 문항</p>

        {/* 문항 목록 */}
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm mb-1 text-muted-foreground">
                {questions.length === 0 ? '아직 추가된 문항이 없습니다' : '검색 결과가 없습니다'}
              </p>
              {questions.length === 0 && (
                <Button onClick={() => setShowAddModal(true)} className="mt-3 bg-[#3182F6] hover:bg-[#1B64DA]">
                  <Plus size={14} />
                  첫 문항 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((q, idx) => (
                <div
                  key={q.id}
                  draggable={!isFiltered && !editingId}
                  onDragStart={() => !isFiltered && handleDragStart(idx)}
                  onDragOver={e => !isFiltered && handleDragOver(e, idx)}
                  onDragLeave={() => !isFiltered && handleDragLeave()}
                  onDrop={() => !isFiltered && handleDrop(idx)}
                  className={cn(
                    'border-t-2',
                    !isFiltered && dragOverIndex === idx ? 'border-t-[#3182F6]' : 'border-t-transparent',
                    !isFiltered && 'cursor-grab'
                  )}
                >
                  <QuestionItem
                    question={q}
                    isEditing={editingId === q.id}
                    onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
                    onSave={(updated) => handleSaveEdit(q.id, updated)}
                    onDelete={() => handleDelete(q.id)}
                    isLast={idx === filtered.length - 1}
                    bankDifficulty={bank.difficulty || ''}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddQuestion}
          bankDifficulty={bank.difficulty || ''}
        />
      )}

      {showUploadModal && (
        <ExcelUploadModal
          onClose={() => setShowUploadModal(false)}
          onImport={handleCsvImport}
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
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 text-sm text-white bg-slate-900 rounded-lg shadow-lg">
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

function QuestionItem({ question, isEditing, onEdit, onSave, onDelete, isLast, bankDifficulty = '' }) {
  const diff = question.difficulty && DIFFICULTY_META[question.difficulty]
  return (
    <div className={cn('p-4 transition-colors', !isLast && 'border-b border-slate-100')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
              {QUIZ_TYPES[question.type]?.label}
            </Badge>
            <span className="text-xs font-medium text-slate-700">{question.points}점</span>
            {diff && (
              <Badge variant="secondary" className={cn('text-xs', diff.className)}>
                {diff.label}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed">{question.text}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-xs" onClick={onEdit} className="text-muted-foreground hover:text-[#3182F6] hover:bg-[#E8F3FF]">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onDelete} className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <QuestionForm
            initial={question}
            onSave={onSave}
            onCancel={onEdit}
            bankDifficulty={bankDifficulty}
          />
        </div>
      )}
    </div>
  )
}

function QuestionForm({ initial, onSave, onCancel, bankDifficulty = '' }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [type, setType] = useState(initial?.type ?? 'multiple_choice')
  const [points, setPoints] = useState(initial?.points ?? 5)
  const [difficulty, setDifficulty] = useState(bankDifficulty || (initial?.difficulty ?? ''))

  const handleSubmit = () => {
    if (!text.trim()) return
    onSave({ text: text.trim(), type, points: Number(points), difficulty })
  }

  return (
    <div className="p-4 space-y-3 bg-slate-50 border border-border rounded-md">
      <div>
        <label className="text-xs font-medium block mb-1 text-slate-600">문항 내용</label>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          rows={2} autoFocus
          className="w-full bg-white text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-blue-100 resize-none transition-all"
          placeholder="문항 내용을 입력하세요"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1 text-slate-600">문항 유형</label>
          <DropdownSelect
            value={type} onChange={setType}
            options={Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1 text-slate-600">배점</label>
          <input
            type="number" value={points} onChange={e => setPoints(e.target.value)} min={1}
            className="w-full bg-white text-sm px-2 py-1.5 border border-border rounded-md focus:outline-none focus:border-[#3182F6] transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1 text-slate-600">난이도</label>
          {bankDifficulty ? (
            <div className="text-xs px-2 py-1.5 flex items-center gap-1.5 bg-muted border border-border rounded-md text-slate-700">
              <span className="font-medium">{bankDifficulty === 'high' ? '상' : bankDifficulty === 'medium' ? '중' : '하'}</span>
              <span className="text-muted-foreground">고정</span>
            </div>
          ) : (
            <DropdownSelect
              value={difficulty} onChange={setDifficulty}
              options={[
                { value: '', label: '미지정' },
                { value: 'high', label: '상' },
                { value: 'medium', label: '중' },
                { value: 'low', label: '하' },
              ]}
            />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>취소</Button>
        <Button onClick={handleSubmit} disabled={!text.trim()} className="bg-[#3182F6] hover:bg-[#1B64DA]">
          {initial ? '저장' : '추가'}
        </Button>
      </div>
    </div>
  )
}
