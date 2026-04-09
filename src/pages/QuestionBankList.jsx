import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, FolderInput, Share2, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/QuestionBankContext'
import { CopyFromBankModal, GroupExportModal } from './QuestionBank'

const CURRENT_COURSE = 'CS301 데이터베이스'

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { banks, addBank, deleteBank, getBankQuestions, addQuestions } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, bankId) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

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
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 transition-colors"
              style={{ color: '#424242', border: '1px solid #E0E0E0', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Share2 size={14} />
              그룹 내보내기
            </button>
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
                  <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                    <BookOpen size={16} style={{ color: '#4338ca' }} />
                  </div>
                  <div className="flex items-center gap-1">
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
          onAdd={name => {
            addBank({
              id: `bank_custom_${Date.now()}`,
              name,
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

      {showExportModal && (
        <GroupExportModal
          sourceCourse={CURRENT_COURSE}
          onClose={() => setShowExportModal(false)}
          onExport={(selectedQuestions, targetCourse, targetBankId, newBankName) => {
            let bankId = targetBankId
            let bankName = newBankName
            if (!bankId) {
              bankId = `bank_export_${Date.now()}`
              addBank({
                id: bankId,
                name: bankName || '내보내기 문제은행',
                course: targetCourse,
                updatedAt: new Date().toISOString().split('T')[0],
                usedInQuizIds: [],
              })
            } else {
              bankName = banks.find(b => b.id === bankId)?.name || bankName
            }
            addQuestions(selectedQuestions.map(q => ({
              ...q,
              id: `${q.id}_exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bankId,
            })))
            setShowExportModal(false)
            showToast(`"${bankName}"으로 ${selectedQuestions.length}개 문항을 내보냈습니다`, bankId)
          }}
        />
      )}

      {showCopyModal && (
        <CopyFromBankModal
          currentBankId={null}
          initialCourse={CURRENT_COURSE}
          onClose={() => setShowCopyModal(false)}
          onCopy={(questions, sourceBank) => {
            const newId = `bank_import_${Date.now()}`
            const bankName = sourceBank?.name ? `${sourceBank.name}-사본` : '가져온 문제은행'
            addBank({
              id: newId,
              name: bankName,
              course: CURRENT_COURSE,
              updatedAt: new Date().toISOString().split('T')[0],
              usedInQuizIds: [],
            })
            addQuestions(questions.map(q => ({
              ...q,
              id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bankId: newId,
            })))
            setShowCopyModal(false)
            showToast(`"${bankName}" 문제은행이 생성되었습니다`, newId)
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
          <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: '#616161' }}>취소</button>
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

