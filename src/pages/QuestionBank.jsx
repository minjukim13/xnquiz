import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Upload, Download, ChevronLeft, AlertTriangle, Copy } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'
import { useQuestionBank } from '../context/QuestionBankContext'

// ── CSV 유틸 ─────────────────────────────────────────────────────────────────
const CSV_TEMPLATE_HEADER = '유형,내용,배점,정답(선택)'
const CSV_TEMPLATE_ROWS = [
  'multiple_choice,SQL에서 테이블을 생성하는 명령어는?,5,CREATE TABLE',
  'true_false,PRIMARY KEY는 NULL 값을 허용한다.,5,거짓',
  'short_answer,DDL의 약자를 쓰시오.,5,Data Definition Language',
  'essay,트랜잭션의 ACID 속성에 대해 서술하시오.,15,',
].join('\n')

function downloadCsvTemplate() {
  const bom = '\uFEFF'
  const blob = new Blob([bom + CSV_TEMPLATE_HEADER + '\n' + CSV_TEMPLATE_ROWS], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '문항_업로드_템플릿.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { error: '데이터 행이 없습니다.' }
  const validTypes = Object.keys(QUIZ_TYPES)
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (cols.length < 3) return { error: `${i + 1}행: 컬럼 수가 부족합니다 (최소 3개 필요).` }
    const [type, text, pointsStr, answer = ''] = cols
    if (!validTypes.includes(type)) return { error: `${i + 1}행: 지원하지 않는 유형 "${type}"입니다.` }
    const points = parseInt(pointsStr, 10)
    if (isNaN(points) || points <= 0) return { error: `${i + 1}행: 배점이 유효하지 않습니다.` }
    if (!text) return { error: `${i + 1}행: 문항 내용이 비어있습니다.` }
    rows.push({ type, text, points, answer })
  }
  return { rows }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function QuestionBank() {
  const { bankId } = useParams()
  const navigate = useNavigate()
  const { banks, getBankQuestions, addQuestions, updateQuestion, deleteQuestion } = useQuestionBank()

  const bank = banks.find(b => b.id === bankId) ?? banks[0]
  const questions = bank ? getBankQuestions(bank.id) : []

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)

  const filtered = useMemo(() => questions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    return matchSearch && matchType
  }), [questions, search, filterType])

  const handleSaveEdit = (id, updated) => {
    updateQuestion(id, updated)
    setEditingId(null)
  }

  const handleDelete = (id) => {
    deleteQuestion(id)
  }

  const handleAddQuestion = (newQ) => {
    addQuestions([{ ...newQ, id: `q_${Date.now()}`, bankId: bank.id, usageCount: 0 }])
    setShowAddForm(false)
  }

  const handleCsvImport = (rows) => {
    const newQuestions = rows.map((row, i) => ({
      id: `q_csv_${Date.now()}_${i}`,
      text: row.text,
      type: row.type,
      points: row.points,
      bankId: bank.id,
      usageCount: 0,
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
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
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
            <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>{bank.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9E9E9E' }}>
              {questions.length}개 문항
              {bank.usedInQuizIds.length > 0 && (
                <span className="ml-2" style={{ color: '#6366f1' }}>
                  · {bank.usedInQuizIds.length}개 퀴즈에서 사용 중
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 transition-colors"
              style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Copy size={14} />
              <span className="hidden sm:block">다른 은행에서 복사</span>
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
              onClick={() => { setShowAddForm(true); setEditingId(null) }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition-colors"
              style={{ borderRadius: 4 }}
            >
              <Plus size={15} />
              문항 추가
            </button>
          </div>
        </div>

        {/* 동기화 정책 안내 */}
        <div
          className="flex items-start gap-2 p-3 mb-5 text-xs"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6 }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <span style={{ color: '#92400E' }}>
            문항을 변경하더라도 해당 문항을 사용해 이미 생성된 퀴즈에는 자동으로 업데이트되지 않습니다.
            필요 시 생성되어 있는 퀴즈에서 직접 수정해야 합니다.
          </span>
        </div>

        {/* 문항 추가 인라인 폼 */}
        {showAddForm && (
          <div className="mb-4">
            <QuestionForm
              onSave={handleAddQuestion}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* 필터 */}
        <div className="card-flat p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="문항 내용 검색..."
                className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-400"
                style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm bg-white px-3 py-2 focus:outline-none focus:border-indigo-400"
              style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#616161' }}
            >
              <option value="all">모든 유형</option>
              {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs mt-2" style={{ color: '#9E9E9E' }}>{filtered.length}개 문항</p>
        </div>

        {/* 문항 목록 */}
        <div className="card-flat overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm mb-1" style={{ color: '#9E9E9E' }}>
                {questions.length === 0 ? '아직 문항이 없습니다' : '검색 결과가 없습니다'}
              </p>
              {questions.length === 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-indigo-600 underline mt-1"
                >
                  첫 문항 추가하기
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((q, idx) => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  isEditing={editingId === q.id}
                  onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
                  onSave={(updated) => handleSaveEdit(q.id, updated)}
                  onDelete={() => handleDelete(q.id)}
                  isLast={idx === filtered.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <CsvUploadModal
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
    </Layout>
  )
}

// ── 문항 아이템 ───────────────────────────────────────────────────────────────
function QuestionItem({ question, isEditing, onEdit, onSave, onDelete, isLast }) {
  return (
    <div
      className="p-4 transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid #EEEEEE' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-xs px-1.5 py-0.5 font-medium"
              style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}
            >
              {QUIZ_TYPES[question.type]?.label}
            </span>
            <span className="text-xs" style={{ color: '#9E9E9E' }}>{question.points}점</span>
            {question.usageCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5"
                style={{ color: '#6366f1', background: '#EEF2FF', borderRadius: 4 }}
              >
                {question.usageCount}개 퀴즈에서 사용 중
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>{question.text}</p>
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
          />
        </div>
      )}
    </div>
  )
}

// ── 문항 추가/편집 폼 ─────────────────────────────────────────────────────────
function QuestionForm({ initial, onSave, onCancel }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [type, setType] = useState(initial?.type ?? 'multiple_choice')
  const [points, setPoints] = useState(initial?.points ?? 5)

  const handleSubmit = () => {
    if (!text.trim()) return
    onSave({ text: text.trim(), type, points: Number(points) })
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>문항 유형</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full bg-white text-sm px-2 py-1.5 focus:outline-none focus:border-indigo-400"
            style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#424242' }}
          >
            {Object.entries(QUIZ_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
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

// ── CSV 업로드 모달 ───────────────────────────────────────────────────────────
function CsvUploadModal({ onClose, onImport }) {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const result = parseCsv(text)
      if (result.error) {
        setStatus({ type: 'error', message: result.error })
        setPreview(null)
      } else {
        setStatus({ type: 'success', message: `${result.rows.length}개 문항을 인식했습니다.` })
        setPreview(result.rows)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-lg bg-white"
        style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="font-semibold" style={{ color: '#222222' }}>CSV 일괄 업로드</h3>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs" style={{ color: '#9E9E9E' }}>
            <span>형식: 유형, 내용, 배점, 정답(선택)</span>
            <button
              onClick={downloadCsvTemplate}
              className="flex items-center gap-1 text-indigo-600 underline"
            >
              <Download size={12} />
              템플릿 다운로드
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
            <p className="text-sm" style={{ color: '#9E9E9E' }}>CSV 파일을 클릭하여 선택</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {status && (
            <div
              className="flex items-center gap-2 p-3 text-xs"
              style={{
                background: status.type === 'error' ? '#FFF5F5' : '#F0FFF4',
                border: `1px solid ${status.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
                borderRadius: 6,
                color: status.type === 'error' ? '#DC2626' : '#166534',
              }}
            >
              {status.message}
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2" style={{ background: '#F5F5F5', borderRadius: 4 }}>
                  <span className="px-1.5 py-0.5 font-medium" style={{ background: '#E0E0E0', borderRadius: 3, color: '#616161' }}>
                    {QUIZ_TYPES[row.type]?.label}
                  </span>
                  <span className="truncate flex-1" style={{ color: '#424242' }}>{row.text}</span>
                  <span style={{ color: '#9E9E9E' }}>{row.points}점</span>
                </div>
              ))}
              {preview.length > 5 && (
                <p className="text-xs text-center" style={{ color: '#9E9E9E' }}>외 {preview.length - 5}개</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid #EEEEEE' }}>
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
function CopyFromBankModal({ currentBankId, onClose, onCopy }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const otherBanks = banks.filter(b => b.id !== currentBankId)
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const selectedBank = otherBanks.find(b => b.id === selectedBankId)
  const bankQuestions = selectedBankId ? getBankQuestions(selectedBankId) : []

  const filtered = bankQuestions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    return matchSearch && matchType
  })

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCopy = () => {
    const toCopy = bankQuestions.filter(q => selectedIds.includes(q.id))
    onCopy(toCopy)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-2xl bg-white flex flex-col"
        style={{ maxHeight: '85vh', borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            {selectedBankId && (
              <button
                onClick={() => { setSelectedBankId(null); setSelectedIds([]); setSearch(''); setFilterType('all') }}
                className="p-1 transition-colors"
                style={{ color: '#9E9E9E', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold" style={{ color: '#222222' }}>
              {selectedBank ? selectedBank.name : '다른 은행에서 복사'}
            </h3>
            {selectedBank && (
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{bankQuestions.length}개 문항</span>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* 은행 선택 */}
        {!selectedBankId ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {otherBanks.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>다른 문제은행이 없습니다</p>
            ) : (
              otherBanks.map(b => {
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
                    <span className="text-xs" style={{ color: '#9E9E9E' }}>{count}개 문항</span>
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <>
            {/* 검색/필터 */}
            <div className="p-3 space-y-2" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="문항 검색..."
                  className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none"
                  style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="text-xs bg-white px-2 py-1.5 focus:outline-none"
                  style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#616161' }}
                >
                  <option value="all">모든 유형</option>
                  {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <span className="text-xs ml-auto" style={{ color: '#9E9E9E' }}>
                  {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : `${filtered.length}개`}
                </span>
              </div>
            </div>

            {/* 문항 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.map(q => {
                const selected = selectedIds.includes(q.id)
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleSelect(q.id)}
                    className="flex items-start gap-3 p-3 cursor-pointer transition-all"
                    style={{
                      border: selected ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                      borderRadius: 6,
                      background: selected ? '#EEF2FF' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="mt-0.5 shrink-0 accent-indigo-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>검색 결과가 없습니다</p>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid #EEEEEE' }}>
              <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
              <button
                onClick={handleCopy}
                disabled={selectedIds.length === 0}
                className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
                style={{ borderRadius: 4 }}
              >
                {selectedIds.length > 0 ? `${selectedIds.length}개 복사` : '문항을 선택하세요'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
