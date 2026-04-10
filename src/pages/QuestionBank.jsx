import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Upload, Download, ChevronLeft, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'
import { useQuestionBank } from '../context/QuestionBankContext'
import AddQuestionModal from '../components/AddQuestionModal'
import { downloadQuestionTemplate, parseExcelOrCsv } from '../utils/excelUtils'

const DIFFICULTY_META = {
  high:   { label: '상', color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: '중', color: '#D97706', bg: '#FFFBEB' },
  low:    { label: '하', color: '#16A34A', bg: '#F0FDF4' },
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
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

  const handleDelete = (id) => {
    setDeleteTargetId(id)
  }

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
      text: row.text,
      type: row.type,
      points: row.points,
      bankId: bank.id,
      usageCount: 0,
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
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 xl:px-16 py-8">

        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/question-banks')}
            className="flex items-center gap-1 text-xs mb-2 transition-colors"
            style={{ color: '#9E9E9E' }}
            onMouseEnter={e => e.currentTarget.style.color = '#424242'}
            onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
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
                    className="text-2xl font-bold focus:outline-none"
                    style={{ color: '#222222', border: 'none', borderBottom: '2px solid #6366F1', background: 'transparent', minWidth: 0, width: `${Math.max(bankNameDraft.length, 4)}ch` }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>{bank.name}</h1>
                  <button
                    type="button"
                    onClick={() => { setBankNameDraft(bank.name); setEditingBankName(true) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#9E9E9E' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6366F1'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: '#BDBDBD' }}>
                문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 transition-colors"
                style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Upload size={14} />
                <span className="hidden sm:block">일괄 업로드</span>
              </button>
              <button
                onClick={() => { setShowAddModal(true); setEditingId(null) }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition-colors"
                style={{ borderRadius: 4 }}
              >
                <Plus size={15} />
                문항 추가
              </button>
            </div>
          </div>
        </div>

        {/* 필터 + 검색 툴바 */}
        <div className="card-flat p-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 좌측: 필터 드롭다운 */}
            <DropdownSelect
              value={filterType}
              onChange={setFilterType}
              filterMode
              style={{ width: 130 }}
              options={[
                { value: 'all', label: '모든 유형' },
                ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
              ]}
            />
            <DropdownSelect
              value={filterDifficulty}
              onChange={setFilterDifficulty}
              filterMode
              style={{ width: 130 }}
              options={[
                { value: 'all', label: '모든 난이도' },
                { value: '', label: '미지정' },
                { value: 'high', label: '상' },
                { value: 'medium', label: '중' },
                { value: 'low', label: '하' },
              ]}
            />
            {/* 검색 입력 */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="문항 내용 검색"
                className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none"
                style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 6, color: '#222222' }}
                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={e => e.currentTarget.style.borderColor = '#E0E0E0'}
              />
            </div>
          </div>
        </div>

        {/* 문항 수 */}
        <p className="text-xs mb-2 px-1" style={{ color: '#9E9E9E' }}>총 {filtered.length}개 문항</p>

        {/* 문항 목록 */}
        <div className="card-flat overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm mb-1" style={{ color: '#9E9E9E' }}>
                {questions.length === 0 ? '아직 추가된 문항이 없습니다' : '검색 결과가 없습니다'}
              </p>
              {questions.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium px-4 py-2 mx-auto transition-colors"
                  style={{ background: '#6366F1', color: '#fff', borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#4F46E5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#6366F1'}
                >
                  <Plus size={14} />
                  첫 문항 추가하기
                </button>
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
                  style={{
                    borderTop: !isFiltered && dragOverIndex === idx ? '2px solid #6366F1' : '2px solid transparent',
                    cursor: !isFiltered ? 'grab' : 'default',
                  }}
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
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTargetId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white p-6 w-full max-w-sm"
            style={{ borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: '#222222' }}>문항을 삭제할까요?</p>
            <p className="text-xs mb-5" style={{ color: '#9E9E9E' }}>삭제된 문항은 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="text-sm px-3 py-1.5 transition-colors"
                style={{ color: '#616161' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="text-sm font-medium px-3 py-1.5 text-white transition-colors"
                style={{ background: '#EF4444', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 text-sm text-white"
          style={{ background: '#1E1E1E', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          <CheckCircle2 size={15} className="shrink-0" style={{ color: '#A5B4FC' }} />
          <span className="font-medium">{toast.msg}</span>
          {toast.bankId && (
            <button
              onClick={() => { navigate(`/question-banks/${toast.bankId}`); setToast(null) }}
              className="shrink-0 text-xs font-medium transition-colors"
              style={{ color: '#A5B4FC' }}
              onMouseEnter={e => e.currentTarget.style.color = '#C7D2FE'}
              onMouseLeave={e => e.currentTarget.style.color = '#A5B4FC'}
            >
              바로가기 →
            </button>
          )}
        </div>
      )}
    </Layout>
  )
}

// ── 문항 아이템 ───────────────────────────────────────────────────────────────
function QuestionItem({ question, isEditing, onEdit, onSave, onDelete, isLast, bankDifficulty = '' }) {
  return (
    <div
      className="p-4 transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid #EEEEEE' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* 1행: 유형 배지 + 점수 + 난이도 */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-1.5 py-0.5 font-semibold"
              style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}
            >
              {QUIZ_TYPES[question.type]?.label}
            </span>
            <span className="text-xs font-medium" style={{ color: '#424242' }}>{question.points}점</span>
            {question.difficulty && DIFFICULTY_META[question.difficulty] && (
              <span
                className="text-xs font-medium px-1.5 py-0.5"
                style={{ background: DIFFICULTY_META[question.difficulty].bg, color: DIFFICULTY_META[question.difficulty].color, borderRadius: 4 }}
              >
                {DIFFICULTY_META[question.difficulty].label}
              </span>
            )}
          </div>
          {/* 문항 내용 */}
          <p className="text-sm leading-relaxed" style={{ color: '#222222' }}>{question.text}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 transition-colors"
            style={{ borderRadius: 4, color: '#9E9E9E' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#EEF2FF' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 transition-colors"
            style={{ borderRadius: 4, color: '#9E9E9E' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF2B2A'; e.currentTarget.style.background = '#FFF5F5' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #EEEEEE' }}>
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

// ── 문항 추가/편집 폼 ─────────────────────────────────────────────────────────
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
    <div className="p-4 space-y-3" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 6 }}>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>문항 내용</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full bg-white text-sm px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
          style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
          placeholder="문항 내용을 입력하세요"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>문항 유형</label>
          <DropdownSelect
            value={type}
            onChange={setType}
            options={Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>배점</label>
          <input
            type="number"
            value={points}
            onChange={e => setPoints(e.target.value)}
            min={1}
            className="w-full bg-white text-sm px-2 py-1.5 focus:outline-none focus:border-indigo-400"
            style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#424242' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>난이도</label>
          {bankDifficulty ? (
            <div className="text-xs px-2 py-1.5 flex items-center gap-1.5" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#424242' }}>
              <span className="font-medium">{bankDifficulty === 'high' ? '상' : bankDifficulty === 'medium' ? '중' : '하'}</span>
              <span style={{ color: '#9E9E9E' }}>고정</span>
            </div>
          ) : (
            <DropdownSelect
              value={difficulty}
              onChange={setDifficulty}
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
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 transition-colors"
          style={{ color: '#616161' }}
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="text-sm font-medium px-3 py-1.5 bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
          style={{ borderRadius: 4 }}
        >
          {initial ? '저장' : '추가'}
        </button>
      </div>
    </div>
  )
}

