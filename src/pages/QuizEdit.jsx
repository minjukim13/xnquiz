import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, X, GripVertical, Trash2, BookOpen, Settings2, ChevronDown, ChevronLeft } from 'lucide-react'
import Layout from '../components/Layout'
import AddQuestionModal from '../components/AddQuestionModal'
import { QUIZ_TYPES, mockQuizzes, getQuizQuestions } from '../data/mockData'
import { useQuestionBank } from '../context/QuestionBankContext'


export default function QuizEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questions, setQuestions] = useState(() => getQuizQuestions(quiz.id))
  const [timeLimit, setTimeLimit] = useState(quiz.timeLimit ?? 60)
  const [allowAttempts, setAllowAttempts] = useState(quiz.allowAttempts ?? 1)

  const addQuestion = (q) => {
    if (!questions.find(existing => existing.id === q.id)) {
      setQuestions(prev => [...prev, q])
    }
  }

  const addNewQuestion = (q) => {
    const newQ = { ...q, id: `new_q${Date.now()}` }
    setQuestions(prev => [...prev, newQ])
  }

  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  const handleSave = () => {
    const idx = mockQuizzes.findIndex(q => q.id === quiz.id)
    if (idx !== -1) {
      mockQuizzes[idx] = {
        ...mockQuizzes[idx],
        status: quiz.status === 'draft' ? 'open' : quiz.status,
        questions: questions.length,
        totalPoints,
      }
    }
    navigate('/')
  }

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: quiz.title },
      { label: '편집' },
    ]}>
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 xl:px-16 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg font-bold" style={{ color: '#222222' }}>퀴즈 편집</h1>
          <button onClick={handleSave} className="btn-primary text-sm">저장 및 발행</button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: '#222222' }}>문항 구성</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{questions.length}문항 · 총 {totalPoints}점</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
                  style={{ color: '#424242', border: '1px solid #E0E0E0' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <BookOpen size={13} />
                  문제은행에서 추가
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                >
                  <Plus size={13} />
                  직접 추가
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-12 text-center rounded" style={{ border: '2px dashed #E0E0E0', background: '#FAFAFA' }}>
                <p className="text-sm mb-3" style={{ color: '#BDBDBD' }}>아직 추가된 문항이 없습니다</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded transition-colors"
                    style={{ border: '1px solid #c7d2fe' }}
                  >
                    문제은행에서 추가
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                  >
                    직접 추가
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-2 bg-white p-3 group transition-all rounded"
                    style={{ border: '1px solid #E0E0E0' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#BDBDBD'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0E0'}
                  >
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <GripVertical size={14} className="cursor-grab" style={{ color: '#BDBDBD' }} />
                      <span className="text-xs font-bold w-5 text-center" style={{ color: '#9E9E9E' }}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#F5F5F5', color: '#616161' }}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                        {QUIZ_TYPES[q.type]?.autoGrade === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#B43200', background: '#FFF6F2' }}>수동채점</span>
                        )}
                        {q.bankName && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#0369a1', background: '#e0f2fe' }}>{q.bankName}</span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="shrink-0 transition-colors opacity-0 group-hover:opacity-100 p-1"
                      style={{ color: '#BDBDBD' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF2B2A'}
                      onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 설정 패널 */}
          <div className="space-y-4">
            <div className="card-flat p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#222222' }}>
                <Settings2 size={14} style={{ color: '#9E9E9E' }} />
                퀴즈 설정
              </h3>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#424242' }}>응시 시간 제한</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    min={1}
                    className="w-20 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 text-center"
                    style={{ border: '1px solid #E0E0E0', color: '#222222' }}
                  />
                  <span className="text-xs" style={{ color: '#9E9E9E' }}>분</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#424242' }}>최대 응시 횟수</label>
                <select
                  value={allowAttempts}
                  onChange={e => setAllowAttempts(e.target.value)}
                  className="w-full bg-white text-sm px-2 py-1.5 rounded focus:outline-none"
                  style={{ border: '1px solid #E0E0E0', color: '#424242' }}
                >
                  <option value={1}>1회</option>
                  <option value={2}>2회</option>
                  <option value={3}>3회</option>
                  <option value={-1}>무제한</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#424242' }}>채점 방식 (복수 응시 시)</label>
                <select className="w-full bg-white text-sm px-2 py-1.5 rounded focus:outline-none" style={{ border: '1px solid #E0E0E0', color: '#424242' }}>
                  <option>최고 점수 유지</option>
                  <option>최신 점수 유지</option>
                  <option>평균 점수</option>
                </select>
              </div>

              <hr style={{ borderColor: '#EEEEEE' }} />

              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-500" style={{ borderColor: '#E0E0E0' }} />
                  <span className="text-sm" style={{ color: '#424242' }}>선택지 무작위 배열</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-500" style={{ borderColor: '#E0E0E0' }} />
                  <span className="text-sm" style={{ color: '#424242' }}>문항 순서 무작위</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-indigo-500" style={{ borderColor: '#E0E0E0' }} />
                  <span className="text-sm" style={{ color: '#424242' }}>제출 후 정답 공개</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBankModal && (
        <QuestionBankModal
          onClose={() => setShowBankModal(false)}
          onAdd={addQuestion}
          added={questions.map(q => q.id)}
        />
      )}

      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={addNewQuestion}
        />
      )}
    </Layout>
  )
}

