import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/QuestionBankContext'

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { banks, addBank, deleteBank, getBankQuestions } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

  return (
    <Layout>
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 xl:px-16 py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: '#9E9E9E' }}>CS301 데이터베이스</p>
            <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>문제은행</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9E9E9E' }}>{banks.length}개 은행</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
            style={{ borderRadius: 4 }}
          >
            <Plus size={15} />
            새 문제은행
          </button>
        </div>

        {/* 은행 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const qCount = getQuestionCount(bank.id)
            const quizCount = bank.usedInQuizIds.length
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
                    className="w-9 h-9 rounded flex items-center justify-center"
                    style={{ background: '#EEF2FF' }}
                  >
                    <BookOpen size={16} style={{ color: '#4338ca' }} />
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteBank(bank.id)
                    }}
                    className="p-1.5 transition-colors"
                    style={{ borderRadius: 4, color: '#BDBDBD' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#EF2B2A'
                      e.currentTarget.style.background = '#FFF5F5'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#BDBDBD'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="font-semibold text-base mb-1" style={{ color: '#222222' }}>
                  {bank.name}
                </h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#9E9E9E' }}>
                  <span>{qCount}개 문항</span>
                  <span style={{ color: '#E0E0E0' }}>|</span>
                  <span>{quizCount > 0 ? `${quizCount}개 퀴즈에서 사용 중` : '퀴즈 미사용'}</span>
                </div>
                <p className="text-xs mt-2" style={{ color: '#BDBDBD' }}>
                  최종 수정 {bank.updatedAt}
                </p>
              </div>
            )
          })}

          {/* 추가 카드 */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px]"
            style={{ border: '2px dashed #E0E0E0', borderRadius: 8, color: '#BDBDBD' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#6366f1'
              e.currentTarget.style.color = '#6366f1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E0E0E0'
              e.currentTarget.style.color = '#BDBDBD'
            }}
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
          onAdd={name => {
            addBank({
              id: `bank_custom_${Date.now()}`,
              name,
              updatedAt: new Date().toISOString().split('T')[0],
              usedInQuizIds: [],
            })
            setShowAddModal(false)
          }}
        />
      )}
    </Layout>
  )
}

function AddBankModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white p-6 w-full max-w-sm"
        style={{ borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold mb-4" style={{ color: '#222222' }}>새 문제은행 만들기</h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim())}
          placeholder="문제은행 이름 (예: 기말고사 문제은행)"
          autoFocus
          className="w-full text-sm px-3 py-2 mb-4 focus:outline-none focus:border-indigo-400"
          style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 transition-colors"
            style={{ color: '#616161' }}
          >
            취소
          </button>
          <button
            onClick={() => name.trim() && onAdd(name.trim())}
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
