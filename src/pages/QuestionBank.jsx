import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Upload, Download, FolderInput, FolderOutput, ChevronLeft, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES, MOCK_COURSES } from '../data/mockData'
import { AppSelect } from '../components/AppSelect'
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
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
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

  const handleCopyFromBank = (copiedQuestions) => {
    const newQuestions = copiedQuestions.map(q => ({
      ...q,
      id: `q_copy_${Date.now()}_${q.id}`,
      bankId: bank.id,
      usageCount: 0,
    }))
    addQuestions(newQuestions)
    setShowCopyModal(false)
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
                onClick={() => setShowDuplicateModal(true)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 transition-colors"
                style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderOutput size={14} />
                <span className="hidden sm:block">내보내기</span>
              </button>
              <button
                onClick={() => setShowCopyModal(true)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 transition-colors"
                style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderInput size={14} />
                <span className="hidden sm:block">가져오기</span>
              </button>
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

      {showCopyModal && (
        <CopyFromBankModal
          currentBankId={bank.id}
          onClose={() => setShowCopyModal(false)}
          onCopy={handleCopyFromBank}
        />
      )}

      {showDuplicateModal && (
        <DuplicateBankModal
          bank={bank}
          questions={questions}
          onClose={() => setShowDuplicateModal(false)}
          onDuplicate={(selectedQuestions, newName, targetCourse, targetBankId) => {
            let bankId = targetBankId
            let bankName = newName
            if (!bankId) {
              bankId = `bank_copy_${Date.now()}`
              addBank({
                id: bankId,
                name: bankName,
                course: targetCourse,
                updatedAt: new Date().toISOString().split('T')[0],
                usedInQuizIds: [],
              })
            } else {
              bankName = banks.find(b => b.id === bankId)?.name || bankName
            }
            addQuestions(selectedQuestions.map(q => ({
              ...q,
              id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bankId,
            })))
            setShowDuplicateModal(false)
            showToast(`"${bankName}" 문제은행으로 내보내기 완료`, bankId)
          }}
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

// ── 복제 모달 ────────────────────────────────────────────────────────────────
function DuplicateBankModal({ bank, questions, onClose, onDuplicate }) {
  const { banks } = useQuestionBank()
  const [newName, setNewName] = useState(`${bank.name}-사본`)
  const [targetCourse, setTargetCourse] = useState(bank.course || MOCK_COURSES[0]?.name || '')
  const [courseSearch, setCourseSearch] = useState('')
  const [targetBankId, setTargetBankId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(questions.map(q => q.id))
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const filteredCourses = useMemo(() =>
    MOCK_COURSES.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courseSearch]
  )

  const courseBanks = banks.filter(b => b.course === targetCourse)

  // 타겟 은행 난이도 — 설정된 경우 해당 난이도 문항만 선택 가능
  const targetBank = targetBankId && targetBankId !== '__new__' ? banks.find(b => b.id === targetBankId) : null
  const targetDifficulty = targetBank?.difficulty || ''

  const filtered = questions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  })

  const isSelectable = (q) => !targetDifficulty || q.difficulty === targetDifficulty

  const selectedQuestions = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean)

  const selectableFiltered = filtered.filter(isSelectable)
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(q => selectedIds.includes(q.id))
  const someFilteredSelected = selectableFiltered.some(q => selectedIds.includes(q.id)) && !allFilteredSelected

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableFiltered.find(q => q.id === id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableFiltered.map(q => q.id)])])
    }
  }
  const toggle = (id, q) => {
    if (!isSelectable(q)) return
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    setDragOverIndex(null)
    if (from === null || from === index) return
    setSelectedIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = null
  }

  const handleCourseChange = (course) => {
    setTargetCourse(course)
    setTargetBankId(null)
  }

  // 타겟 은행이 바뀌면 선택 불가 문항을 selectedIds에서 제거
  const handleTargetBankChange = (id) => {
    setTargetBankId(id)
    if (id && id !== '__new__') {
      const tb = banks.find(b => b.id === id)
      if (tb?.difficulty) {
        setSelectedIds(prev => prev.filter(qId => {
          const q = questions.find(x => x.id === qId)
          return q?.difficulty === tb.difficulty
        }))
      }
    }
  }

  const canSubmit = selectedIds.length > 0 &&
    (targetBankId === '__new__' ? newName.trim() !== '' : targetBankId !== null)

  const handleConfirm = () => {
    if (targetBankId === '__new__') {
      onDuplicate(selectedQuestions, newName.trim(), targetCourse, null)
    } else {
      onDuplicate(selectedQuestions, null, targetCourse, targetBankId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '85vh', borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="font-semibold" style={{ color: '#222222' }}>내보내기</h3>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* 본문: 3컬럼 */}
        <div className="flex flex-1 min-h-0">

          {/* 1열: 과목 선택 + 대상 문제은행 */}
          <div className="flex flex-col shrink-0" style={{ width: 176, borderRight: '1px solid #EEEEEE' }}>
            {/* 과목 섹션 */}
            <div className="flex flex-col" style={{ flex: '0 0 50%', borderBottom: '1px solid #EEEEEE', overflow: 'hidden' }}>
              <div className="px-3 pt-2.5 pb-1.5 shrink-0">
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E' }}>대상 과목</p>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#BDBDBD' }} />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="과목 검색"
                    className="w-full text-xs pl-6 pr-2 py-1.5 focus:outline-none"
                    style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCourses.map(c => {
                  const isSelected = c.name === targetCourse
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCourseChange(c.name)}
                      className="w-full text-left px-3 py-2.5 text-xs leading-snug transition-colors"
                      style={{
                        color: isSelected ? '#6366F1' : '#424242',
                        background: isSelected ? '#EEF2FF' : 'transparent',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: 12,
                        borderLeft: isSelected ? '2px solid #6366F1' : '2px solid transparent',
                      }}
                    >
                      <span className="block truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 대상 문제은행 */}
            <div className="flex flex-col" style={{ flex: '0 0 50%', overflow: 'hidden' }}>
              <p className="px-3 pt-2.5 pb-1 text-xs font-semibold shrink-0" style={{ color: '#9E9E9E' }}>대상 문제은행</p>
              {/* 새 문제은행 옵션 — scroll 밖 고정 */}
              <div className="px-2 pb-1 shrink-0 space-y-1">
                <button
                  type="button"
                  onClick={() => setTargetBankId('__new__')}
                  className="w-full text-left px-2 py-1.5 text-xs transition-colors flex items-center gap-1"
                  style={{
                    border: targetBankId === '__new__' ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                    borderRadius: 4,
                    background: targetBankId === '__new__' ? '#EEF2FF' : 'transparent',
                    color: targetBankId === '__new__' ? '#4338CA' : '#6366F1',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={11} />새 문제은행
                </button>
                {targetBankId === '__new__' && (
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="이름 입력"
                    autoFocus
                    className="w-full text-xs px-2 py-1.5 focus:outline-none"
                    style={{
                      border: newName.trim() ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                      borderRadius: 4,
                      color: '#222222',
                      background: newName.trim() ? '#EEF2FF' : '#fff',
                    }}
                  />
                )}
              </div>
              {/* 기존 문제은행 목록 — 별도 scroll */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {courseBanks.map(b => {
                  const isSelected = b.id === targetBankId
                  const diffLabel = b.difficulty === 'high' ? '상' : b.difficulty === 'medium' ? '중' : b.difficulty === 'low' ? '하' : ''
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => handleTargetBankChange(b.id)}
                      className="w-full text-left px-2 py-1.5 text-xs transition-colors"
                      style={{
                        border: isSelected ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                        borderRadius: 4,
                        background: isSelected ? '#EEF2FF' : 'transparent',
                        color: isSelected ? '#4338CA' : '#424242',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{b.name}</span>
                        {diffLabel && <span className="shrink-0" style={{ color: '#9E9E9E', fontWeight: 400 }}>{diffLabel}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 2열: 필터 + 문항 체크리스트 */}
          <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid #EEEEEE' }}>
            {/* 필터 */}
            <div className="px-3 pt-2.5 pb-2 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
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
            {/* 난이도 제한 배너 */}
            {targetDifficulty && (
              <div className="px-3 py-1.5 shrink-0 text-xs flex items-center gap-1.5" style={{ background: '#FFFBEB', color: '#B45309', borderBottom: '1px solid #FDE68A' }}>
                <AlertCircle size={12} className="shrink-0" />
                난이도 '{targetDifficulty === 'high' ? '상' : targetDifficulty === 'medium' ? '중' : '하'}' 문제은행 — 해당 난이도 문항만 선택 가능
              </div>
            )}
            {/* 전체선택 + 카운트 */}
            {filtered.length > 0 && (
              <div className="px-3 py-1.5 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #F5F5F5' }}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someFilteredSelected }}
                    onChange={toggleAll}
                    className="accent-indigo-600"
                  />
                  <span className="text-xs font-medium" style={{ color: '#616161' }}>
                    {allFilteredSelected ? '전체 해제' : '전체선택'}
                  </span>
                </label>
                <span className="text-xs" style={{ color: selectedIds.length > 0 ? '#6366F1' : '#9E9E9E' }}>
                  {selectedIds.length > 0 ? `${selectedIds.length}개 선택` : `총 ${filtered.length}개`}
                </span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>해당하는 문항이 없습니다</p>
              ) : (
                filtered.map(q => {
                  const selected = selectedIds.includes(q.id)
                  const selectable = isSelectable(q)
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggle(q.id, q)}
                      className="flex items-start gap-2.5 p-2.5 transition-all"
                      style={{
                        border: selected ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                        borderRadius: 6,
                        background: selected ? '#EEF2FF' : selectable ? '#fff' : '#FAFAFA',
                        cursor: selectable ? 'pointer' : 'not-allowed',
                        opacity: selectable ? 1 : 0.45,
                      }}
                    >
                      <input type="checkbox" checked={selected} readOnly disabled={!selectable} className="mt-0.5 shrink-0 accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                            {QUIZ_TYPES[q.type]?.label}
                          </span>
                          {q.difficulty && DIFFICULTY_META[q.difficulty] && (
                            <span className="text-xs px-1.5 py-0.5" style={{
                              background: DIFFICULTY_META[q.difficulty].bg,
                              color: DIFFICULTY_META[q.difficulty].color,
                              borderRadius: 4,
                            }}>
                              {DIFFICULTY_META[q.difficulty].label}
                            </span>
                          )}
                          <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 3열: 선택된 문항 */}
          <div className="flex flex-col shrink-0" style={{ width: 240 }}>
            <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <p className="text-xs font-semibold" style={{ color: '#616161' }}>
                선택된 문항
                <span className="ml-1.5 font-normal" style={{ color: '#9E9E9E' }}>{selectedIds.length}개</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedQuestions.length === 0 ? (
                <p className="py-6 text-center text-xs" style={{ color: '#BDBDBD' }}>선택된 문항이 없습니다</p>
              ) : (
                selectedQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(index)}
                    className="flex items-start gap-1.5 p-2"
                    style={{
                      background: '#FAFAFA',
                      borderRadius: 6,
                      cursor: 'grab',
                      borderTop: dragOverIndex === index ? '2px solid #6366F1' : '2px solid transparent',
                    }}
                  >
                    <GripVertical size={13} className="shrink-0 mt-0.5" style={{ color: '#BDBDBD' }} />
                    <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                    <button
                      onClick={() => toggle(q.id)}
                      className="shrink-0 mt-0.5 transition-colors"
                      style={{ color: '#BDBDBD' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF2B2A'}
                      onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between gap-4" style={{ borderTop: '1px solid #EEEEEE' }}>
          <p className="text-xs truncate" style={{ color: '#9E9E9E' }}>
            {targetBankId === null
              ? '대상 문제은행을 선택하세요'
              : targetBankId === '__new__'
                ? newName.trim()
                  ? <><span style={{ color: '#6366F1', fontWeight: 600 }}>{targetCourse}</span> › <span style={{ color: '#6366F1', fontWeight: 600 }}>{newName.trim()}</span> 으로 새 문제은행 생성</>
                  : '새 문제은행 이름을 입력하세요'
                : <><span style={{ color: '#6366F1', fontWeight: 600 }}>{targetCourse}</span> › <span style={{ color: '#6366F1', fontWeight: 600 }}>{banks.find(b => b.id === targetBankId)?.name}</span> 에 추가</>
            }
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              style={{ borderRadius: 4 }}
            >
              내보내기 ({selectedIds.length}개)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 엑셀/CSV 업로드 모달 ─────────────────────────────────────────────────────
function ExcelUploadModal({ onClose, onImport }) {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatus(null)
    setPreview(null)
    const result = await parseExcelOrCsv(file)
    setLoading(false)
    if (result.errors) {
      setStatus({ type: 'error', messages: result.errors })
      setPreview(null)
      setVisibleCount(20)
    } else {
      setStatus(null)
      setPreview(result.rows)
      setVisibleCount(20)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-lg bg-white flex flex-col"
        style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: 'calc(100vh - 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="font-semibold" style={{ color: '#222222' }}>엑셀/CSV 일괄 업로드</h3>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between text-xs" style={{ color: '#9E9E9E' }}>
            <span>
              지원 형식: .xlsx, .xls, .csv<br />
              지원 유형: 객관식, 참/거짓, 단답형, 서술형
            </span>
            <button
              onClick={downloadQuestionTemplate}
              className="flex items-center gap-1 text-indigo-600 border border-indigo-300 rounded px-2 py-1 text-xs hover:bg-indigo-50 transition-colors"
            >
              <Download size={12} />
              엑셀 템플릿 다운로드
            </button>
          </div>

          <div
            className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors"
            style={{ border: '2px dashed #E0E0E0', borderRadius: 6 }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0E0'}
          >
            <Upload size={24} style={{ color: '#BDBDBD' }} />
            <p className="text-sm" style={{ color: '#9E9E9E' }}>
              {loading ? '파일 분석 중...' : '파일을 클릭하여 선택 (.xlsx / .xls / .csv)'}
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>

          {status?.type === 'error' && (
            <div className="p-3 text-xs" style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 6 }}>
              <div className="flex items-center gap-1.5 mb-2" style={{ color: '#DC2626' }}>
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-semibold">{status.messages.length}건의 오류 — 수정 후 다시 업로드하세요.</span>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto pl-0.5" style={{ color: '#B91C1C' }}>
                {status.messages.map((msg, i) => (
                  <li key={i} className="flex gap-1.5 leading-relaxed">
                    <span className="shrink-0" style={{ color: '#FCA5A5' }}>—</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview && preview.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#9E9E9E' }}>
                총 <span className="font-semibold" style={{ color: '#6366F1' }}>{preview.length}개</span> 문항
              </p>
              <div className="space-y-1">
                {preview.slice(0, visibleCount).map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2" style={{ background: '#F5F5F5', borderRadius: 4 }}>
                    <span className="px-1.5 py-0.5 font-medium shrink-0" style={{ background: '#E0E0E0', borderRadius: 3, color: '#616161' }}>
                      {QUIZ_TYPES[row.type]?.label}
                    </span>
                    <span className="truncate flex-1" style={{ color: '#424242' }}>{row.text}</span>
                    <span className="shrink-0" style={{ color: '#9E9E9E' }}>{row.points}점</span>
                  </div>
                ))}
                {visibleCount < preview.length && (
                  <button
                    onClick={() => setVisibleCount(v => v + 20)}
                    className="w-full text-xs py-2 transition-colors"
                    style={{ color: '#6366F1', border: '1px solid #E0E7FF', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    더보기 ({preview.length - visibleCount}개 남음)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex justify-end gap-2 shrink-0" style={{ borderTop: '1px solid #EEEEEE' }}>
          <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
          <button
            onClick={() => preview && onImport(preview)}
            disabled={!preview}
            className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
            style={{ borderRadius: 4 }}
          >
            {preview ? `${preview.length}개 문항 추가` : '파일을 선택하세요'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 다른 은행에서 복사 모달 ───────────────────────────────────────────────────
export function CopyFromBankModal({ currentBankId, onClose, onCopy, title = '가져오기', initialCourse }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const currentBank = banks.find(b => b.id === currentBankId)
  // course가 없는 은행은 첫 번째 과목(CS301)에 속하는 것으로 간주
  const currentCourse = currentBank?.course || MOCK_COURSES[0]?.name || ''

  const [selectedCourse, setSelectedCourse] = useState(initialCourse || currentCourse)
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [courseSearch, setCourseSearch] = useState('')
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // 현재(대상) 은행 난이도 제한
  const destDifficulty = currentBank?.difficulty || ''

  // 선택된 과목의 은행 목록 (현재 은행 제외)
  // course 필드가 없는 은행은 현재 과목(currentCourse)에 속하는 것으로 처리
  const courseBanks = banks.filter(b =>
    b.id !== currentBankId &&
    (b.course === selectedCourse || (!b.course && selectedCourse === currentCourse))
  )
  const selectedBank = banks.find(b => b.id === selectedBankId)
  const bankQuestions = selectedBankId ? getBankQuestions(selectedBankId) : []

  const filtered = bankQuestions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  })

  const isSelectable = (q) => !destDifficulty || q.difficulty === destDifficulty

  const selectableFiltered = filtered.filter(isSelectable)
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(q => selectedIds.includes(q.id))
  const someFilteredSelected = selectableFiltered.some(q => selectedIds.includes(q.id)) && !allFilteredSelected

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableFiltered.find(q => q.id === id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableFiltered.map(q => q.id)])])
    }
  }

  const toggleSelect = (id, q) => {
    if (!isSelectable(q)) return
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // selectedIds 순서 유지
  const selectedQuestions = selectedIds.map(id => bankQuestions.find(q => q.id === id)).filter(Boolean)

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    setDragOverIndex(null)
    if (from === null || from === index) return
    setSelectedIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = null
  }

  const handleCopy = () => {
    onCopy(selectedQuestions, selectedBank)
  }

  const resetFilters = () => {
    setFilterType('all')
    setFilterDifficulty('all')
  }

  const handleCourseChange = (course) => {
    setSelectedCourse(course)
    setSelectedBankId(null)
    setSelectedIds([])
    resetFilters()
  }

  const availableCourses = MOCK_COURSES.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-3xl bg-white flex flex-col"
        style={{ maxHeight: '85vh', borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div>
            <div className="flex items-center gap-2">
              {selectedBankId && (
                <button
                  onClick={() => { setSelectedBankId(null); setSelectedIds([]); resetFilters() }}
                  className="p-0.5 transition-colors"
                  style={{ color: '#9E9E9E', borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
                >
                  <ChevronLeft size={15} />
                </button>
              )}
              <h3 className="font-semibold text-sm" style={{ color: '#222222' }}>
                {selectedBank ? selectedBank.name : title}
              </h3>
            </div>
            {selectedBank && (
              <p className="text-xs mt-0.5" style={{ color: '#BDBDBD' }}>
                {selectedCourse} › {selectedBank.name}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* 본문: 좌측 과목 패널 + 우측 콘텐츠 */}
        <div className="flex flex-1 min-h-0">
          {/* 좌측 과목 목록 */}
          <div className="shrink-0 flex flex-col" style={{ width: 168, borderRight: '1px solid #EEEEEE' }}>
            <div className="p-2 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#BDBDBD' }} />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="과목 검색"
                  className="w-full text-xs pl-7 pr-2 py-1.5 focus:outline-none"
                  style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
            {availableCourses.map(c => {
              const isCurrent = c.name === currentCourse
              const isSelected = c.name === selectedCourse
              const bankCount = banks.filter(b =>
                b.course === c.name || (!b.course && c.name === currentCourse)
              ).length
              return (
                <button
                  key={c.id}
                  onClick={() => handleCourseChange(c.name)}
                  className="w-full text-left px-3 py-3 leading-snug transition-colors"
                  style={{
                    color: isSelected ? '#6366F1' : '#424242',
                    background: isSelected ? '#EEF2FF' : 'transparent',
                    fontWeight: isSelected ? 600 : 400,
                    borderLeft: isSelected ? '2px solid #6366F1' : '2px solid transparent',
                  }}
                >
                  <span className="block text-xs">{c.name}</span>
                  <span className="text-xs" style={{ color: isSelected ? '#818CF8' : '#9E9E9E', fontWeight: 400 }}>
                    {isCurrent ? '현재 과목 · ' : ''}{bankCount}개 은행
                  </span>
                </button>
              )
            })}
            </div>
          </div>

          {/* 중앙: 은행 목록 or 문항 목록 */}
          {!selectedBankId ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {courseBanks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10">
                  <p className="text-sm text-center" style={{ color: '#9E9E9E' }}>이 과목에 문제은행이 없습니다</p>
                </div>
              ) : (
                courseBanks.map(b => {
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
                      <span className="text-sm font-medium" style={{ color: '#222222' }}>{b.name}</span>
                      <span className="text-xs" style={{ color: '#9E9E9E' }}>총 {count}개 문항</span>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 min-w-0">
              {/* 문항 목록 */}
              <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid #EEEEEE' }}>
                {/* 필터 */}
                <div className="px-3 pt-2.5 pb-2 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
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
                {/* 난이도 제한 배너 */}
                {destDifficulty && (
                  <div className="px-3 py-1.5 shrink-0 text-xs flex items-center gap-1.5" style={{ background: '#FFFBEB', color: '#B45309', borderBottom: '1px solid #FDE68A' }}>
                    <AlertCircle size={12} className="shrink-0" />
                    난이도 '{destDifficulty === 'high' ? '상' : destDifficulty === 'medium' ? '중' : '하'}' 문제은행 — 해당 난이도 문항만 선택 가능
                  </div>
                )}
                {/* 전체선택 + 카운트 */}
                {filtered.length > 0 && (
                  <div className="px-3 py-1.5 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #F5F5F5' }}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={el => { if (el) el.indeterminate = someFilteredSelected }}
                        onChange={toggleSelectAll}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs font-medium" style={{ color: '#616161' }}>
                        {allFilteredSelected ? '전체 해제' : '전체선택'}
                      </span>
                    </label>
                    <span className="text-xs" style={{ color: selectedIds.length > 0 ? '#6366F1' : '#9E9E9E' }}>
                      {selectedIds.length > 0 ? `${selectedIds.length}개 선택` : `총 ${filtered.length}개`}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filtered.map(q => {
                    const selected = selectedIds.includes(q.id)
                    const selectable = isSelectable(q)
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleSelect(q.id, q)}
                        className="flex items-start gap-3 p-3 transition-all"
                        style={{
                          border: selected ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                          borderRadius: 6,
                          background: selected ? '#EEF2FF' : selectable ? '#fff' : '#FAFAFA',
                          cursor: selectable ? 'pointer' : 'not-allowed',
                          opacity: selectable ? 1 : 0.45,
                        }}
                      >
                        <input type="checkbox" checked={selected} readOnly disabled={!selectable} className="mt-0.5 shrink-0 accent-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                              {QUIZ_TYPES[q.type]?.label}
                            </span>
                            {q.difficulty && DIFFICULTY_META[q.difficulty] && (
                              <span className="text-xs px-1.5 py-0.5" style={{ background: DIFFICULTY_META[q.difficulty].bg, color: DIFFICULTY_META[q.difficulty].color, borderRadius: 4 }}>
                                {DIFFICULTY_META[q.difficulty].label}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                          </div>
                          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>검색 결과가 없습니다</p>
                  )}
                </div>
              </div>

              {/* 우측: 선택된 문항 (드래그 정렬) */}
              <div className="flex flex-col shrink-0" style={{ width: 220 }}>
                <div className="px-3 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
                  <p className="text-xs font-semibold" style={{ color: '#616161' }}>선택된 문항</p>
                  {selectedIds.length > 0 && (
                    <span className="text-xs" style={{ color: '#9E9E9E' }}>{selectedIds.length}개</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {selectedQuestions.length === 0 ? (
                    <p className="py-6 text-center text-xs" style={{ color: '#BDBDBD' }}>선택된 문항이 없습니다</p>
                  ) : (
                    selectedQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(index)}
                        className="flex items-start gap-1.5 p-2"
                        style={{
                          background: '#FAFAFA',
                          borderRadius: 6,
                          cursor: 'grab',
                          borderTop: dragOverIndex === index ? '2px solid #6366F1' : '2px solid transparent',
                        }}
                      >
                        <GripVertical size={13} className="shrink-0 mt-0.5" style={{ color: '#BDBDBD' }} />
                        <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                        <button
                          onClick={() => toggleSelect(q.id)}
                          className="shrink-0 mt-0.5 transition-colors"
                          style={{ color: '#BDBDBD' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF2B2A'}
                          onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-4 py-3 flex items-center justify-between gap-4 shrink-0" style={{ borderTop: '1px solid #EEEEEE' }}>
          <p className="text-xs" style={{ color: '#9E9E9E' }}>
            {selectedIds.length > 0
              ? <><span style={{ color: '#6366F1', fontWeight: 600 }}>{selectedIds.length}개</span> 선택됨</>
              : selectedBankId ? '복사할 문항을 선택하세요' : ''
            }
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
            <button
              onClick={handleCopy}
              disabled={selectedIds.length === 0}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
              style={{ borderRadius: 4 }}
            >
              {selectedIds.length > 0 ? `${selectedIds.length}개 복사하기` : '문항을 선택하세요'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
