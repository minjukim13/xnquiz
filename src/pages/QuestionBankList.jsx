import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Copy, FolderInput, FolderOutput, Pencil } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import Layout from '../components/Layout'
import { useQuestionBank } from '../context/questionBank'
import { useRole } from '../context/role'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import AddBankModal from '../components/AddBankModal'
import ExportBankModal from '../components/ExportBankModal'
import ImportBankModal from '../components/ImportBankModal'
import { DIFFICULTY_META, DIFF_LABEL } from '../components/bankDifficulty'

const CURRENT_COURSE = 'CS301 데이터베이스'

export default function QuestionBankList() {
  const navigate = useNavigate()
  const { role } = useRole()
  const { banks, addBank, deleteBank, getBankQuestions, addQuestions, updateBank } = useQuestionBank()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [editingBankId, setEditingBankId] = useState(null)
  const [bankNameDraft, setBankNameDraft] = useState('')

  if (role !== 'instructor') return <Navigate to="/" replace />

  const showToast = (msg, bankId) => {
    setToast({ msg, bankId })
    setTimeout(() => setToast(null), 4000)
  }

  const getQuestionCount = (bankId) => getBankQuestions(bankId).length

  const executeCopyBank = async (bank) => {
    const newName = `${bank.name}-사본`
    try {
      const created = await addBank({
         
        id: `bank_copy_${Date.now()}`,
        name: newName,
        difficulty: bank.difficulty,
        course: bank.course,
        courseCode: bank.courseCode,
        updatedAt: new Date().toISOString().split('T')[0],
        usedInQuizIds: [],
      })
      const bankId = created?.id
      if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
      const bankQs = getBankQuestions(bank.id)
      if (bankQs.length > 0) {
        await addQuestions(bankQs.map(q => ({
          ...q,
          id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          bankId,
        })))
      }
      showToast(`'${newName}' 문제모음이 생성되었습니다`, bankId)
    } catch (err) {
      console.error('[QuestionBankList] 복사 실패', err)
      showToast('복사 중 오류가 발생했습니다')
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4" style={{ paddingTop: 32, paddingBottom: 20 }}>
          <h1 className="text-[24px] font-bold text-foreground leading-tight">문제모음</h1>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="outline" onClick={() => setShowCopyModal(true)}>
              <FolderInput size={14} />
              가져오기
            </Button>
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <FolderOutput size={14} />
              내보내기
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              새 문제모음
            </Button>
          </div>
        </div>

        {/* 은행 카드 그리드 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const qCount = getQuestionCount(bank.id)
            const diffLabel = bank.difficulty ? DIFF_LABEL[bank.difficulty] : ''
            return (
              <div
                key={bank.id}
                onClick={() => navigate(`/question-banks/${bank.id}`)}
                className="flex flex-col justify-between min-h-[148px] bg-white p-5 cursor-pointer transition-all border border-border rounded-xl hover:shadow-md"
              >
                {/* 상단 영역 */}
                <div>
                  {/* 1열: 제목 + 액션 아이콘 */}
                  <div className="flex items-start justify-between gap-3">
                    {editingBankId === bank.id ? (
                      <input
                        autoFocus
                        value={bankNameDraft}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setBankNameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && bankNameDraft.trim()) {
                            updateBank(bank.id, { name: bankNameDraft.trim() })
                            setEditingBankId(null)
                          }
                          if (e.key === 'Escape') setEditingBankId(null)
                        }}
                        onBlur={() => {
                          if (bankNameDraft.trim()) updateBank(bank.id, { name: bankNameDraft.trim() })
                          setEditingBankId(null)
                        }}
                        className="font-semibold text-[15px] leading-snug text-foreground focus:outline-none border-b-2 border-primary bg-transparent min-w-0 w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 group/title min-w-0">
                        <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate">{bank.name}</h3>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setBankNameDraft(bank.name)
                            setEditingBankId(bank.id)
                          }}
                          className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary shrink-0"
                          title="이름 수정"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0 -mt-0.5 -mr-1">
                      <button
                        onClick={e => { e.stopPropagation(); executeCopyBank(bank) }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-secondary-foreground hover:bg-secondary transition-colors"
                        title="복사"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(bank) }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 2열: 난이도 뱃지 · N개 문항 */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-md font-medium',
                      bank.difficulty && DIFFICULTY_META[bank.difficulty]
                        ? DIFFICULTY_META[bank.difficulty].cls
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {diffLabel || '미지정'}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-secondary-foreground">{qCount}개 문항</span>
                  </div>
                </div>

                {/* 하단: 최종 수정일 */}
                <p className="text-[13px] text-muted-foreground">최종 수정 {bank.updatedAt}</p>
              </div>
            )
          })}

          {/* 추가 카드 (문제모음이 있을 때만 노출) */}
          {banks.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white flex flex-col items-center justify-center gap-2 transition-all min-h-[148px] border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">새 문제모음 추가</span>
            </button>
          )}
        </div>

        {/* 빈 상태 */}
        {banks.length === 0 && (
          <div className="mt-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium mb-1 text-muted-foreground">문제모음이 없습니다</p>
            <p className="text-xs mb-4 text-muted-foreground">새 문제모음을 만들어 문항을 관리하세요</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm font-medium px-4 py-2 bg-primary text-primary-foreground rounded transition-colors hover:bg-primary-hover"
            >
              첫 문제모음 만들기
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddBankModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (name, difficulty) => {
            try {
              await addBank({
                id: `bank_custom_${Date.now()}`,
                name,
                difficulty,
                course: CURRENT_COURSE,
                updatedAt: new Date().toISOString().split('T')[0],
                usedInQuizIds: [],
              })
              setShowAddModal(false)
            } catch (err) {
              console.error('[QuestionBankList] 은행 생성 실패', err)
              showToast('생성 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`'${deleteTarget.name}' 문제모음을 삭제할까요?`}
          message={`은행에 포함된 문항 ${getQuestionCount(deleteTarget.id)}개가 함께 삭제되며 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmDanger
          onConfirm={async () => {
            const target = deleteTarget
            setDeleteTarget(null)
            try {
              await deleteBank(target.id)
            } catch (err) {
              console.error('[QuestionBankList] 삭제 실패', err)
              showToast('삭제 중 오류가 발생했습니다')
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showCopyModal && (
        <ImportBankModal
          onClose={() => setShowCopyModal(false)}
          onImport={async (selectedQs, bankName, difficulty, existingBankId) => {
            try {
              let bankId, toastName
              if (existingBankId) {
                bankId = existingBankId
                toastName = banks.find(b => b.id === existingBankId)?.name || '문제모음'
              } else {
                const created = await addBank({
                  id: `bank_import_${Date.now()}`,
                  name: bankName,
                  difficulty: difficulty || '',
                  course: CURRENT_COURSE,
                  updatedAt: new Date().toISOString().split('T')[0],
                  usedInQuizIds: [],
                })
                bankId = created?.id
                toastName = bankName
                if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
              }
              await addQuestions(selectedQs.map(q => ({
                ...q,
                _sourceBankName: undefined,
                id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                bankId,
              })))
              setShowCopyModal(false)
              showToast(`'${toastName}' 문제모음에 ${selectedQs.length}개 문항 가져오기 완료`, bankId)
            } catch (err) {
              console.error('[QuestionBankList] 가져오기 실패', err)
              showToast('가져오기 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {showExportModal && (
        <ExportBankModal
          onClose={() => setShowExportModal(false)}
          onExport={async (questions, targetCourse, targetBankId, newBankName, difficulty) => {
            try {
              let bankId = targetBankId
              let bankName = newBankName
              if (targetBankId === '__new__') {
                const created = await addBank({
                  id: `bank_export_${Date.now()}`,
                  name: bankName,
                  difficulty: difficulty || '',
                  course: targetCourse,
                  updatedAt: new Date().toISOString().split('T')[0],
                  usedInQuizIds: [],
                })
                bankId = created?.id
                if (!bankId) throw new Error('생성된 은행 id 를 받지 못했습니다')
              } else {
                bankName = banks.find(b => b.id === bankId)?.name || bankName
              }
              await addQuestions(questions.map(q => ({
                ...q,
                _sourceBankName: undefined,
                id: `${q.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                bankId,
              })))
              setShowExportModal(false)
              showToast(`'${bankName}' 문제모음에 ${questions.length}개 문항을 내보냈습니다`, bankId)
            } catch (err) {
              console.error('[QuestionBankList] 내보내기 실패', err)
              showToast('내보내기 중 오류가 발생했습니다')
            }
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          action={toast.bankId ? { label: '바로가기', onClick: () => { navigate(`/question-banks/${toast.bankId}`); setToast(null) } } : undefined}
        />
      )}
    </Layout>
  )
}

// ── 새 문제모음 모달 ──────────────────────────────────────────────────────────
