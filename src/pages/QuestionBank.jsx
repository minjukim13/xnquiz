import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Upload, Download, ChevronLeft, AlertCircle, GripVertical } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'
import { useQuestionBank } from '../context/QuestionBankContext'
import AddQuestionModal from '../components/AddQuestionModal'
import TypeBadge from '../components/TypeBadge'
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
  const [editingQuestion, setEditingQuestion] = useState(null)
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

  const handleSaveEdit = (updated) => {
    if (!editingQuestion) return
    const enforced = bank.difficulty ? { ...updated, difficulty: bank.difficulty } : updated
    updateQuestion(editingQuestion.id, enforced)
    setEditingQuestion(null)
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
      correctAnswer: row.type === 'multiple_answers' && row.answer
        ? row.answer.split(',').map(s => s.trim()).filter(Boolean)
        : row.answer || '',
      choices: row.choices || [],
    }))
    addQuestions(newQuestions)
    setShowUploadModal(false)
  }

  return (
    <Layout breadcrumbs={[{ label: '문제은행', href: '/question-banks' }, { label: bank.name }]}>
      <div className="max-w-6xl mx-auto pb-8">

        {/* 헤더 */}
        <div className="pt-4 pb-5">
          <button
            onClick={() => navigate('/question-banks')}
            className="flex items-center gap-1 text-xs mb-3 text-muted-foreground hover:text-secondary-foreground transition-colors"
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
                    className="text-[24px] font-bold text-foreground focus:outline-none border-b-2 border-primary bg-transparent min-w-0"
                    style={{ width: `${Math.max(bankNameDraft.length, 4)}ch` }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-[24px] font-bold text-foreground">{bank.name}</h1>
                  <button
                    type="button"
                    onClick={() => { setBankNameDraft(bank.name); setEditingBankName(true) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-caption hover:text-primary"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
              <p className="text-xs mt-1.5 text-caption">
                문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} />
                <span className="hidden sm:block">일괄 업로드</span>
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={15} />
                문항 추가
              </Button>
            </div>
          </div>
        </div>

        {/* 필터 + 검색 툴바 */}
        <div className="flex items-center gap-3 mb-3">
          <DropdownSelect
            value={filterType} onChange={setFilterType} filterMode ghost
            style={{ width: 130 }}
            options={[
              { value: 'all', label: '모든 유형' },
              ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />
          <DropdownSelect
            value={filterDifficulty} onChange={setFilterDifficulty} filterMode ghost
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
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="문항 내용 검색"
              className="w-full text-sm pl-9 pr-3 py-2.5 bg-white border border-border rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"
            />
          </div>
        </div>

        <p className="text-xs mb-2 px-1 text-muted-foreground">총 {filtered.length}개 문항</p>

        {/* 문항 목록 */}
        <Card className="overflow-hidden py-0 gap-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm mb-1 text-muted-foreground">
                {questions.length === 0 ? '아직 추가된 문항이 없습니다' : '검색 결과가 없습니다'}
              </p>
              {questions.length === 0 && (
                <Button onClick={() => setShowAddModal(true)} className="mt-3">
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
                  onDragOver={e => !isFiltered && handleDragOver(e, idx)}
                  onDragLeave={() => !isFiltered && handleDragLeave()}
                  onDrop={() => !isFiltered && handleDrop(idx)}
                  className={cn(
                    'border-t-2',
                    !isFiltered && dragOverIndex === idx ? 'border-t-primary' : 'border-t-transparent',
                  )}
                >
                  <QuestionItem
                    question={q}
                    onEdit={() => setEditingQuestion(q)}
                    onDelete={() => handleDelete(q.id)}
                    isLast={idx === filtered.length - 1}
                    showDragHandle={!isFiltered}
                    onDragStart={() => handleDragStart(idx)}
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

      {editingQuestion && (
        <AddQuestionModal
          onClose={() => setEditingQuestion(null)}
          onAdd={handleSaveEdit}
          bankDifficulty={bank.difficulty || ''}
          initialQuestion={editingQuestion}
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
        <Toast
          message={toast.msg}
          action={toast.bankId ? { label: '바로가기', onClick: () => { navigate(`/question-banks/${toast.bankId}`); setToast(null) } } : undefined}
        />
      )}
    </Layout>
  )
}

function QuestionItem({ question, onEdit, onDelete, isLast, showDragHandle, onDragStart }) {
  const diff = question.difficulty && DIFFICULTY_META[question.difficulty]
  return (
    <div className={cn('flex transition-colors hover:bg-background', !isLast && 'border-b border-secondary')}>
      {/* 드래그 핸들 */}
      {showDragHandle && (
        <div
          draggable
          onDragStart={onDragStart}
          className="flex items-center px-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 self-stretch"
          title="드래그하여 순서 변경"
        >
          <GripVertical size={16} />
        </div>
      )}
      {/* 클릭 가능한 문항 영역 */}
      <div
        className="flex-1 min-w-0 px-4 py-5 cursor-pointer"
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge type={question.type} small />
              <span className="text-xs font-medium text-slate-700">{question.points}점</span>
              {diff && (
                <Badge variant="secondary" className={cn('text-xs', diff.className)}>
                  {diff.label}
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed">{question.text}</p>
          </div>
          <Button
            variant="ghost" size="icon-xs"
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ExcelUploadModal({ onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
    setErrors([])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const result = await parseExcelOrCsv(file)
    setLoading(false)
    if (result.error) {
      setErrors([result.error])
    } else if (result.errors) {
      setErrors(result.errors)
    } else {
      onImport(result.rows)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">문항 일괄 업로드</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">엑셀(.xlsx, .xls) 또는 CSV 파일을 업로드하세요.</p>

          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-slate-400" />
            {file ? (
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">클릭하여 파일 선택</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {e}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={downloadQuestionTemplate}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Download size={13} />
              템플릿 다운로드
            </button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>취소</Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file || loading}
              >
                {loading ? '처리 중' : '업로드'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

