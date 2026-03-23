import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Plus, Search, X, GripVertical, Trash2, ChevronDown, ChevronUp,
  BookOpen, Clock, Users, Settings2, CheckSquare
} from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'

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
  bank: ['DB 기초', 'SQL 심화', '설계 원칙', '트랜잭션'][i % 4],
}))

export default function QuizEdit() {
  const { id } = useParams()
  const [showBankModal, setShowBankModal] = useState(false)
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

  const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id))

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: '중간고사 - 데이터베이스 설계 및 SQL' },
      { label: '편집' },
    ]}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg font-bold text-white">퀴즈 편집</h1>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            저장 및 발행
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* 문항 구성 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-200">문항 구성</h2>
                <p className="text-xs text-slate-500 mt-0.5">{questions.length}문항 · 총 {totalPoints}점</p>
              </div>
              <button
                onClick={() => setShowBankModal(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                <BookOpen size={13} />
                문제은행에서 추가
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-10 text-center">
                <p className="text-sm text-slate-500">문제은행에서 문항을 추가하거나 직접 작성하세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2 bg-[#1a1d27] border border-slate-800 rounded-xl p-3 group hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <GripVertical size={14} className="text-slate-600 cursor-grab" />
                      <span className="text-xs font-bold text-slate-500 w-5 text-center">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${QUIZ_TYPES[q.type]?.color || 'bg-slate-500/20 text-slate-400'}`}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs text-slate-500">{q.points}점</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{q.text}</p>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="shrink-0 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 설정 사이드바 */}
          <div className="space-y-4">
            <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Settings2 size={14} className="text-slate-400" />
                퀴즈 설정
              </h3>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">응시 시간 제한</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    className="w-20 bg-slate-800 border border-slate-700 text-sm text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 text-center"
                  />
                  <span className="text-xs text-slate-400">분</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">최대 응시 횟수</label>
                <select
                  value={allowAttempts}
                  onChange={e => setAllowAttempts(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-300 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1회</option>
                  <option value={2}>2회</option>
                  <option value={3}>3회</option>
                  <option value={-1}>무제한</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">채점 방식 (복수 응시 시)</label>
                <select className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-300 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500">
                  <option>최고 점수 유지</option>
                  <option>최신 점수 유지</option>
                  <option>평균 점수</option>
                </select>
              </div>

              <hr className="border-slate-800" />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-indigo-500" />
                <span className="text-xs text-slate-300">선택지 무작위 배열</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-indigo-500" />
                <span className="text-xs text-slate-300">문항 순서 무작위</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-600 bg-slate-800 text-indigo-500" />
                <span className="text-xs text-slate-300">제출 후 정답 공개</span>
              </label>
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
    </Layout>
  )
}

// ── 문제은행 모달 (무한 스크롤) ───────────────
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl bg-[#1a1d27] border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">문제은행</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
          </div>
          {/* 검색 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
              placeholder="문제 내용 검색..."
              className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          {/* 필터 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select
              value={filterBank}
              onChange={e => setFilterBank(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1.5 rounded-lg focus:outline-none shrink-0"
            >
              {banks.map(b => <option key={b} value={b}>{b === 'all' ? '모든 문제은행' : b}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1.5 rounded-lg focus:outline-none shrink-0"
            >
              <option value="all">모든 유형</option>
              {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 shrink-0 ml-auto">{filtered.length}개</span>
          </div>
        </div>

        {/* 문항 리스트 (무한 스크롤) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2" onScroll={handleScroll}>
          {visible.map(q => {
            const isAdded = added.includes(q.id)
            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  isAdded ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${QUIZ_TYPES[q.type]?.color}`}>
                      {QUIZ_TYPES[q.type]?.label}
                    </span>
                    <span className="text-xs text-slate-500">{q.bank}</span>
                    <span className="text-xs text-slate-500">{q.points}점</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{q.text}</p>
                </div>
                <button
                  onClick={() => !isAdded && onAdd(q)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isAdded
                      ? 'bg-indigo-500/20 text-indigo-400 cursor-default'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {isAdded ? '추가됨' : '추가'}
                </button>
              </div>
            )
          })}

          {hasMore && (
            <div className="py-4 text-center text-xs text-slate-500">스크롤하면 더 불러옵니다...</div>
          )}
          {!hasMore && filtered.length > 0 && (
            <div className="py-4 text-center text-xs text-slate-600">모든 문항을 불러왔습니다</div>
          )}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  )
}
