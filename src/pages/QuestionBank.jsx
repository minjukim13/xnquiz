import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Trash2, Upload, Download, ChevronLeft, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react'
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
              <Button onClick={() => setShowAddModal(true)} className="bg-[#3182F6] hover:bg-[#1B64DA]">
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
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="문항 내용 검색"
              className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#F2F4F6] border-transparent rounded-lg text-[#191F28] placeholder:text-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

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
                  onDragOver={e => !isFiltered && handleDragOver(e, idx)}
                  onDragLeave={() => !isFiltered && handleDragLeave()}
                  onDrop={() => !isFiltered && handleDrop(idx)}
                  className={cn(
                    'border-t-2',
                    !isFiltered && dragOverIndex === idx ? 'border-t-[#3182F6]' : 'border-t-transparent',
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

function QuestionDetail({ question }) {
  const q = question
  switch (q.type) {
    case 'multiple_choice':
      if (!q.options?.length) return null
      return (
        <div className="mt-2 space-y-1">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                q.correctAnswer === i ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
              )}>
                {q.correctAnswer === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={cn('text-sm', q.correctAnswer === i ? 'text-indigo-700 font-medium' : 'text-slate-600')}>{opt}</span>
            </div>
          ))}
        </div>
      )
    case 'true_false':
      return (
        <div className="mt-2 flex gap-2">
          {[true, false].map(val => (
            <span key={String(val)} className={cn(
              'text-xs px-3 py-1 rounded-full',
              q.correctAnswer === val ? 'bg-indigo-50 text-indigo-700 font-medium ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-400'
            )}>
              {val ? '참 (True)' : '거짓 (False)'}
            </span>
          ))}
        </div>
      )
    case 'multiple_answers':
      if (!q.options?.length) return null
      return (
        <div className="mt-2 space-y-1">
          {q.options.map((opt, i) => {
            const isCorrect = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(i)
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={cn('w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center',
                  isCorrect ? 'bg-indigo-500' : 'border border-slate-300'
                )}>
                  {isCorrect && <span className="text-white text-[9px]">&#10003;</span>}
                </div>
                <span className={cn('text-sm', isCorrect ? 'text-indigo-700 font-medium' : 'text-slate-600')}>{opt}</span>
              </div>
            )
          })}
        </div>
      )
    case 'short_answer':
      if (!Array.isArray(q.correctAnswer) || !q.correctAnswer.length) return null
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500">정답:</span>
          {q.correctAnswer.map((a, i) => (
            <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{a}</span>
          ))}
        </div>
      )
    case 'essay':
      if (!q.rubric) return null
      return <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-2.5 py-1.5 line-clamp-2">채점 기준: {q.rubric}</p>
    case 'numerical':
      return (
        <div className="mt-2 text-xs text-slate-600">
          정답: <span className="font-mono font-medium text-indigo-700">{q.correctAnswer}</span>
          {q.tolerance > 0 && <span className="text-slate-400 ml-1">(&#177; {q.tolerance})</span>}
        </div>
      )
    case 'matching':
      if (!q.pairs?.length) return null
      return (
        <div className="mt-2 space-y-1">
          {q.pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="bg-slate-50 px-2 py-0.5 rounded text-xs">{p.left}</span>
              <span className="text-slate-400">&#8596;</span>
              <span className="bg-slate-50 px-2 py-0.5 rounded text-xs">{p.right}</span>
            </div>
          ))}
        </div>
      )
    case 'fill_in_multiple_blanks':
      if (!Array.isArray(q.correctAnswer) || !q.correctAnswer.length) return null
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {q.correctAnswer.map((b, i) => (
            <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">빈칸 {i + 1}: {b}</span>
          ))}
        </div>
      )
    case 'formula':
      return (
        <div className="mt-2 text-xs text-slate-600 space-y-1">
          {q.formula && <p>수식: <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-teal-700">{q.formula}</code></p>}
          {q.variables?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {q.variables.map((v, i) => (
                <span key={i} className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-xs font-mono">{v.name}: {v.min}~{v.max}</span>
              ))}
            </div>
          )}
        </div>
      )
    case 'multiple_dropdowns':
      if (!q.dropdowns?.length) return null
      return (
        <div className="mt-2 space-y-1.5">
          {q.dropdowns.map((dd, i) => (
            <div key={i} className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">{dd.label || `드롭다운 ${i + 1}`}:</span>{' '}
              {dd.options.map((opt, j) => (
                <span key={j} className={cn('inline-block mx-0.5 px-1.5 py-0.5 rounded',
                  dd.answerIdx === j ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-slate-50 text-slate-500'
                )}>{opt}</span>
              ))}
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}

function QuestionItem({ question, onEdit, onDelete, isLast, showDragHandle, onDragStart }) {
  const diff = question.difficulty && DIFFICULTY_META[question.difficulty]
  return (
    <div className={cn('flex transition-colors hover:bg-slate-50/50', !isLast && 'border-b border-slate-100')}>
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
        className="flex-1 min-w-0 p-4 cursor-pointer"
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }}
      >
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
            <QuestionDetail question={question} />
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
            className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#3182F6] transition-colors"
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
              className="text-xs text-[#3182F6] hover:underline flex items-center gap-1"
            >
              <Download size={13} />
              템플릿 다운로드
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>취소</Button>
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-[#3182F6] hover:bg-[#1B64DA]"
              >
                {loading ? '처리 중...' : '업로드'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

