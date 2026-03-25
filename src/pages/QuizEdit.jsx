import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, X, GripVertical, Trash2, BookOpen, Settings2, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES, mockQuizzes } from '../data/mockData'

const BANKS = ['DB 기초', 'SQL 심화', '설계 원칙', '트랜잭션']

const QUESTION_BANK = Array.from({ length: 60 }, (_, i) => ({
  id: `bank_q${i + 1}`,
  text: [
    'SQL SELECT 문의 기본 구조를 설명하시오.',
    '정규화의 목적과 단계를 서술하시오.',
    'JOIN의 종류와 각 특징을 설명하시오.',
    'PRIMARY KEY와 FOREIGN KEY의 차이점은?',
    'WHERE 절과 HAVING 절의 차이는?',
    '인덱스의 역할과 장단점을 설명하시오.',
    'ACID 속성이란 무엇인가?',
    '뷰(View)의 개념과 사용 목적은?',
    '서브쿼리와 JOIN의 성능 차이는?',
    'GROUP BY 절의 사용 방법을 예시와 함께 설명하시오.',
  ][i % 10] + (i > 9 ? ` (${Math.floor(i / 10) + 1})` : ''),
  type: Object.keys(QUIZ_TYPES)[i % Object.keys(QUIZ_TYPES).length],
  points: [3, 5, 8, 10, 15][i % 5],
  bank: BANKS[i % 4],
}))

const LIGHT_COLORS = {
  multiple_choice:         'bg-blue-50 text-blue-700',
  true_false:              'bg-purple-50 text-purple-700',
  multiple_answers:        'bg-indigo-50 text-indigo-700',
  short_answer:            'bg-amber-50 text-amber-700',
  essay:                   'bg-orange-50 text-orange-700',
  numerical:               'bg-teal-50 text-teal-700',
  matching:                'bg-pink-50 text-pink-700',
  fill_in_blank:           'bg-cyan-50 text-cyan-700',
  fill_in_multiple_blanks: 'bg-sky-50 text-sky-700',
  multiple_dropdowns:      'bg-violet-50 text-violet-700',
  ordering:                'bg-lime-50 text-lime-700',
  file_upload:             'bg-rose-50 text-rose-700',
}

