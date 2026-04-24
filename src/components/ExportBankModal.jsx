import { useState, useEffect } from 'react'
import { useQuestionBank } from '../context/questionBank'
import { MOCK_COURSES } from '../data/mockData'
import {
  listBanks,
  getBankQuestions as apiGetBankQuestions,
  listCourses,
  isApiMode,
} from '@/lib/data'
import { DropdownSelect } from './DropdownSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  DiffBadge,
  WizardSteps,
  ReviewRow,
  WizardDifficultySelector,
  WizardStep1,
} from './BankWizardShared'

const CURRENT_COURSE = 'CS301 데이터베이스'

export default function ExportBankModal({ onClose, onExport }) {
  const { banks: contextBanks, getBankQuestions: contextGetBankQuestions } = useQuestionBank()
  const [step, setStep] = useState(1)

  // API 모드에서는 교수가 만든 모든 과목의 뱅크 + xnquiz 등록된 과목 목록을 cross-course 로 로드
  const [crossBanks, setCrossBanks] = useState(null)
  const [crossQuestionsByBank, setCrossQuestionsByBank] = useState({})
  const [teacherCourses, setTeacherCourses] = useState(null)
  useEffect(() => {
    if (!isApiMode()) return
    let mounted = true
    ;(async () => {
      try {
        const [all, courses] = await Promise.all([listBanks(), listCourses()])
        if (!mounted) return
        setCrossBanks(all)
        setTeacherCourses(courses)
        const entries = await Promise.all(
          all.map(async b => [b.id, await apiGetBankQuestions(b.id)])
        )
        if (mounted) setCrossQuestionsByBank(Object.fromEntries(entries))
      } catch (err) {
        console.error('[ExportBankModal] cross-course 뱅크 로드 실패', err)
        if (mounted) {
          setCrossBanks([])
          setTeacherCourses([])
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  const apiMode = isApiMode()
  const allBanks = apiMode ? (crossBanks ?? []) : contextBanks
  const getAllBankQuestions = (bankId) => {
    if (apiMode) return crossQuestionsByBank[bankId] || []
    return contextGetBankQuestions(bankId)
  }

  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  // API 모드: context 뱅크의 첫 과목 (= 현재 과목). mock 모드: CURRENT_COURSE.
  const [targetCourse, setTargetCourse] = useState(() =>
    apiMode ? (contextBanks[0]?.course ?? '') : CURRENT_COURSE
  )
  // context 뱅크가 늦게 로드되면 targetCourse 가 '' 로 남을 수 있어 초기화 보강
  useEffect(() => {
    if (!apiMode) return
    if (targetCourse) return
    const first = contextBanks[0]?.course
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time default once context banks arrive
    if (first) setTargetCourse(first)
  }, [apiMode, contextBanks, targetCourse])
  const [targetMode, setTargetMode] = useState('new')
  const [targetBankId, setTargetBankId] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [newBankDifficulty, setNewBankDifficulty] = useState(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [inlineToast, setInlineToast] = useState(null)

  const targetBank = targetBankId ? allBanks.find(b => b.id === targetBankId) : null
  const courseBanks = allBanks.filter(b => b.course === targetCourse && !selectedSourceIds.includes(b.id))

  const sourceQuestions = selectedSourceIds.flatMap(bankId => {
    const bankName = allBanks.find(b => b.id === bankId)?.name || ''
    return getAllBankQuestions(bankId).map(q => ({ ...q, _sourceBankName: bankName }))
  })

  const filtered = sourceQuestions.filter(q => {
    const matchType = filterType === 'all' || q.type === filterType
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchType && matchDiff
  })

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

  const selectedQuestions = selectedQuestionIds
    .map(id => sourceQuestions.find(q => q.id === id))
    .filter(Boolean)

  const autoDifficulty = (() => {
    if (selectedQuestions.length === 0) return ''
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    return diffs.length === 1 ? diffs[0] : ''
  })()

  const allowedDifficulties = (() => {
    if (selectedQuestions.length === 0) return ['']
    const diffs = [...new Set(selectedQuestions.map(q => q.difficulty || ''))]
    if (diffs.length === 1 && diffs[0] !== '') return [diffs[0], '']
    if (diffs.length === 1 && diffs[0] === '') return ['', 'high', 'medium', 'low']
    return ['']
  })()

  const effectiveNewDifficulty = newBankDifficulty !== null ? newBankDifficulty : autoDifficulty

  const handleTargetBankChange = (id) => {
    setTargetBankId(id)
    if (id) {
      const tb = allBanks.find(b => b.id === id)
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
  }

  const handleSourceToggle = (bankId) => {
    const isChecked = selectedSourceIds.includes(bankId)
    setSelectedSourceIds(prev => isChecked ? prev.filter(id => id !== bankId) : [...prev, bankId])
    if (isChecked) {
      const bankQIds = getAllBankQuestions(bankId).map(q => q.id)
      setSelectedQuestionIds(prev => prev.filter(id => !bankQIds.includes(id)))
    }
    if (!isChecked && bankId === targetBankId) setTargetBankId(null)
  }

  const canSubmit = selectedQuestions.length > 0 &&
    (targetMode === 'new' ? newBankName.trim() !== '' : targetBankId !== null)

  // 사이드바 과목 목록: 실제 뱅크가 있는 과목들에서 동적 생성 (MOCK_COURSES 하드코딩 제거)
  const courseGroups = (() => {
    const groups = {}
    allBanks.forEach(b => {
      const course = b.course || CURRENT_COURSE
      if (!groups[course]) groups[course] = []
      groups[course].push(b)
    })
    return groups
  })()

  const availableCourses = Object.keys(courseGroups)
    .map(name => ({ id: name, name }))
    .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))

  // 대상 과목 드롭다운: API 모드 → xnquiz 등록된 과목 전체, mock 모드 → MOCK_COURSES
  const targetCourseOptions = apiMode
    ? (teacherCourses ?? []).map(c => ({ value: c.name, label: c.name }))
    : MOCK_COURSES.map(c => ({ value: c.name, label: c.name }))

  const goToStep2 = () => {
    if (targetBank?.difficulty) {
      const diff = targetBank.difficulty
      setSelectedQuestionIds(prev => {
        const next = prev.filter(id => {
          const q = sourceQuestions.find(x => x.id === id)
          return q?.difficulty === diff
        })
        const removed = prev.length - next.length
        if (removed > 0) {
          setInlineToast(`난이도 불일치로 ${removed}개 문항이 제외되었습니다`)
          setTimeout(() => setInlineToast(null), 3000)
        }
        return next
      })
    }
    setStep(2)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl min-h-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle>내보내기</DialogTitle>
            </DialogHeader>
          </div>
          <WizardSteps step={step} labels={['문항 선택', '검토 및 설정']} />
        </div>

        {step === 1 ? (
          <WizardStep1
            courseSearch={courseSearch}
            setCourseSearch={setCourseSearch}
            availableCourses={availableCourses}
            courseGroups={courseGroups}
            selectedSourceIds={selectedSourceIds}
            handleSourceToggle={handleSourceToggle}
            filterType={filterType}
            setFilterType={setFilterType}
            filterDifficulty={filterDifficulty}
            setFilterDifficulty={setFilterDifficulty}
            filtered={filtered}
            selectedQuestionIds={selectedQuestionIds}
            allFilteredSelected={allFilteredSelected}
            someFilteredSelected={someFilteredSelected}
            toggle={toggle}
            toggleAll={toggleAll}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-foreground">선택한 문항</h3>
                <span className="text-xs text-muted-foreground">{selectedQuestions.length}개</span>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {selectedQuestions.map((q, i) => (
                  <ReviewRow key={q.id} q={q} index={i} onRemove={id => setSelectedQuestionIds(prev => prev.filter(x => x !== id))} />
                ))}
                {selectedQuestions.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">모든 문항이 제거되었습니다. 이전 단계로 돌아가 문항을 선택하세요.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-5">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">내보낼 위치</h3>
              <p className="text-xs text-muted-foreground mb-4">내보낼 과목과 문제모음을 선택하세요</p>

              <div className="mb-4">
                <label className="text-xs font-medium text-secondary-foreground block mb-1.5">대상 과목</label>
                <DropdownSelect
                  value={targetCourse}
                  onChange={(course) => { setTargetCourse(course); setTargetBankId(null) }}
                  options={targetCourseOptions}
                />
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => { setTargetMode('new'); setTargetBankId(null) }}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'new' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'new' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>새 문제모음 만들기</p>
                    <p className="text-xs text-muted-foreground mt-0.5">선택한 과목에 새 문제모음을 생성합니다</p>
                  </div>
                  {targetMode === 'new' && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-primary/15">
                      <input
                        type="text"
                        value={newBankName}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setNewBankName(e.target.value)}
                        placeholder="문제모음 이름"
                        autoFocus
                        className="w-full max-w-xs text-[15px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground bg-white"
                      />
                      {selectedQuestions.length > 0 && (
                        <div onClick={e => e.stopPropagation()}>
                          <WizardDifficultySelector
                            value={effectiveNewDifficulty}
                            allowedDifficulties={allowedDifficulties}
                            onChange={setNewBankDifficulty}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setTargetMode('existing')}
                  className={cn(
                    'w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
                    targetMode === 'existing' ? 'border-primary bg-accent/40' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    <p className={cn('text-[15px]', targetMode === 'existing' ? 'font-semibold text-primary' : 'text-secondary-foreground')}>기존 문제모음에 추가</p>
                    <p className="text-xs text-muted-foreground mt-0.5">이미 있는 문제모음에 문항을 추가합니다</p>
                  </div>
                  {targetMode === 'existing' && (
                    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-primary/15" onClick={e => e.stopPropagation()}>
                      {courseBanks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">선택한 과목에 사용 가능한 문제모음이 없습니다</p>
                      ) : (
                        courseBanks.map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleTargetBankChange(b.id)}
                            className={cn(
                              'w-full max-w-xs text-left px-3 py-2 rounded-lg border transition-colors text-xs flex items-center gap-2',
                              b.id === targetBankId ? 'border-primary bg-accent font-semibold text-primary' : 'border-border text-secondary-foreground hover:border-primary/40 bg-white'
                            )}
                          >
                            <DiffBadge difficulty={b.difficulty} />
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {inlineToast && (
          <div className="px-5 py-2 shrink-0 text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-t border-amber-200">
            {inlineToast}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
          {step === 1 ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
              <div className="flex items-center gap-3">
                {selectedQuestionIds.length > 0 && (
                  <span className="text-xs bg-accent text-primary px-2.5 py-1 rounded-full font-medium">{selectedQuestionIds.length}개 선택됨</span>
                )}
                <Button
                  disabled={selectedQuestionIds.length === 0}
                  onClick={goToStep2}
                >
                  다음
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>이전</Button>
              <Button
                disabled={!canSubmit}
                onClick={() => onExport(selectedQuestions, targetCourse, targetMode === 'existing' ? targetBankId : null, targetMode === 'new' ? newBankName.trim() : null, effectiveNewDifficulty)}
              >
                {selectedQuestions.length}개 내보내기
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