// 직접 문항 추가 모달
// ── 문제은행에서 추가 모달 (은행 선택 → 문항 선택 2단계) ────────────────────
function QuestionBankModal({ onClose, onAdd, added }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [visibleCount, setVisibleCount] = useState(15)

  const selectedBank = banks.find(b => b.id === selectedBankId)
  const bankQuestions = selectedBankId ? getBankQuestions(selectedBankId) : []

  const filtered = bankQuestions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    return matchSearch && matchType
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount(prev => prev + 10)
    }
  }, [hasMore])

  const handleBack = () => {
    setSelectedBankId(null)
    setSearch('')
    setFilterType('all')
    setVisibleCount(15)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-2xl bg-white flex flex-col"
        style={{ maxHeight: '85vh', border: '1px solid #E0E0E0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            {selectedBankId && (
              <button
                onClick={handleBack}
                className="p-1 transition-colors"
                style={{ color: '#9E9E9E', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold" style={{ color: '#222222' }}>
              {selectedBank ? selectedBank.name : '문제은행에서 추가'}
            </h3>
            {selectedBank && (
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{bankQuestions.length}개 문항</span>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* Step 1: 은행 선택 */}
        {!selectedBankId ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs mb-3" style={{ color: '#9E9E9E' }}>문제를 가져올 은행을 선택하세요</p>
            {banks.map(b => {
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
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} style={{ color: '#9E9E9E' }} />
                    <span className="text-sm font-medium" style={{ color: '#222222' }}>{b.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#9E9E9E' }}>{count}개 문항</span>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            {/* Step 2: 문항 선택 */}
            <div className="p-3 space-y-2" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
                  placeholder="문항 내용 검색..."
                  className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-400"
                  style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={e => { setFilterType(e.target.value); setVisibleCount(15) }}
                  className="text-xs bg-white px-2 py-1.5 focus:outline-none shrink-0"
                  style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#616161' }}
                >
                  <option value="all">모든 유형</option>
                  {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <span className="text-xs ml-auto" style={{ color: '#9E9E9E' }}>{filtered.length}개</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2" onScroll={handleScroll}>
              {visible.map(q => {
                const isAdded = added.includes(q.id)
                return (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 transition-all"
                    style={{
                      border: isAdded ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                      borderRadius: 6,
                      background: isAdded ? '#EEF2FF' : '#fff',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs px-1.5 py-0.5 font-medium"
                          style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}
                        >
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                    <button
                      onClick={() => !isAdded && onAdd({ ...q, bankName: selectedBank?.name })}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 transition-colors"
                      style={{
                        borderRadius: 4,
                        background: isAdded ? '#EEF2FF' : '#F5F5F5',
                        color: isAdded ? '#6366f1' : '#424242',
                        cursor: isAdded ? 'default' : 'pointer',
                      }}
                    >
                      {isAdded ? '추가됨' : '추가'}
                    </button>
                  </div>
                )
              })}
              {hasMore && <div className="py-4 text-center text-xs" style={{ color: '#9E9E9E' }}>스크롤하면 더 불러옵니다...</div>}
              {!hasMore && filtered.length > 0 && <div className="py-4 text-center text-xs" style={{ color: '#BDBDBD' }}>모든 문항을 불러왔습니다</div>}
              {filtered.length === 0 && <div className="py-10 text-center text-sm" style={{ color: '#BDBDBD' }}>검색 결과가 없습니다</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