export default function QuizEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questions, setQuestions] = useState([
    QUESTION_BANK[0], QUESTION_BANK[2], QUESTION_BANK[4],
  ])
  const [timeLimit, setTimeLimit] = useState(90)
  const [allowAttempts, setAllowAttempts] = useState(1)

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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg font-bold text-slate-900">퀴즈 편집</h1>
          <button onClick={handleSave} className="btn-primary text-sm">저장 및 발행</button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">문항 구성</h2>
                <p className="text-xs text-slate-400 mt-0.5">{questions.length}문항 · 총 {totalPoints}점</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <BookOpen size={13} />
                  문제은행에서 추가
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <Plus size={13} />
                  직접 추가
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50">
                <p className="text-sm text-slate-400 mb-3">아직 추가된 문항이 없습니다</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    문제은행에서 추가
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
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
                    className="flex items-start gap-2 bg-white border border-[#EAECF0] rounded-xl p-3 group hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all"
                  >
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <GripVertical size={14} className="text-slate-300 cursor-grab" />
                      <span className="text-xs font-bold text-slate-400 w-5 text-center">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${LIGHT_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs text-slate-400">{q.points}점</span>
                        {QUIZ_TYPES[q.type]?.autoGrade === false && (
                          <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">수동채점</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
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
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Settings2 size={14} className="text-slate-400" />
                퀴즈 설정
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">응시 시간 제한</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    min={1}
                    className="w-20 bg-white border border-slate-300 text-sm text-slate-800 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400 text-center"
                  />
                  <span className="text-xs text-slate-400">분</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">최대 응시 횟수</label>
                <select
                  value={allowAttempts}
                  onChange={e => setAllowAttempts(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
                >
                  <option value={1}>1회</option>
                  <option value={2}>2회</option>
                  <option value={3}>3회</option>
                  <option value={-1}>무제한</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">채점 방식 (복수 응시 시)</label>
                <select className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400">
                  <option>최고 점수 유지</option>
                  <option>최신 점수 유지</option>
                  <option>평균 점수</option>
                </select>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-500" />
                  <span className="text-sm text-slate-600">선택지 무작위 배열</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-500" />
                  <span className="text-sm text-slate-600">문항 순서 무작위</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-500" />
                  <span className="text-sm text-slate-600">제출 후 정답 공개</span>
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
function AddQuestionModal({ onClose, onAdd }) {
  const [step, setStep] = useState('type') // 'type' | 'form'
  const [selectedType, setSelectedType] = useState(null)
  const [form, setForm] = useState({ text: '', points: 5, correctAnswer: '' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleAdd = () => {
    onAdd({ type: selectedType, text: form.text, points: Number(form.points), correctAnswer: form.correctAnswer || null })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">문항 직접 추가</h3>
            {step === 'form' && selectedType && (
              <p className="text-xs text-slate-400 mt-0.5">{QUIZ_TYPES[selectedType]?.label}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {step === 'type' ? (
          <div className="p-4">
            <p className="text-sm text-slate-600 mb-4">추가할 문항 유형을 선택하세요</p>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {Object.entries(QUIZ_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedType(key); setStep('form') }}
                  className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all group"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${val.autoGrade === false ? 'bg-orange-400' : val.autoGrade === 'partial' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{val.label}</p>
                    <p className="text-xs text-slate-400">{val.autoGrade === false ? '수동채점' : val.autoGrade === 'partial' ? '부분자동' : '자동채점'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">문제 내용 <span className="text-red-500">*</span></label>
              <textarea
                value={form.text}
                onChange={e => set('text', e.target.value)}
                placeholder="문제를 입력하세요..."
                rows={3}
                className="w-full bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">배점</label>
                <input
                  type="number"
                  value={form.points}
                  onChange={e => set('points', e.target.value)}
                  min={1}
                  className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
              {QUIZ_TYPES[selectedType]?.autoGrade !== false && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">정답</label>
                  <input
                    type="text"
                    value={form.correctAnswer}
                    onChange={e => set('correctAnswer', e.target.value)}
                    placeholder="정답 입력"
                    className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between pt-1">
              <button
                onClick={() => setStep('type')}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← 유형 다시 선택
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">취소</button>
                <button
                  disabled={!form.text}
                  onClick={handleAdd}
                  className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 문제은행에서 추가 모달
function QuestionBankModal({ onClose, onAdd, added }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterBank, setFilterBank] = useState('all')
  const [visibleCount, setVisibleCount] = useState(15)

  const filtered = QUESTION_BANK.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    const matchBank = filterBank === 'all' || q.bank === filterBank
    return matchSearch && matchType && matchBank
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount(prev => prev + 10)
    }
  }, [hasMore])

  const banks = ['all', ...new Set(QUESTION_BANK.map(q => q.bank))]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">문제은행에서 추가</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
              placeholder="문제 내용 검색..."
              className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-800 placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select
              value={filterBank}
              onChange={e => setFilterBank(e.target.value)}
              className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg focus:outline-none shrink-0"
            >
              {banks.map(b => <option key={b} value={b}>{b === 'all' ? '모든 문제은행' : b}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg focus:outline-none shrink-0"
            >
              <option value="all">모든 유형</option>
              {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 shrink-0 ml-auto">{filtered.length}개</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2" onScroll={handleScroll}>
          {visible.map(q => {
            const isAdded = added.includes(q.id)
            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  isAdded ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${LIGHT_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                      {QUIZ_TYPES[q.type]?.label}
                    </span>
                    <span className="text-xs text-slate-400">{q.bank}</span>
                    <span className="text-xs text-slate-400">{q.points}점</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{q.text}</p>
                </div>
                <button
                  onClick={() => !isAdded && onAdd(q)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isAdded
                      ? 'bg-indigo-100 text-indigo-600 cursor-default'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isAdded ? '추가됨' : '추가'}
                </button>
              </div>
            )
          })}

          {hasMore && (
            <div className="py-4 text-center text-xs text-slate-400">스크롤하면 더 불러옵니다...</div>
          )}
          {!hasMore && filtered.length > 0 && (
            <div className="py-4 text-center text-xs text-slate-300">모든 문항을 불러왔습니다</div>
          )}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  )
}
