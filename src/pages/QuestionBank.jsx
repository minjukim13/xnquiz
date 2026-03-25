import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X, Edit2, Trash2, Settings2, AlertTriangle } from 'lucide-react'
import Layout from '../components/Layout'
import { QUIZ_TYPES } from '../data/mockData'

const INITIAL_BANKS = ['DB 기초', 'SQL 심화', '설계 원칙', '트랜잭션']

const LIGHT_COLORS = {
  multiple_choice:         'bg-blue-50 text-blue-700 border-blue-200',
  true_false:              'bg-purple-50 text-purple-700 border-purple-200',
  multiple_answers:        'bg-indigo-50 text-indigo-700 border-indigo-200',
  short_answer:            'bg-amber-50 text-amber-700 border-amber-200',
  essay:                   'bg-orange-50 text-orange-700 border-orange-200',
  numerical:               'bg-teal-50 text-teal-700 border-teal-200',
  matching:                'bg-pink-50 text-pink-700 border-pink-200',
  fill_in_blank:           'bg-cyan-50 text-cyan-700 border-cyan-200',
  fill_in_multiple_blanks: 'bg-sky-50 text-sky-700 border-sky-200',
  multiple_dropdowns:      'bg-violet-50 text-violet-700 border-violet-200',
  ordering:                'bg-lime-50 text-lime-700 border-lime-200',
  file_upload:             'bg-rose-50 text-rose-700 border-rose-200',
}

// 문제은행 문항 데이터 (60개) — INITIAL_BANKS 기준으로 생성
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
  bank: INITIAL_BANKS[i % 4],
  usageCount: [0, 2, 5, 1, 3, 8, 0, 4][i % 8],
}))

export default function QuestionBank() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterBank, setFilterBank] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [banks, setBanks] = useState(INITIAL_BANKS)
  const [showManageBanks, setShowManageBanks] = useState(false)

  const filtered = useMemo(() => QUESTION_BANK.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    const matchBank = filterBank === 'all' || q.bank === filterBank
    return matchSearch && matchType && matchBank
  }), [search, filterType, filterBank])

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: '문제은행 관리' },
    ]}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-medium text-indigo-600 mb-1">CS301 데이터베이스</p>
            <h1 className="text-2xl font-bold text-gray-900">문제은행</h1>
            <p className="text-sm text-gray-400 mt-0.5">{QUESTION_BANK.length}개 문항 · {banks.length}개 은행</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowManageBanks(true)}
              className="flex items-center gap-2 text-slate-600 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Settings2 size={14} />
              <span className="hidden sm:block">문제은행 관리</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={15} />
              문항 추가
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="card-flat p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="문제 내용 검색..."
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-800 placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
            <select
              value={filterBank}
              onChange={e => setFilterBank(e.target.value)}
              className="text-sm bg-white border border-slate-300 text-slate-600 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
            >
              <option value="all">모든 은행</option>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm bg-white border border-slate-300 text-slate-600 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
            >
              <option value="all">모든 유형</option>
              {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 mt-2">{filtered.length}개 문항</p>
        </div>

        {/* 문항 목록 */}
        <div className="card-flat overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(q => (
                <QuestionBankItem
                  key={q.id}
                  question={q}
                  isEditing={editingId === q.id}
                  onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <AddQuestionModal
          onClose={() => setShowAddForm(false)}
          banks={banks}
        />
      )}

      {showManageBanks && (
        <ManageBanksModal
          banks={banks}
          setBanks={setBanks}
          onClose={() => setShowManageBanks(false)}
        />
      )}
    </Layout>
  )
}

function QuestionBankItem({ question, isEditing, onEdit }) {
  const colorClass = LIGHT_COLORS[question.type] || 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colorClass}`}>
              {QUIZ_TYPES[question.type]?.label}
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{question.bank}</span>
            <span className="text-xs text-slate-400">{question.points}점</span>
            {question.usageCount > 0 && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {question.usageCount}개 퀴즈에서 사용 중
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{question.text}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">문제 내용</label>
              <textarea
                defaultValue={question.text}
                rows={2}
                className="w-full bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">문항 유형</label>
                <select defaultValue={question.type} className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400">
                  {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">은행</label>
                <select defaultValue={question.bank} className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400">
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">배점</label>
                <input
                  type="number"
                  defaultValue={question.points}
                  min={1}
                  className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onEdit} className="text-xs text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">취소</button>
              <button className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddQuestionModal({ onClose, banks }) {
  const [form, setForm] = useState({ type: 'essay', bank: banks[0], points: 10, text: '' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">새 문항 추가</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">문항 유형</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-2 rounded-lg focus:outline-none focus:border-indigo-400">
                {Object.entries(QUIZ_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">은행</label>
              <select value={form.bank} onChange={e => set('bank', e.target.value)}
                className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-2 rounded-lg focus:outline-none focus:border-indigo-400">
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">배점</label>
              <input type="number" value={form.points} onChange={e => set('points', e.target.value)}
                min={1}
                className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-2 py-2 rounded-lg focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">문제 내용</label>
            <textarea
              value={form.text}
              onChange={e => set('text', e.target.value)}
              placeholder="문제를 입력하세요..."
              rows={4}
              className="w-full bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">취소</button>
            <button
              disabled={!form.text}
              className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManageBanksModal({ banks, setBanks, onClose }) {
  const [newBank, setNewBank] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAdd = () => {
    const trimmed = newBank.trim()
    if (!trimmed || banks.includes(trimmed)) return
    setBanks(prev => [...prev, trimmed])
    setNewBank('')
  }

  const handleEdit = (idx) => {
    setEditingIdx(idx)
    setEditValue(banks[idx])
  }

  const handleEditSave = (idx) => {
    const trimmed = editValue.trim()
    if (!trimmed || (banks.includes(trimmed) && trimmed !== banks[idx])) return
    setBanks(prev => prev.map((b, i) => i === idx ? trimmed : b))
    setEditingIdx(null)
  }

  const handleDelete = (idx) => {
    setBanks(prev => prev.filter((_, i) => i !== idx))
    setConfirmDelete(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">문제은행 관리</h3>
            <p className="text-xs text-slate-400 mt-0.5">교수자가 직접 문제은행을 생성하고 관리할 수 있습니다</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-3">
            <X size={18} />
          </button>
        </div>

        {/* 새 문제은행 추가 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newBank}
            onChange={e => setNewBank(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="새 문제은행 이름 입력"
            className="flex-1 bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={handleAdd}
            disabled={!newBank.trim() || banks.includes(newBank.trim())}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            추가
          </button>
        </div>

        {/* 기존 문제은행 목록 */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
          {banks.map((bank, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {editingIdx === idx ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEditSave(idx); if (e.key === 'Escape') setEditingIdx(null) }}
                    className="flex-1 bg-white border border-indigo-300 text-sm text-slate-800 px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                  <button onClick={() => handleEditSave(idx)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors">저장</button>
                  <button onClick={() => setEditingIdx(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg transition-colors">취소</button>
                </>
              ) : confirmDelete === idx ? (
                <>
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                  <span className="flex-1 text-xs text-slate-600">"{bank}" 삭제하시겠습니까?</span>
                  <button onClick={() => handleDelete(idx)} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors">삭제</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg transition-colors">취소</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-700 font-medium">{bank}</span>
                  <button onClick={() => handleEdit(idx)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium">
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
