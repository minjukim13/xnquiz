import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, FolderInput, FolderOutput, Search, X, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/QuestionBankContext'
import { QUIZ_TYPES, MOCK_COURSES } from '../data/mockData'
import { DropdownSelect } from '../components/DropdownSelect'

const CURRENT_COURSE = 'CS301 데이터베이스'

const DIFFICULTY_META = {
  high:   { label: '상', color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: '중', color: '#D97706', bg: '#FFFBEB' },
  low:    { label: '하', color: '#16A34A', bg: '#F0FDF4' },
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
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 xl:px-16 py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>문제은행</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 transition-colors"
              style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FolderInput size={14} />
              가져오기
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 transition-colors"
              style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FolderOutput size={14} />
              내보내기
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition-colors"
              style={{ borderRadius: 4 }}
            >
              <Plus size={15} />
              새 문제은행
            </button>
          </div>
        </div>

        {/* 은행 카드 그리드 */}
        <p className="text-sm mb-3" style={{ color: '#9E9E9E' }}>
          은행 <span className="font-semibold" style={{ color: '#424242' }}>{banks.length}</span>개
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const qCount = getQuestionCount(bank.id)
            const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
            return (
              <div
                key={bank.id}
                onClick={() => navigate(`/question-banks/${bank.id}`)}
                className="bg-white p-5 cursor-pointer transition-all"
                style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E0E0E0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      background: bank.difficulty ? DIFFICULTY_META[bank.difficulty]?.bg : '#F5F5F5',
                      color: bank.difficulty ? DIFFICULTY_META[bank.difficulty]?.color : '#9E9E9E',
                    }}
                  >
                    {diffLabel || '미지정'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setCopyTarget(bank) }}
                      className="p-1.5 transition-colors"
                      style={{ borderRadius: 4, color: '#BDBDBD' }}
                      title="복사본 만들기"
                      onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#EEF2FF' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#BDBDBD'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(bank) }}
                      className="p-1.5 transition-colors"
                      style={{ borderRadius: 4, color: '#BDBDBD' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#EF2B2A'; e.currentTarget.style.background = '#FFF5F5' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#BDBDBD'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-base mb-1" style={{ color: '#222222' }}>{bank.name}</h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#9E9E9E' }}>
                  <span>{qCount}개 문항</span>
                </div>
                <p className="text-xs mt-2" style={{ color: '#BDBDBD' }}>최종 수정 {bank.updatedAt}</p>
              </div>
            )
          })}

          {/* 추가 카드 */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px]"
            style={{ border: '2px dashed #E0E0E0', borderRadius: 8, color: '#BDBDBD' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#BDBDBD' }}
          >
            <Plus size={20} />
            <span className="text-sm font-medium">새 문제은행 추가</span>
          </button>
        </div>

        {/* 빈 상태 */}
        {banks.length === 0 && (
          <div className="mt-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3" style={{ color: '#E0E0E0' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#9E9E9E' }}>문제은행이 없습니다</p>
            <p className="text-xs mb-4" style={{ color: '#BDBDBD' }}>새 문제은행을 만들어 문항을 관리하세요</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
              style={{ borderRadius: 4 }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white p-6 w-full max-w-sm"
            style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-1.5" style={{ color: '#222222' }}>문제은행 삭제</h3>
            <p className="text-sm mb-1" style={{ color: '#424242' }}>
              <span style={{ fontWeight: 600 }}>{deleteTarget.name}</span>을(를) 삭제할까요?
            </p>
            <p className="text-xs mb-5" style={{ color: '#9E9E9E' }}>
              은행에 포함된 문항 {getQuestionCount(deleteTarget.id)}개가 함께 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm px-4 py-2"
                style={{ color: '#616161' }}
              >
                취소
              </button>
              <button
                onClick={() => { deleteBank(deleteTarget.id); setDeleteTarget(null) }}
                className="text-sm font-medium px-4 py-2 text-white transition-colors"
                style={{ background: '#EF2B2A', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#C62828'}
                onMouseLeave={e => e.currentTarget.style.background = '#EF2B2A'}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {copyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCopyTarget(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white p-6 w-full max-w-sm"
            style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-1.5" style={{ color: '#222222' }}>문제은행 복사</h3>
            <p className="text-sm mb-1" style={{ color: '#424242' }}>
              <span style={{ fontWeight: 600 }}>{copyTarget.name}</span>의 복사본을 생성할까요?
            </p>
            <p className="text-xs mb-5" style={{ color: '#9E9E9E' }}>
              문항 {getQuestionCount(copyTarget.id)}개가 포함된 "{copyTarget.name}-사본" 문제은행이 생성됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCopyTarget(null)}
                className="text-sm px-4 py-2"
                style={{ color: '#616161' }}
              >
                취소
              </button>
              <button
                onClick={() => { executeCopyBank(copyTarget); setCopyTarget(null) }}
                className="text-sm font-medium px-4 py-2 text-white transition-colors"
                style={{ background: '#6366f1', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
              >
                복사
              </button>
            </div>
          </div>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white p-6 w-full max-w-sm"
        style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold mb-4" style={{ color: '#222222' }}>새 문제은행 만들기</h3>
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1" style={{ color: '#616161' }}>이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim(), difficulty)}
            placeholder="문제은행 이름 (예: 기말고사 문제은행)"
            autoFocus
            className="w-full text-sm px-3 py-2 focus:outline-none focus:border-indigo-400"
            style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
          />
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium block mb-1.5" style={{ color: '#616161' }}>난이도</label>
          <div className="flex gap-2">
            {diffOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className="flex-1 text-xs py-1.5 font-medium transition-all"
                style={{
                  border: difficulty === opt.value ? '1.5px solid #6366f1' : '1px solid #E0E0E0',
                  borderRadius: 4,
                  background: difficulty === opt.value ? '#EEF2FF' : 'transparent',
                  color: difficulty === opt.value ? '#4338CA'
                    : opt.value === 'high' ? '#DC2626'
                    : opt.value === 'medium' ? '#D97706'
                    : opt.value === 'low' ? '#16A34A'
                    : '#616161',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {difficulty && (
            <p className="text-xs mt-1.5" style={{ color: '#9E9E9E' }}>
              난이도 '{DIFF_LABEL[difficulty]}'인 문항만 추가할 수 있습니다
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
          <button
            onClick={() => name.trim() && onAdd(name.trim(), difficulty)}
            disabled={!name.trim()}
            className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            style={{ borderRadius: 4 }}
          >
            만들기
          </button>
        </div>
      </div>
    </div>
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
  const [newBankDifficulty, setNewBankDifficulty] = useState(null) // null = auto
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const targetBank = targetBankId && targetBankId !== '__new__' ? banks.find(b => b.id === targetBankId) : null
  const targetDifficulty = targetBank?.difficulty || ''

  // 같은 과목 내 다른 은행도 타겟 가능, 소스 은행 자신만 제외
  const courseBanks = banks.filter(b => b.course === targetCourse && !selectedSourceIds.includes(b.id))

  // 소스 문제은행들의 문항 (sourceBankName 첨부)
  const sourceQuestions = useMemo(() => {
    return selectedSourceIds.flatMap(bankId => {
      const bankName = banks.find(b => b.id === bankId)?.name || ''
      return getBankQuestions(bankId).map(q => ({ ...q, _sourceBankName: bankName }))
    })
  }, [selectedSourceIds, banks, getBankQuestions])

  // 필터 적용
  const filtered = useMemo(() => sourceQuestions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  }), [sourceQuestions, filterType, filterDifficulty])

  // 타겟 난이도 제한
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

  // 새 은행 auto-difficulty: 모두 같은 난이도 → 해당 값, 그 외 → ''
  const autoDifficulty = useMemo(() => {
    if (selectedQuestions.length === 0) return ''
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    return diffs.length === 1 ? diffs[0] : ''
  }, [selectedQuestions])

  // 수동 변경 허용 범위
  const allowedDifficulties = useMemo(() => {
    if (selectedQuestions.length === 0) return ['']
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    if (diffs.length === 1 && diffs[0] !== '') return [diffs[0], ''] // 상→미지정 가능
    if (diffs.length === 1 && diffs[0] === '') return ['', 'high', 'medium', 'low'] // 미지정만→아무거나
    return [''] // 혼합→미지정 고정
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
    // 타겟이 소스로 선택됐으면 타겟 해제
    if (!isChecked && bankId === targetBankId) setTargetBankId(null)
  }

  const canSubmit = selectedQuestions.length > 0 &&
    (targetBankId === '__new__' ? newBankName.trim() !== '' : targetBankId !== null)

  const availableCourses = useMemo(() =>
    MOCK_COURSES.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courseSearch]
  )

  // 과목별 은행 그룹
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '85vh', borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="font-semibold" style={{ color: '#222222' }}>문제은행 내보내기</h3>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* 본문: 3컬럼 */}
        <div className="flex flex-1 min-h-0">

          {/* 1열: 소스 문제은행 선택 (상단) + 대상 문제은행 (하단) */}
          <div className="flex flex-col shrink-0" style={{ width: 200, borderRight: '1px solid #EEEEEE' }}>
            {/* 소스 */}
            <div className="flex flex-col" style={{ flex: '0 0 50%', borderBottom: '1px solid #EEEEEE', overflow: 'hidden' }}>
              <div className="px-3 pt-2.5 pb-1.5 shrink-0">
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E' }}>소스 문제은행</p>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#BDBDBD' }} />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="과목/은행 검색"
                    className="w-full text-xs pl-6 pr-2 py-1.5 focus:outline-none"
                    style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {availableCourses.map(c => {
                  const list = (courseGroups[c.name] || [])
                  if (list.length === 0) return null
                  return (
                    <div key={c.id}>
                      <p className="px-3 py-1 text-xs font-medium truncate" style={{ color: '#9E9E9E', background: '#FAFAFA' }}>{c.name}</p>
                      {list.map(b => {
                        const isChecked = selectedSourceIds.includes(b.id)
                        return (
                          <label
                            key={b.id}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors"
                            style={{ background: isChecked ? '#EEF2FF' : 'transparent', color: isChecked ? '#4338CA' : '#424242' }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleSourceToggle(b.id)}
                              className="accent-indigo-600 shrink-0"
                            />
                            <span className="truncate flex-1">{b.name}</span>
                            {b.difficulty && (
                              <span className="shrink-0 text-xs" style={{ color: DIFFICULTY_META[b.difficulty]?.color }}>
                                {DIFF_LABEL[b.difficulty]}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 대상 */}
            <div className="flex flex-col" style={{ flex: '0 0 50%', overflow: 'hidden' }}>
              <p className="px-3 pt-2.5 pb-1 text-xs font-semibold shrink-0" style={{ color: '#9E9E9E' }}>대상 문제은행</p>
              {/* 과목 선택 */}
              <div className="px-2 pb-1 shrink-0">
                <select
                  value={targetCourse}
                  onChange={e => handleTargetCourseChange(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 focus:outline-none"
                  style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#424242', background: '#fff' }}
                >
                  {MOCK_COURSES.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* 새 문제은행 */}
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
                  <>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={e => setNewBankName(e.target.value)}
                      placeholder="이름 입력"
                      autoFocus
                      className="w-full text-xs px-2 py-1.5 focus:outline-none"
                      style={{
                        border: newBankName.trim() ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                        borderRadius: 4,
                        color: '#222222',
                      }}
                    />
                    {selectedQuestions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>난이도</span>
                        {['', 'high', 'medium', 'low'].map(d => {
                          const isAllowed = allowedDifficulties.includes(d)
                          const isActive = effectiveNewDifficulty === d
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={!isAllowed}
                              onClick={() => setNewBankDifficulty(d)}
                              className="flex-1 text-xs py-1 whitespace-nowrap transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{
                                border: isActive ? '1.5px solid #6366f1' : '1px solid #E0E0E0',
                                borderRadius: 3,
                                background: isActive ? '#EEF2FF' : 'transparent',
                                color: isActive ? '#4338CA'
                                  : d === 'high' ? '#DC2626'
                                  : d === 'medium' ? '#D97706'
                                  : d === 'low' ? '#16A34A'
                                  : '#616161',
                                fontWeight: isActive ? 600 : 400,
                              }}
                            >
                              {DIFF_LABEL[d]}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* 기존 문제은행 */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {courseBanks.map(b => {
                  const isSelected = b.id === targetBankId
                  const diffLabel = b.difficulty ? DIFF_LABEL[b.difficulty] : ''
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
                        {diffLabel && <span className="shrink-0" style={{ color: DIFFICULTY_META[b.difficulty]?.color, fontWeight: 400 }}>{diffLabel}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 2열: 문항 체크리스트 */}
          <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid #EEEEEE' }}>
            {selectedSourceIds.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-center" style={{ color: '#9E9E9E' }}>좌측에서 소스 문제은행을 선택하세요</p>
              </div>
            ) : (
              <>
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
                    난이도 '{DIFF_LABEL[targetDifficulty]}' 문제은행 — 해당 난이도 문항만 선택 가능
                  </div>
                )}
                {/* 전체선택 */}
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
                    <span className="text-xs" style={{ color: selectedQuestionIds.length > 0 ? '#6366F1' : '#9E9E9E' }}>
                      {selectedQuestionIds.length > 0 ? `${selectedQuestionIds.length}개 선택` : `총 ${filtered.length}개`}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>해당하는 문항이 없습니다</p>
                  ) : (
                    filtered.map(q => {
                      const selected = selectedQuestionIds.includes(q.id)
                      const selectable = isSelectable(q)
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggle(q)}
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
                          <span
                            className="text-xs px-1.5 py-0.5 font-medium shrink-0 mt-0.5"
                            style={{
                              background: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].bg : '#F5F5F5',
                              color: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].color : '#9E9E9E',
                              borderRadius: 4,
                            }}
                          >
                            {q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].label : '미지정'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                                {QUIZ_TYPES[q.type]?.label}
                              </span>
                              <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                              {q._sourceBankName && (
                                <span className="text-xs" style={{ color: '#BDBDBD' }}>{q._sourceBankName}</span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3열: 선택된 문항 */}
          <div className="flex flex-col shrink-0" style={{ width: 220 }}>
            <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <p className="text-xs font-semibold" style={{ color: '#616161' }}>
                선택된 문항
                <span className="ml-1.5 font-normal" style={{ color: '#9E9E9E' }}>{selectedQuestions.length}개</span>
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
                    <span
                      className="text-xs px-1 py-0.5 font-medium shrink-0"
                      style={{
                        background: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].bg : '#F5F5F5',
                        color: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].color : '#9E9E9E',
                        borderRadius: 3, fontSize: 10,
                      }}
                    >
                      {q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].label : '미지정'}
                    </span>
                    <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                    <button
                      onClick={() => setSelectedQuestionIds(prev => prev.filter(id => id !== q.id))}
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
        <div className="px-4 py-3 shrink-0 flex items-center justify-end gap-2" style={{ borderTop: '1px solid #EEEEEE' }}>
          <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
          <button
            onClick={() => onExport(selectedQuestions, targetCourse, targetBankId, newBankName.trim(), effectiveNewDifficulty)}
            disabled={!canSubmit}
            className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            style={{ borderRadius: 4 }}
          >
            {selectedQuestions.length}개 내보내기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 가져오기 모달 (다중 은행 선택) ───────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const { banks, getBankQuestions } = useQuestionBank()

  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [targetMode, setTargetMode] = useState('new') // 'new' | 'existing'
  const [targetBankId, setTargetBankId] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [manualDifficulty, setManualDifficulty] = useState(null) // null = auto
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

  // auto-difficulty
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

  // 기존 은행 타겟 — 소스 제외, 현재 과목
  const existingTargetBanks = banks.filter(b => b.course === CURRENT_COURSE && !selectedSourceIds.includes(b.id))
  const targetBank = targetMode === 'existing' && targetBankId ? banks.find(b => b.id === targetBankId) : null
  const targetDifficulty = targetBank?.difficulty || ''

  // 기존 은행 타겟 시 난이도 제한
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

  // 자동 은행 이름 — 소스 1개 최초 선택 시
  const prevSourceLen = useRef(0)
  if (selectedSourceIds.length === 1 && prevSourceLen.current === 0 && !newBankName) {
    const srcBank = banks.find(b => b.id === selectedSourceIds[0])
    if (srcBank) setTimeout(() => setNewBankName(`${srcBank.name}-사본`), 0)
  }
  prevSourceLen.current = selectedSourceIds.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '85vh', minHeight: 500, borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="font-semibold" style={{ color: '#222222' }}>가져오기</h3>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* 본문: 3컬럼 */}
        <div className="flex flex-1 min-h-0">

          {/* 1열: 소스 은행 선택 */}
          <div className="flex flex-col shrink-0" style={{ width: 200, borderRight: '1px solid #EEEEEE' }}>
            <div className="px-3 pt-2.5 pb-1.5 shrink-0">
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E' }}>소스 문제은행</p>
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#BDBDBD' }} />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="과목/은행 검색"
                  className="w-full text-xs pl-6 pr-2 py-1.5 focus:outline-none"
                  style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableCourses.map(c => {
                const list = (courseGroups[c.name] || [])
                if (list.length === 0) return null
                return (
                  <div key={c.id}>
                    <p className="px-3 py-1 text-xs font-medium truncate" style={{ color: '#9E9E9E', background: '#FAFAFA' }}>{c.name}</p>
                    {list.map(b => {
                      const isChecked = selectedSourceIds.includes(b.id)
                      return (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors"
                          style={{ background: isChecked ? '#EEF2FF' : 'transparent', color: isChecked ? '#4338CA' : '#424242' }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSourceToggle(b.id)}
                            className="accent-indigo-600 shrink-0"
                          />
                          <span className="truncate flex-1">{b.name}</span>
                          {b.difficulty && (
                            <span className="shrink-0 text-xs" style={{ color: DIFFICULTY_META[b.difficulty]?.color }}>
                              {DIFF_LABEL[b.difficulty]}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {/* 대상 은행 설정 */}
            <div className="shrink-0" style={{ borderTop: '1px solid #EEEEEE' }}>
              <div className="flex" style={{ borderBottom: '1px solid #EEEEEE' }}>
                <button
                  onClick={() => setTargetMode('new')}
                  className="flex-1 text-xs py-1.5 font-medium transition-colors"
                  style={{ color: targetMode === 'new' ? '#4338CA' : '#9E9E9E', borderBottom: targetMode === 'new' ? '2px solid #6366f1' : '2px solid transparent' }}
                >
                  새 은행
                </button>
                <button
                  onClick={() => setTargetMode('existing')}
                  className="flex-1 text-xs py-1.5 font-medium transition-colors"
                  style={{ color: targetMode === 'existing' ? '#4338CA' : '#9E9E9E', borderBottom: targetMode === 'existing' ? '2px solid #6366f1' : '2px solid transparent' }}
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
                    className="w-full text-xs px-2 py-1.5 focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                  />
                  {selectedQuestions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>난이도</span>
                      {['', 'high', 'medium', 'low'].map(d => {
                        const isAllowed = allowedDifficulties.includes(d)
                        const isActive = effectiveDifficulty === d
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={!isAllowed}
                            onClick={() => setManualDifficulty(d)}
                            className="flex-1 text-xs py-1 whitespace-nowrap transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              border: isActive ? '1.5px solid #6366f1' : '1px solid #E0E0E0',
                              borderRadius: 3,
                              background: isActive ? '#EEF2FF' : 'transparent',
                              color: isActive ? '#4338CA'
                                : d === 'high' ? '#DC2626'
                                : d === 'medium' ? '#D97706'
                                : d === 'low' ? '#16A34A'
                                : '#616161',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {DIFF_LABEL[d]}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 120 }}>
                  {existingTargetBanks.length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: '#BDBDBD' }}>선택 가능한 은행이 없습니다</p>
                  ) : (
                    existingTargetBanks.map(b => {
                      const isSelected = b.id === targetBankId
                      return (
                        <button
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
                            {b.difficulty && <span className="shrink-0" style={{ color: DIFFICULTY_META[b.difficulty]?.color, fontWeight: 400 }}>{DIFF_LABEL[b.difficulty]}</span>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2열: 문항 체크리스트 */}
          <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid #EEEEEE' }}>
            {selectedSourceIds.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-center" style={{ color: '#9E9E9E' }}>좌측에서 소스 문제은행을 선택하세요</p>
              </div>
            ) : (
              <>
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
                {targetDifficulty && (
                  <div className="px-3 py-1.5 shrink-0 text-xs flex items-center gap-1.5" style={{ background: '#FFFBEB', color: '#B45309', borderBottom: '1px solid #FDE68A' }}>
                    <AlertCircle size={12} className="shrink-0" />
                    난이도 '{DIFF_LABEL[targetDifficulty]}' 문제은행 — 해당 난이도 문항만 선택 가능
                  </div>
                )}
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
                    <span className="text-xs" style={{ color: selectedQuestionIds.length > 0 ? '#6366F1' : '#9E9E9E' }}>
                      {selectedQuestionIds.length > 0 ? `${selectedQuestionIds.length}개 선택` : `총 ${filtered.length}개`}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: '#9E9E9E' }}>해당하는 문항이 없습니다</p>
                  ) : (
                    filtered.map(q => {
                      const selected = selectedQuestionIds.includes(q.id)
                      const selectable = isSelectableForTarget(q)
                      return (
                        <div
                          key={q.id}
                          onClick={() => selectable && toggle(q)}
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
                          <span
                            className="text-xs px-1.5 py-0.5 font-medium shrink-0 mt-0.5"
                            style={{
                              background: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].bg : '#F5F5F5',
                              color: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].color : '#9E9E9E',
                              borderRadius: 4,
                            }}
                          >
                            {q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].label : '미지정'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                                {QUIZ_TYPES[q.type]?.label}
                              </span>
                              <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                              {q._sourceBankName && (
                                <span className="text-xs" style={{ color: '#BDBDBD' }}>{q._sourceBankName}</span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3열: 선택된 문항 */}
          <div className="flex flex-col shrink-0" style={{ width: 220 }}>
            <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <p className="text-xs font-semibold" style={{ color: '#616161' }}>
                선택된 문항
                <span className="ml-1.5 font-normal" style={{ color: '#9E9E9E' }}>{selectedQuestions.length}개</span>
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
                    <span
                      className="text-xs px-1 py-0.5 font-medium shrink-0"
                      style={{
                        background: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].bg : '#F5F5F5',
                        color: q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].color : '#9E9E9E',
                        borderRadius: 3, fontSize: 10,
                      }}
                    >
                      {q.difficulty && DIFFICULTY_META[q.difficulty] ? DIFFICULTY_META[q.difficulty].label : '미지정'}
                    </span>
                    <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                    <button
                      onClick={() => setSelectedQuestionIds(prev => prev.filter(id => id !== q.id))}
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

        {/* 인라인 토스트 */}
        {inlineToast && (
          <div className="px-4 py-2 shrink-0 text-xs flex items-center gap-1.5" style={{ background: '#FFFBEB', color: '#B45309', borderTop: '1px solid #FDE68A' }}>
            <AlertCircle size={12} className="shrink-0" />
            {inlineToast}
          </div>
        )}

        {/* 푸터 */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-end gap-2" style={{ borderTop: '1px solid #EEEEEE' }}>
          <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
          <button
            onClick={() => onImport(selectedQuestions, targetMode === 'new' ? newBankName.trim() : null, effectiveDifficulty, targetMode === 'existing' ? targetBankId : null)}
            disabled={!canSubmit}
            className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            style={{ borderRadius: 4 }}
          >
            {selectedQuestions.length}개 가져오기
          </button>
        </div>
      </div>
    </div>
  )
}
