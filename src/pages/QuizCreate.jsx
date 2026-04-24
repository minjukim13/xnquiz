import { useState, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { GripVertical, Pencil, Trash2, HelpCircle } from 'lucide-react'
import CustomSelect from '../components/CustomSelect'
import QuestionAnswer from '../components/QuestionAnswer'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import RandomQuestionBankModal from '../components/RandomQuestionBankModal'
import { QUIZ_TYPES } from '../data/mockData'
import { createQuiz, setQuizQuestions } from '@/lib/data'
import { useRole } from '../context/role'
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog'
import AssignmentOverrides from '../components/AssignmentOverrides'
import { hasDuplicateStudent, sanitizeAssignments } from '../utils/assignments'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

const WEEK_OPTIONS = [
  { value: null, label: '선택 안함' },
  ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` })),
]
const SESSION_BASE = [1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` }))
const SESSION_OPTIONS_WITH_NONE = [{ value: null, label: '선택 안함' }, ...SESSION_BASE]
const ATTEMPT_MIN = 1
const ATTEMPT_MAX = 99
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

const DEFAULT_NOTICE = `- 제출 후에는 답안을 수정할 수 없습니다.
- 타인과의 협력 및 자료 공유는 금지됩니다.
- 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.`

export default function QuizCreate() {
  const navigate = useNavigate()
  const { role } = useRole()
  const [tab, setTab] = useState('info')
  // LTI 모드에서 LearningX 가 주입한 주차/차시 값을 초기값으로 프리필
  // 범위 검증은 서버에서 수행, 여기서는 파싱만
  const ltiPrefill = (() => {
    try {
      if (typeof window === 'undefined') return { week: null, session: null }
      if (localStorage.getItem('xnq_lti_active') !== '1') return { week: null, session: null }
      const w = parseInt(localStorage.getItem('xnq_lti_week') || '', 10)
      const s = parseInt(localStorage.getItem('xnq_lti_session') || '', 10)
      return {
        week: Number.isInteger(w) && w >= 1 && w <= 16 ? w : null,
        session: Number.isInteger(s) && s >= 1 && s <= 4 ? s : null,
      }
    } catch { return { week: null, session: null } }
  })()
  const [form, setForm] = useState({
    title: '', description: '', week: ltiPrefill.week, session: ltiPrefill.session,
    startDate: '', dueDate: '', lockDate: '', timeLimit: '60', unlimitedTimeLimit: false,
    allowAttempts: 1, unlimitedAttempts: false, scorePolicy: '최고 점수 유지',
    shuffleChoices: false, shuffleQuestions: false,
    scoreRevealEnabled: false, scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'immediately', scoreRevealStart: '', scoreRevealEnd: '',
    oneTimeResults: false,
    quizMode: 'graded', accessCode: '', ipRestriction: '',
    allowLateSubmit: false, lateSubmitDeadline: '', gracePeriod: 0,
    oneQuestionAtATime: false, lockAfterAnswer: false,
    assignments: [],
    notice: DEFAULT_NOTICE, visible: true,
  })
  const [questions, setQuestions] = useState([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [showRandomBankModal, setShowRandomBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [alertDialog, setAlertDialog] = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const hasChanges = form.title || form.description || questions.length > 0

  const getValidationErrors = () => {
    const errors = []
    if (!form.title) errors.push('퀴즈 제목을 입력해주세요')
    if (form.startDate && form.dueDate && new Date(form.dueDate) <= new Date(form.startDate)) errors.push('마감 일시는 시작 일시 이후여야 합니다')
    if (!form.dueDate && form.allowLateSubmit && form.lateSubmitDeadline) errors.push('지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용할 수 있습니다')
    if (!form.unlimitedTimeLimit && (form.timeLimit === '' || Number(form.timeLimit) <= 0)) errors.push('제한 시간을 입력하거나 무제한으로 설정해주세요')
    if (questions.length === 0) errors.push('최소 1개 이상의 문항을 추가해주세요')
    if (hasDuplicateStudent(form.assignments)) errors.push('동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다')
    return errors
  }

  const handleCancel = () => {
    if (hasChanges) {
      setConfirmDialog({
        title: '작성 취소',
        message: '작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?',
        onConfirm: () => navigate('/'),
      })
    } else {
      navigate('/')
    }
  }

  const buildQuizBody = (status) => ({
    title: form.title, description: form.description,
    course: 'CS301 데이터베이스', quizMode: form.quizMode, status, visible: form.visible,
    startDate: form.startDate || null, dueDate: form.dueDate || null,
    lockDate: form.lockDate || null,
    week: form.week ?? null, session: form.session ?? null,
    timeLimit: form.timeLimit === '' ? 0 : Number(form.timeLimit),
    allowAttempts: form.unlimitedAttempts ? -1 : form.allowAttempts,
    scorePolicy: form.allowAttempts >= 2 || form.unlimitedAttempts ? form.scorePolicy : null,
    shuffleChoices: form.shuffleChoices, shuffleQuestions: form.shuffleQuestions,
    scoreRevealEnabled: form.scoreRevealEnabled,
    scoreRevealScope: form.scoreRevealEnabled ? form.scoreRevealScope : null,
    scoreRevealTiming: form.scoreRevealEnabled ? form.scoreRevealTiming : null,
    scoreRevealStart: (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealStart || null : null,
    scoreRevealEnd: (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealEnd || null : null,
    oneTimeResults: form.oneTimeResults,
    accessCode: form.accessCode || null, ipRestriction: form.ipRestriction || null,
    allowLateSubmit: form.allowLateSubmit,
    lateSubmitDeadline: form.allowLateSubmit && form.lateSubmitDeadline ? form.lateSubmitDeadline : null,
    gracePeriod: form.dueDate && Number(form.gracePeriod) > 0 ? Number(form.gracePeriod) : 0,
    oneQuestionAtATime: form.oneQuestionAtATime,
    lockAfterAnswer: form.oneQuestionAtATime && form.lockAfterAnswer,
    assignments: sanitizeAssignments(form.assignments),
    notice: form.notice,
    totalStudents: 0, submitted: 0, graded: 0, pendingGrade: 0,
    questions: questions.length, totalPoints,
  })

  const persistQuiz = async (status) => {
    const created = await createQuiz(buildQuizBody(status))
    if (questions.length > 0) {
      await setQuizQuestions(created.id, questions)
    }
    return created
  }

  const handleSaveDraft = async () => {
    if (!form.title) {
      setAlertDialog({ title: '임시저장 불가', message: '퀴즈 제목을 입력해주세요.', variant: 'error' })
      return
    }
    try {
      await persistQuiz('draft')
      setAlertDialog({
        title: '임시저장 완료',
        message: '퀴즈가 임시저장되었습니다.',
      })
    } catch (err) {
      console.error('[QuizCreate] 임시저장 실패', err)
      setAlertDialog({ title: '임시저장 실패', message: err?.message ?? '저장 중 오류가 발생했습니다.', variant: 'error' })
    }
  }

  const addQuestion = useCallback((q) => {
    setQuestions(prev => prev.find(e => e.id === q.id) ? prev : [...prev, q])
  }, [])
  const addNewQuestion = useCallback((q) => {
    setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  }, [])
  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const moveQuestion = useCallback((fromIdx, toIdx) => {
    setQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }, [])
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  if (role !== 'instructor') return <Navigate to="/" replace />

  const handlePublish = () => {
    const errors = getValidationErrors()
    if (errors.length > 0) {
      setAlertDialog({
        title: '필수 항목 미입력',
        message: errors[0],
      })
      return
    }
    const isMultiAttempt = form.allowAttempts >= 2 || form.unlimitedAttempts
    const noRevealPeriod = form.scoreRevealEnabled && form.scoreRevealTiming !== 'period' && form.scoreRevealTiming !== 'after_due'
    const doPublish = async () => {
      try {
        await persistQuiz('open')
        navigate('/')
      } catch (err) {
        console.error('[QuizCreate] 저장 실패', err)
        setAlertDialog({ title: '저장 실패', message: err?.message ?? '저장 중 오류가 발생했습니다.', variant: 'error' })
      }
    }
    if (isMultiAttempt && noRevealPeriod) {
      setConfirmDialog({
        title: '점수 공개 기간 미설정',
        message: '재응시가 허용된 퀴즈에서 점수 공개 기간이 설정되지 않으면, 1차 응시 마감 직후 점수(및 정답)가 공개되어 학생이 2차 응시 전에 정답을 확인할 수 있습니다.\n\n점수 공개 기간을 설정하지 않고 저장하시겠습니까?',
        onConfirm: doPublish,
      })
    } else {
      doPublish()
    }
  }

  return (
    <>
      <div className="max-w-5xl mx-auto pb-4">
        <h1 className="text-[22px] font-bold text-foreground pt-8 pb-5">새 퀴즈 만들기</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className="gap-4 border-b border-border pb-0">
            <TabsTrigger value="info" className="text-[14px] px-1 pb-2.5">기본 정보</TabsTrigger>
            <TabsTrigger value="questions" className="text-[14px] px-1 pb-2.5">
              문항 구성
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="pt-5">
            <InfoTab form={form} set={set} />
          </TabsContent>
          <TabsContent value="questions" className="pt-5">
            <QuestionsTab questions={questions} totalPoints={totalPoints} onShowBank={() => setShowBankModal(true)} onShowRandomBank={() => setShowRandomBankModal(true)} onShowAdd={() => setShowAddModal(true)} onRemove={removeQuestion} onMove={moveQuestion} />
          </TabsContent>
        </Tabs>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
          <Button size="lg" variant="ghost" onClick={handleCancel} className="text-muted-foreground hover:text-foreground px-4">취소</Button>
          <div className="flex items-center gap-2">
            <Button size="lg" variant="outline" onClick={handleSaveDraft} className="px-4">임시저장</Button>
            {tab === 'info' ? (
              <Button size="lg" onClick={() => setTab('questions')} className="px-4">문항 구성 →</Button>
            ) : (
              <Button size="lg" onClick={handlePublish} className="px-4">저장하기</Button>
            )}
          </div>
        </div>
      </div>

      <QuestionBankModal open={showBankModal} onOpenChange={setShowBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      <RandomQuestionBankModal open={showRandomBankModal} onOpenChange={setShowRandomBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onAdd={addNewQuestion} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} confirmLabel={confirmDialog.confirmLabel} cancelLabel={confirmDialog.cancelLabel} onConfirm={() => { setConfirmDialog(null); confirmDialog.onConfirm() }} onCancel={() => setConfirmDialog(null)} />}
      {alertDialog && <AlertDialog title={alertDialog.title} message={alertDialog.message} variant={alertDialog.variant} onClose={() => setAlertDialog(null)} />}
    </>
  )
}

function InfoTab({ form, set }) {
  return (
    <div className="space-y-3">
      <Section title="퀴즈 유형">
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'graded', label: '평가용 퀴즈', desc: '성적에 반영됩니다' },
            { value: 'practice', label: '연습용 퀴즈', desc: '성적에 반영되지 않습니다' },
          ].map(opt => (
            <button key={opt.value} onClick={() => set('quizMode', opt.value)}
              className={cn('text-left p-3 rounded-md transition-all border-2',
                form.quizMode === opt.value ? 'border-primary bg-accent' : 'border-border bg-white'
              )}>
              <p className={cn('text-sm font-semibold', form.quizMode === opt.value ? 'text-primary' : 'text-slate-700')}>{opt.label}</p>
              <p className={cn('text-xs mt-0.5', form.quizMode === opt.value ? 'text-primary' : 'text-muted-foreground')}>{opt.desc}</p>
            </button>
          ))}
        </div>
        {form.quizMode === 'practice' && (
          <div className="flex items-center gap-2 p-2.5 rounded-md text-xs bg-amber-50/40 border border-amber-300 text-slate-600">
            <span>연습용 퀴즈는 성적에 반영되지 않습니다.</span>
          </div>
        )}
      </Section>

      <Section title="기본 정보">
        <Field label="퀴즈 제목" required>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="예) 중간고사 - 데이터베이스 설계" className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
        </Field>
        <Field label="설명">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="학생에게 표시될 퀴즈 설명 (선택)" rows={2} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-none" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="주차"><CustomSelect value={form.week} onChange={v => { set('week', v); if (v !== null && !form.session) set('session', 1); if (v === null) set('session', null) }} options={WEEK_OPTIONS} placeholder="주차 선택" /></Field>
          <Field label="차시"><CustomSelect value={form.session} onChange={v => set('session', v)} options={form.week !== null ? SESSION_BASE : SESSION_OPTIONS_WITH_NONE} placeholder="차시 선택" /></Field>
        </div>
      </Section>

      <Section title="응시 기간">
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작 일시"><input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" /></Field>
          <Field label={<span className="inline-flex items-center gap-1">마감 일시<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>학생이 퀴즈를 제출해야 하는 기한입니다.<br />마감 이후에는 제출이 불가합니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}><input type="datetime-local" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" /></Field>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">미설정 시 응시 기간 제한 없이 학생이 언제든 응시할 수 있습니다.</p>
        <Field label={<span className="inline-flex items-center gap-1">유예 시간<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>마감 직후 네트워크 지연 등으로 늦게 제출될 수 있는 경우를<br />대비한 버퍼 시간입니다. 이 시간 이내 제출은 지각으로 처리하지 않습니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}>
          <div className={cn('flex items-center gap-2', !form.dueDate && 'opacity-40 pointer-events-none')}>
            <input type="number" value={form.gracePeriod} onChange={e => set('gracePeriod', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} min={0} placeholder="0" className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
            <span className="text-sm shrink-0 text-muted-foreground">분</span>
          </div>
          <p className="text-xs mt-1.5 text-muted-foreground">{form.dueDate ? '0분 또는 미설정 시 유예 없이 마감 일시에 지각 처리됩니다.' : '마감 일시가 설정되어야 사용할 수 있습니다.'}</p>
        </Field>
        <Field label={<span className="inline-flex items-center gap-1">이용 종료 일시<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>퀴즈 페이지 자체에 접근할 수 없게 되는 시점입니다.<br />마감 이후에도 학생이 결과를 확인할 수 있도록<br />종료 일시는 마감 일시 이후로 설정하는 것을 권장합니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}>
          <input type="datetime-local" value={form.lockDate} onChange={e => set('lockDate', e.target.value)} min={form.dueDate || undefined} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
          <p className="text-xs mt-1.5 text-muted-foreground">이용 종료 일시가 지나면 학생은 퀴즈 정보를 확인할 수 없습니다. 미설정 시 제한 없음.</p>
          {form.lockDate && form.dueDate && new Date(form.lockDate) < new Date(form.dueDate) && (
            <div className="flex items-center gap-2 p-2.5 rounded-md text-xs bg-amber-50/40 border border-amber-300 text-slate-600 mt-2">
              <span>이용 종료 일시가 마감 일시보다 앞서 있습니다. 마감 전에 퀴즈 접근이 차단될 수 있습니다.</span>
            </div>
          )}
        </Field>
        <div className="mt-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">마감 후 지각 제출 허용</span>
            <Switch checked={form.allowLateSubmit} onCheckedChange={v => set('allowLateSubmit', v)} className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-gray-200" />
          </div>
          {form.allowLateSubmit && (
            <div className="border-l-2 border-gray-200 pl-4 ml-0.5 space-y-2">
              <label className="block text-sm font-medium text-slate-700">지각 제출 마감 일시</label>
              <input type="datetime-local" value={form.lateSubmitDeadline} onChange={e => set('lateSubmitDeadline', e.target.value)} min={form.dueDate || undefined} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all" />
              {!form.lateSubmitDeadline && <p className="text-xs text-gray-500">미설정 시 무제한 허용</p>}
            </div>
          )}
        </div>
      </Section>

      <Section title="추가 기간 설정">
        <AssignmentOverrides
          assignments={form.assignments}
          onChange={val => set('assignments', val)}
          baseDueDate={form.dueDate}
        />
      </Section>

      <Section title="응시 설정">
        <div className="grid grid-cols-2 gap-4">
          <Field label="응시 시간 제한">
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-2 flex-1 transition-opacity', form.unlimitedTimeLimit && 'opacity-40 pointer-events-none')}>
                <input type="number" value={form.timeLimit} onChange={e => set('timeLimit', e.target.value)} placeholder="60" min={1} disabled={form.unlimitedTimeLimit} className={cn('w-full text-sm px-3.5 py-2.5 rounded-md border transition-all', form.unlimitedTimeLimit ? 'border-gray-200 bg-gray-50 text-muted-foreground cursor-not-allowed' : 'border-gray-200 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary')} />
                <span className="text-sm shrink-0 text-muted-foreground">분</span>
              </div>
              <button type="button" onClick={() => set('unlimitedTimeLimit', !form.unlimitedTimeLimit)} className={cn('px-3.5 py-2.5 text-sm font-medium rounded-md border transition-all shrink-0', form.unlimitedTimeLimit ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700')}>무제한</button>
            </div>
          </Field>
          <Field label="최대 응시 횟수">
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center border rounded-md overflow-hidden transition-opacity', form.unlimitedAttempts ? 'border-gray-200 opacity-40 pointer-events-none' : 'border-gray-200')}>
                <button type="button" onClick={() => set('allowAttempts', Math.max(ATTEMPT_MIN, form.allowAttempts - 1))} disabled={form.allowAttempts <= ATTEMPT_MIN || form.unlimitedAttempts} className={cn('px-3 py-2.5 text-sm font-medium transition-colors', form.unlimitedAttempts ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed')}>-</button>
                <span className={cn('px-4 py-2.5 text-sm font-medium min-w-[48px] text-center border-x', form.unlimitedAttempts ? 'border-gray-200 bg-gray-50 text-muted-foreground' : 'border-gray-200 bg-white text-foreground')}>{form.allowAttempts}회</span>
                <button type="button" onClick={() => set('allowAttempts', Math.min(ATTEMPT_MAX, form.allowAttempts + 1))} disabled={form.allowAttempts >= ATTEMPT_MAX || form.unlimitedAttempts} className={cn('px-3 py-2.5 text-sm font-medium transition-colors', form.unlimitedAttempts ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed')}>+</button>
              </div>
              <button type="button" onClick={() => set('unlimitedAttempts', !form.unlimitedAttempts)} className={cn('px-3.5 py-2.5 text-sm font-medium rounded-md border transition-all shrink-0', form.unlimitedAttempts ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700')}>무제한</button>
            </div>
          </Field>
        </div>
        {(form.allowAttempts >= 2 || form.unlimitedAttempts) && (
          <Field label="복수 응시 시 채점 방식"><CustomSelect value={form.scorePolicy} onChange={v => set('scorePolicy', v)} options={SCORE_POLICIES} /></Field>
        )}
      </Section>

      <Section title="문항 표시 설정">
        <div className="space-y-3">
          <Toggle checked={form.shuffleChoices} onChange={v => set('shuffleChoices', v)} label="선택지 무작위 배열" description="학생마다 선택지 순서가 달라집니다" />
          <Toggle checked={form.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} label="문항 순서 무작위" description="학생마다 문항 순서가 달라집니다" />
          <Toggle
            checked={form.oneQuestionAtATime}
            onChange={v => {
              set('oneQuestionAtATime', v)
              if (!v) set('lockAfterAnswer', false)
            }}
            label="한 번에 한 문항씩 표시"
            description="학생에게 문항을 1개씩만 보여주고 이전/다음 버튼으로 이동합니다"
          />
          {form.oneQuestionAtATime && (
            <div className="border-l-2 border-gray-200 pl-4 ml-0.5 space-y-2">
              <Toggle
                checked={form.lockAfterAnswer}
                onChange={v => set('lockAfterAnswer', v)}
                label="응답 후 문항 잠금"
                description="다음으로 이동하면 이전 문항으로 돌아갈 수 없습니다"
              />
            </div>
          )}
        </div>
      </Section>

      <Section title="성적 공개 정책">
        <div className="space-y-4">
          <Toggle checked={form.scoreRevealEnabled} onChange={v => set('scoreRevealEnabled', v)} label="성적 공개" description="제출 후 학생에게 성적 정보를 공개합니다" />
          {form.scoreRevealEnabled && (
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-xs font-semibold mb-2 text-slate-600">공개 범위</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'wrong_only', label: '오답 여부만', desc: '정오답(✓/✗) + 점수 표시\n정답은 공개하지 않습니다' },
                    { value: 'with_answer', label: '정답까지', desc: '정오답(✓/✗) + 점수 + 정답 표시' },
                  ].map(opt => {
                    const active = form.scoreRevealScope === opt.value
                    return (
                      <button key={opt.value} type="button" onClick={() => set('scoreRevealScope', opt.value)}
                        className={cn('flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-all w-full border-2',
                          active ? 'border-primary bg-accent' : 'border-border bg-white'
                        )}>
                        <span className={cn('text-sm font-semibold', active ? 'text-primary' : '')}>{opt.label}</span>
                        <span className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2 text-slate-600">공개 시점</p>
                <div className="space-y-1">
                  {[
                    { value: 'immediately', label: '제출 즉시', desc: '학생이 제출하는 순간 바로 공개됩니다' },
                    { value: 'after_due', label: '마감 후', desc: '퀴즈 마감일이 지나면 자동으로 공개됩니다' },
                    { value: 'period', label: '기간 설정', desc: '지정한 기간에만 공개됩니다' },
                  ].map(opt => (
                    <label key={opt.value} className="flex flex-col gap-0.5 cursor-pointer py-1.5">
                      <div className="flex items-center gap-2.5">
                        <input type="radio" name="scoreRevealTiming" checked={form.scoreRevealTiming === opt.value} onChange={() => set('scoreRevealTiming', opt.value)} className="shrink-0 accent-primary" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-[22px]">{opt.desc}</p>
                    </label>
                  ))}
                </div>
                {form.scoreRevealTiming === 'period' && (
                  <div className="mt-3 pt-3 grid grid-cols-2 gap-3 border-t border-blue-100">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-600">공개 시작일</label>
                      <input type="datetime-local" value={form.scoreRevealStart} onChange={e => set('scoreRevealStart', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-600">공개 종료일</label>
                      <input type="datetime-local" value={form.scoreRevealEnd} onChange={e => set('scoreRevealEnd', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Toggle
                  checked={form.oneTimeResults}
                  onChange={v => set('oneTimeResults', v)}
                  label="응답 1회만 조회 허용"
                  description="제출 직후 1회만 응답과 정답을 보여주고 이후 재접근 시 비공개 처리합니다"
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="퀴즈 접근 제한">
        <Field label="액세스 코드">
          <input type="text" value={form.accessCode} onChange={e => set('accessCode', e.target.value)} placeholder="코드를 입력하면 응시 시 코드 입력이 필요합니다" className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
          <p className="text-xs mt-1.5 text-muted-foreground">비워두면 액세스 코드 없이 응시 가능합니다.</p>
        </Field>
        <Field label="접근 가능한 IP 주소">
          <textarea value={form.ipRestriction} onChange={e => set('ipRestriction', e.target.value)} placeholder={'허용할 IP 주소를 한 줄에 하나씩 입력하세요\n예) 192.168.1.0/24\n    203.0.113.10'} rows={3} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-none" />
          <p className="text-xs mt-1.5 text-muted-foreground">비워두면 모든 IP에서 접근 가능합니다. CIDR 표기법 지원.</p>
        </Field>
      </Section>

      <Section title="퀴즈 안내사항">
        <p className="text-xs mb-2 text-muted-foreground">응시 전 학생에게 표시될 안내 문구입니다.</p>
        <textarea value={form.notice} onChange={e => set('notice', e.target.value)} rows={3} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-y leading-relaxed" placeholder="학생에게 안내할 퀴즈 정책을 입력하세요." />
      </Section>

      <Section title="퀴즈 공개 여부">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">학생에게 퀴즈 공개</p>
            <p className="text-xs text-muted-foreground mt-0.5">비공개 시 학생 화면에 퀴즈가 표시되지 않습니다</p>
          </div>
          <Switch checked={form.visible} onCheckedChange={v => set('visible', v)} className="data-[state=checked]:bg-primary" />
        </div>
      </Section>
    </div>
  )
}

function QuestionsTab({ questions, totalPoints, onShowBank, onShowRandomBank, onShowAdd, onRemove, onMove }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx !== null && dragIdx !== i) onMove(dragIdx, i)
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <div>
      {/* 헤더: 문항 수/점수 + 액션 버튼 */}
      <div className="flex items-center justify-between mb-4 px-1 py-0.5">
        <p className="text-[13px] text-secondary-foreground leading-none">
          <span className="font-semibold text-foreground">{questions.length}</span>문항
          <span className="text-muted-foreground mx-1.5">|</span>
          총 <span className="font-semibold text-foreground">{totalPoints}</span>점
        </p>
        <div className="flex items-center gap-2">
          <Button size="lg" variant="outline" onClick={onShowAdd}>문항 만들기</Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="lg">
                문제모음에서 추가
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-1.5">
              <button onClick={onShowBank} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors">
                <p className="text-sm font-medium text-foreground">직접 선택</p>
                <p className="text-xs text-muted-foreground mt-0.5">문제모음에서 원하는 문항을 골라 추가합니다</p>
              </button>
              <button onClick={onShowRandomBank} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors">
                <p className="text-sm font-medium text-foreground">랜덤 출제</p>
                <p className="text-xs text-muted-foreground mt-0.5">조건에 맞는 문항을 자동으로 선택합니다</p>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 문항 리스트 */}
      {questions.length === 0 ? (
        <div className="p-14 text-center rounded-md border-2 border-dashed border-border bg-slate-50">
          <p className="text-sm text-muted-foreground/60">아직 추가된 문항이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={handleDragEnd}
              className={cn('bg-white rounded-lg border group transition-all',
                overIdx === i && dragIdx !== i ? 'border-primary bg-accent/30 shadow-sm' : 'border-border hover:border-slate-300',
                dragIdx === i && 'opacity-40'
              )}>
              <div className="px-3.5 py-3">
                {/* 상단 행: 드래그 핸들 + 번호 + 배지들 + 액션 버튼 */}
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <GripVertical size={14} className="cursor-grab active:cursor-grabbing text-muted-foreground/40" />
                    <span className="text-xs font-bold w-5 text-center text-muted-foreground">{i + 1}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{QUIZ_TYPES[q.type]?.label}</Badge>
                    <span className="text-xs text-muted-foreground">{q.points}점</span>
                    {QUIZ_TYPES[q.type]?.autoGrade === false && <Badge variant="secondary" className="bg-orange-50 text-orange-700">수동채점</Badge>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onRemove(q.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 중단 행: 문제 본문 */}
                <p className="text-sm font-medium text-slate-700 line-clamp-2 mt-2 ml-8">{q.text}</p>

                {/* 하단 행: 정답 영역 */}
                {q.type !== 'essay' && q.type !== 'file_upload' && q.type !== 'text' && (
                  <div className="mt-1.5 ml-8 bg-slate-50/80 rounded px-2.5 py-1.5">
                    <QuestionAnswer q={q} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <Card>
      <CardContent className="px-5 py-3 space-y-4">
        <h2 className="text-sm font-semibold pb-2 border-b border-border">{title}</h2>
        {children}
      </CardContent>
    </Card>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 data-[state=checked]:bg-primary" />
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs mt-0.5 text-muted-foreground">{description}</p>}
      </div>
    </label>
  )
}
