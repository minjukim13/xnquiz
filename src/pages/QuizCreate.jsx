import { useState, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { GripVertical, Pencil, Trash2, HelpCircle, Shuffle } from 'lucide-react'
import { isRandomGroup, summarizeQuizItems } from '@/utils/randomGroups'
import CustomSelect from '../components/CustomSelect'
import QuestionAnswer from '../components/QuestionAnswer'
import AddQuestionModal from '../components/AddQuestionModal'
import InlineQuestionEditor from '../components/InlineQuestionEditor'
import QuestionBankModal from '../components/QuestionBankModal'
import RandomQuestionBankModal from '../components/RandomQuestionBankModal'
import { QUIZ_TYPES, ASSIGNMENT_GROUPS } from '../data/mockData'
import { createQuiz, setQuizQuestions } from '@/lib/data'
import { useRole } from '../context/role'
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog'
import AssignmentOverrides from '../components/AssignmentOverrides'
import { hasDuplicateStudent, sanitizeAssignments } from '../utils/assignments'
import { getInvalidIpTokens } from '../utils/ipValidation'
import { htmlToPlainText } from '../components/RichText'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import StepIndicator from '../components/StepIndicator'
import PublishReviewModal from '../components/PublishReviewModal'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import DateTimePicker from '../components/DateTimePicker'
import WeekSessionPicker from '../components/WeekSessionPicker'
import { Section, Field, Toggle, SecuritySection, GradebookPolicySection } from '@/components/quiz-form'
import { getCompletedSteps } from '@/utils/quizFormSteps'
import { getQuizDefaultsForForm, diffFromDefaults } from '@/utils/quizGlobalSettings'
import DefaultOverrideNotice from '../components/DefaultOverrideNotice'

const ATTEMPT_OPTIONS = [
  ...Array.from({ length: 9 }, (_, i) => ({ value: i + 2, label: `${i + 2}회` })),
  { value: -1, label: '무제한' },
]
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

const CREATE_STEPS = [
  {
    value: 'info',
    label: '시험 설정',
    desc: '학생 응시 환경과 운영 규칙을 결정합니다. 응시 가능 기간, 시간 제한, 재응시 정책, 성적 공개 기준, 보안/감독 옵션 등을 설정해 시험 운영 방식을 정의합니다.',
    requirement: '퀴즈 제목을 입력해주세요',
  },
  {
    value: 'questions',
    label: '문항 구성',
    desc: '시험에 출제할 문항을 구성합니다. 새 문항을 직접 작성하거나, 기존 문제은행에서 선별해 가져오거나, 조건에 맞춰 랜덤 출제하는 세 가지 방식을 조합할 수 있습니다.',
    requirement: '최소 1개 문항을 추가해주세요',
  },
]

const DEFAULT_NOTICE = `- 제출 후에는 답안을 수정할 수 없습니다.
- 타인과의 협력 및 자료 공유는 금지됩니다.
- 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.`

export default function QuizCreate() {
  const navigate = useNavigate()
  const { role } = useRole()
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState(() => {
   const d = getQuizDefaultsForForm() // 과목 기본값 자동 적용 (D-05 R-002), 미설정 시 시스템 기본값(R-003)
   return {
    title: '', description: '', week: null, session: null,
    startDate: '', dueDate: '', lockDate: '', timeLimit: '60', unlimitedTimeLimit: false,
    allowAttempts: d.allowAttempts, unlimitedAttempts: d.unlimitedAttempts, scorePolicy: d.scorePolicy,
    shuffleChoices: false, shuffleQuestions: false,
    scoreRevealEnabled: d.scoreRevealEnabled, scoreRevealScope: 'wrong_only',
    scoreRevealTiming: d.scoreRevealTiming, scoreRevealStart: '', scoreRevealEnd: '',
    oneTimeResults: false,
    gradebookPolicy: 'B',
    quizMode: 'graded', assignmentGroupId: 'quiz',
    accessControlEnabled: false, accessCode: '', ipRestriction: '',
    allowLateSubmit: false, lateSubmitDeadline: '', gracePeriod: 0,
    disableAutoSubmit: false,
    oneQuestionAtATime: false, lockAfterAnswer: false,
    securityTrustLock: false, securityAiProctoring: false,
    securityRequireConsent: false, securityConsentText: '',
    assignments: [],
    noticeEnabled: false, notice: DEFAULT_NOTICE, visible: true,
   }
  })
  const [questions, setQuestions] = useState([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [showRandomBankModal, setShowRandomBankModal] = useState(false)
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [inlineDirty, setInlineDirty] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [alertDialog, setAlertDialog] = useState(null)
  const [showPublishReview, setShowPublishReview] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const hasChanges = form.title || form.description || questions.length > 0

  const getValidationErrors = () => {
    const errors = []
    if (!form.title) errors.push('퀴즈 제목을 입력해주세요')
    if (form.startDate && form.dueDate && new Date(form.dueDate) <= new Date(form.startDate)) errors.push('제출 마감은 응시 시작 이후여야 합니다')
    if (form.lockDate && form.dueDate && new Date(form.lockDate) < new Date(form.dueDate)) errors.push('이용 종료는 제출 마감 이후로 설정해야 합니다')
    if (!form.dueDate && form.allowLateSubmit && form.lateSubmitDeadline) errors.push('지각 제출 마감은 제출 마감이 설정되어 있을 때만 사용할 수 있습니다')
    if (!form.unlimitedTimeLimit && (form.timeLimit === '' || Number(form.timeLimit) <= 0)) errors.push('제한 시간을 입력하거나 무제한으로 설정해주세요')
    if (!form.unlimitedTimeLimit && form.disableAutoSubmit && !form.lockDate) errors.push('자동 제출 5분 유예 사용 시 이용 종료를 반드시 설정해야 합니다')
    if (questions.length === 0) errors.push('최소 1개 이상의 문항을 추가해주세요')
    if (hasDuplicateStudent(form.assignments)) errors.push('동일한 학생이 여러 추가 할당에 포함되어 있습니다')
    if (form.accessControlEnabled) {
      const badIps = getInvalidIpTokens(form.ipRestriction)
      if (badIps.length) errors.push(`허용 IP 형식이 올바르지 않습니다: ${badIps.join(', ')}`)
    }
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
    course: 'CS301 데이터베이스', quizMode: form.quizMode,
    assignmentGroupId: form.quizMode === 'graded' ? form.assignmentGroupId : null,
    status, visible: form.visible,
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
    gradebookPolicy: form.gradebookPolicy,
    accessCode: form.accessControlEnabled ? (form.accessCode || null) : null,
    ipRestriction: form.accessControlEnabled ? (form.ipRestriction || null) : null,
    allowLateSubmit: form.allowLateSubmit,
    lateSubmitDeadline: form.allowLateSubmit && form.lateSubmitDeadline ? form.lateSubmitDeadline : null,
    gracePeriod: form.dueDate && Number(form.gracePeriod) > 0 ? Number(form.gracePeriod) : 0,
    disableAutoSubmit: !form.unlimitedTimeLimit && !!form.disableAutoSubmit,
    oneQuestionAtATime: form.oneQuestionAtATime,
    lockAfterAnswer: form.oneQuestionAtATime && form.lockAfterAnswer,
    securityTrustLock: form.securityTrustLock,
    securityAiProctoring: form.securityAiProctoring,
    securityRequireConsent: form.securityRequireConsent,
    securityConsentText: form.securityRequireConsent ? (form.securityConsentText || null) : null,
    assignments: sanitizeAssignments(form.assignments),
    notice: form.noticeEnabled ? form.notice : null,
    totalStudents: 0, submitted: 0, graded: 0, pendingGrade: 0,
    questions: summarizeQuizItems(questions).questionCount, totalPoints,
  })

  const persistQuiz = async (status) => {
    const created = await createQuiz(buildQuizBody(status))
    if (questions.length > 0) {
      await setQuizQuestions(created.id, questions)
    }
    return created
  }

  // 인라인 편집 중인 문항이 있으면 확인 다이얼로그를 띄우고, 사용자가 그대로 진행하면 next() 호출
  const guardInlineDirty = (next) => {
    if (showInlineAdd && inlineDirty) {
      setConfirmDialog({
        title: '저장하지 않은 문항이 있습니다',
        message: '작성 중인 새 문항이 있습니다. 그대로 진행하면 작성한 내용이 사라집니다. 계속하시겠습니까?',
        confirmLabel: '그대로 진행',
        cancelLabel: '문항 마저 작성',
        onConfirm: () => {
          setShowInlineAdd(false)
          setInlineDirty(false)
          next()
        },
      })
      return false
    }
    return true
  }

  const doSaveDraft = async () => {
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

  const handleSaveDraft = () => {
    if (!form.title) {
      setAlertDialog({ title: '임시저장 불가', message: '퀴즈 제목을 입력해주세요.', variant: 'error' })
      return
    }
    if (form.visible) {
      setAlertDialog({ title: '임시저장 불가', message: '학생에게 퀴즈 공개가 켜져 있습니다. 임시저장은 비공개 상태에서만 가능합니다.', variant: 'error' })
      return
    }
    if (!guardInlineDirty(() => doSaveDraft())) return
    doSaveDraft()
  }

  const addQuestion = useCallback((q) => {
    setQuestions(prev => prev.find(e => e.id === q.id) ? prev : [...prev, q])
  }, [])
  const addNewQuestion = useCallback((q) => {
    setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  }, [])
  const updateQuestion = (updated) => {
    setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...updated, id: editingQuestion.id } : q))
  }
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

  const doPublish = async () => {
    try {
      await persistQuiz('open')
      navigate('/')
    } catch (err) {
      console.error('[QuizCreate] 저장 실패', err)
      setAlertDialog({ title: '저장 실패', message: err?.message ?? '저장 중 오류가 발생했습니다.', variant: 'error' })
    }
  }

  const handlePublish = () => {
    const errors = getValidationErrors()
    if (errors.length > 0) {
      setAlertDialog({
        title: '필수 항목 미입력',
        message: errors[0],
      })
      return
    }
    if (!guardInlineDirty(() => setShowPublishReview(true))) return
    setShowPublishReview(true)
  }

  return (
    <>
      <div className="pb-4">
        <h1 className="text-[20px] sm:text-[22px] font-bold text-foreground pt-6 sm:pt-8 pb-4 sm:pb-5">새 퀴즈 만들기</h1>

        <StepIndicator
          steps={CREATE_STEPS}
          current={tab}
          onChange={setTab}
          completedSteps={getCompletedSteps(form, questions)}
        />

        {/* 탭은 unmount 하지 않고 CSS 로만 가린다 — 인라인 편집기의 작성 중 내용을 보존하기 위함 */}
        <div className="pt-5">
          <div className={tab === 'info' ? '' : 'hidden'}>
            <InfoTab form={form} set={set} />
          </div>
          <div className={tab === 'questions' ? '' : 'hidden'}>
            <QuestionsTab form={form} set={set} questions={questions} totalPoints={totalPoints} onShowBank={() => setShowBankModal(true)} onShowRandomBank={() => setShowRandomBankModal(true)} onShowAdd={() => setShowInlineAdd(true)} onEdit={setEditingQuestion} onRemove={removeQuestion} onMove={moveQuestion} showInlineAdd={showInlineAdd} onAddInline={(q) => { addNewQuestion(q); setShowInlineAdd(false); setInlineDirty(false) }} onCancelInline={() => { setShowInlineAdd(false); setInlineDirty(false) }} onInlineDirtyChange={setInlineDirty} />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between gap-2 mt-8 pt-5 border-t border-border flex-wrap">
          <Button size="lg" variant="ghost" onClick={handleCancel} className="text-muted-foreground hover:text-foreground px-4">취소</Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="lg"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={form.visible}
              title={form.visible ? '학생에게 퀴즈 공개가 켜진 상태에서는 임시저장할 수 없습니다' : undefined}
              className="px-4"
            >
              임시저장
            </Button>
            <Button size="lg" onClick={handlePublish} className="px-4">{form.visible ? '저장 후 공개' : '저장'}</Button>
          </div>
        </div>
      </div>

      <QuestionBankModal open={showBankModal} onOpenChange={setShowBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      <RandomQuestionBankModal open={showRandomBankModal} onOpenChange={setShowRandomBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      {editingQuestion && <AddQuestionModal onClose={() => setEditingQuestion(null)} onAdd={updateQuestion} initialQuestion={editingQuestion} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} confirmLabel={confirmDialog.confirmLabel} cancelLabel={confirmDialog.cancelLabel} onConfirm={() => { setConfirmDialog(null); confirmDialog.onConfirm() }} onCancel={() => setConfirmDialog(null)} />}
      {alertDialog && <AlertDialog title={alertDialog.title} message={alertDialog.message} variant={alertDialog.variant} onClose={() => setAlertDialog(null)} />}
      <PublishReviewModal
        open={showPublishReview}
        onOpenChange={setShowPublishReview}
        form={form}
        questions={questions}
        totalPoints={totalPoints}
        onConfirm={async () => { setShowPublishReview(false); await doPublish() }}
      />
    </>
  )
}

function InfoTab({ form, set }) {
  // D-05 R-002: 과목 기본값과 다른 항목 표시 + 되돌리기
  const overrides = diffFromDefaults(form)
  const revertToDefault = (which) => {
    const d = getQuizDefaultsForForm()
    if (which === 'attempts') { set('allowAttempts', d.allowAttempts); set('unlimitedAttempts', d.unlimitedAttempts) }
    else if (which === 'scorePolicy') set('scorePolicy', d.scorePolicy)
    else if (which === 'scoreReveal') { set('scoreRevealEnabled', d.scoreRevealEnabled); set('scoreRevealTiming', d.scoreRevealTiming) }
  }
  return (
    <div className="space-y-3">
      <Section title="시험 유형">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'graded', label: '평가용 퀴즈', desc: '성적에 반영됩니다' },
            { value: 'practice', label: '연습용 퀴즈', desc: '성적에 반영되지 않습니다' },
          ].map(opt => (
            <button key={opt.value} onClick={() => set('quizMode', opt.value)}
              className={cn('text-left p-3 rounded-md transition-all border-2',
                form.quizMode === opt.value ? 'border-primary bg-accent' : 'border-border bg-white'
              )}>
              <p className={cn('text-sm font-semibold', form.quizMode === opt.value ? 'text-primary' : 'text-secondary-foreground')}>{opt.label}</p>
              <p className={cn('text-xs mt-0.5', form.quizMode === opt.value ? 'text-primary' : 'text-muted-foreground')}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="기본 정보">
        <Field label="퀴즈 제목" required>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="예) 중간고사 - 데이터베이스 설계" className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
        </Field>
        <Field label="설명">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="학생에게 표시될 퀴즈 설명 (선택)" rows={8} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-y min-h-[176px] leading-relaxed" />
        </Field>
        {form.quizMode === 'graded' && (
          <Field label="평가 그룹">
            <div className="w-48">
              <CustomSelect
                value={form.assignmentGroupId}
                onChange={v => set('assignmentGroupId', v)}
                options={ASSIGNMENT_GROUPS.map(g => ({ value: g.id, label: g.label }))}
              />
            </div>
          </Field>
        )}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-secondary-foreground">주차/차시</label>
          <WeekSessionPicker
            week={form.week}
            session={form.session}
            onChange={({ week, session }) => { set('week', week); set('session', session) }}
            courseKey="CS301 데이터베이스"
          />
        </div>

        <div className="pt-3 mt-1 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-sm font-semibold text-secondary-foreground">응시 전 안내 사항</p>
            <p className="text-xs text-muted-foreground mt-0.5">응시 시작 전 학생에게 표시할 안내 문구를 작성합니다.</p>
          </div>
          <Toggle
            checked={form.noticeEnabled}
            onChange={v => set('noticeEnabled', v)}
            label="안내 사항 표시"
          />
          {form.noticeEnabled && (
            <textarea value={form.notice} onChange={e => set('notice', e.target.value)} rows={3} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-y leading-relaxed" placeholder="학생에게 안내할 퀴즈 정책을 입력하세요." />
          )}
        </div>
      </Section>

      <Section title="응시 기간">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={<span className="inline-flex items-center gap-1">응시 시작<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>학생이 퀴즈를 시작할 수 있는 시점입니다.<br />미설정 시 공개 즉시 응시 가능합니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}><DateTimePicker value={form.startDate} onChange={v => set('startDate', v)} /></Field>
          <Field label={<span className="inline-flex items-center gap-1">제출 마감<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>학생이 답안을 제출해야 하는 기한입니다.<br />마감 이후에는 제출이 불가합니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}><DateTimePicker value={form.dueDate} onChange={v => set('dueDate', v)} min={form.startDate || undefined} /></Field>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">미설정 시 응시 기간 제한 없이 학생이 언제든 응시할 수 있습니다.</p>
        <Field label={<span className="inline-flex items-center gap-1">이용 종료<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>퀴즈 페이지 자체에 접근할 수 없게 되는 시점입니다.<br />제출 마감 이후에도 학생이 결과를 확인할 수 있도록<br />이용 종료는 제출 마감 이후로 설정하는 것을 권장합니다.</p></TooltipContent></Tooltip></TooltipProvider></span>}>
          <DateTimePicker value={form.lockDate} onChange={v => set('lockDate', v)} />
          <p className="text-xs mt-1.5 text-muted-foreground">이용 종료가 지나면 학생은 퀴즈 정보를 확인할 수 없습니다. 미설정 시 제한 없음.</p>
          {form.lockDate && form.dueDate && new Date(form.lockDate) < new Date(form.dueDate) && (
            <div className="flex items-center gap-2 p-2.5 rounded-md text-xs bg-warning-bg/40 border border-warning-border text-secondary-foreground mt-2">
              <span>이용 종료가 제출 마감보다 앞서 있습니다. 마감 전에 퀴즈 접근이 차단될 수 있습니다.</span>
            </div>
          )}
        </Field>
        <div className="mt-1 space-y-3">
          <Toggle checked={form.allowLateSubmit} onChange={v => set('allowLateSubmit', v)} label="마감 후 지각 제출 허용" />
          {form.allowLateSubmit && (
            <div className="border-l-2 border-border pl-4 ml-0.5 space-y-2">
              <label className="block text-sm font-medium text-secondary-foreground">지각 제출 마감</label>
              <DateTimePicker value={form.lateSubmitDeadline} onChange={v => set('lateSubmitDeadline', v)} min={form.dueDate || undefined} />
              {!form.lateSubmitDeadline && <p className="text-xs text-muted-foreground">미설정 시 무제한 허용</p>}
            </div>
          )}
        </div>

        <div className="pt-3 mt-1 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-sm font-semibold text-secondary-foreground">추가 할당</p>
            <p className="text-xs text-muted-foreground mt-0.5">특정 학과 또는 학생에게 별도의 응시 기간을 부여합니다. 추가 할당은 위 응시 기간을 대체합니다.</p>
          </div>
          <AssignmentOverrides
            assignments={form.assignments}
            onChange={val => set('assignments', val)}
          />
        </div>
      </Section>

      <Section title="응시 조건">
        <div className="space-y-5">
          <div className="space-y-3">
            <Toggle
              checked={!form.unlimitedTimeLimit}
              onChange={v => {
                set('unlimitedTimeLimit', !v)
                if (!v) set('disableAutoSubmit', false)
              }}
              label="시간 제한 사용"
            />
            {!form.unlimitedTimeLimit && (
              <div className="border-l-2 border-border pl-4 ml-0.5 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="number" value={form.timeLimit} onChange={e => set('timeLimit', e.target.value)} placeholder="60" min={1} className="w-24 text-sm px-3 py-2 rounded-md border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
                  <span className="text-sm text-muted-foreground">분</span>
                </div>
                <Toggle
                  checked={form.disableAutoSubmit}
                  onChange={v => set('disableAutoSubmit', v)}
                  label={
                    <span className="inline-flex items-center gap-1">
                      자동 제출 5분 유예
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" sideOffset={4}><p>이용 종료 설정이 필수입니다.</p></TooltipContent></Tooltip></TooltipProvider>
                    </span>
                  }
                  description="제한 시간이 끝난 후 5분간 직접 제출이 가능하고, 5분이 지나면 자동 제출됩니다"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Toggle
              checked={form.allowAttempts >= 2 || form.unlimitedAttempts}
              onChange={v => {
                if (v) { set('unlimitedAttempts', false); set('allowAttempts', 2) }
                else { set('unlimitedAttempts', false); set('allowAttempts', 1) }
              }}
              label="재응시 허용"
              description="학생이 같은 퀴즈에 여러 번 응시할 수 있습니다"
            />
            <DefaultOverrideNotice show={overrides.attempts} onRevert={() => revertToDefault('attempts')} />
            {(form.allowAttempts >= 2 || form.unlimitedAttempts) && (
              <div className="border-l-2 border-border pl-4 ml-0.5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary-foreground shrink-0 w-24">적용할 점수</span>
                  <div className="w-48">
                    <CustomSelect value={form.scorePolicy} onChange={v => set('scorePolicy', v)} options={SCORE_POLICIES} />
                  </div>
                </div>
                <DefaultOverrideNotice show={overrides.scorePolicy} onRevert={() => revertToDefault('scorePolicy')} />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary-foreground shrink-0 w-24">제출 횟수 제한</span>
                  <div className="w-48">
                    <CustomSelect
                      value={form.unlimitedAttempts ? -1 : form.allowAttempts}
                      onChange={v => {
                        if (v === -1) set('unlimitedAttempts', true)
                        else { set('unlimitedAttempts', false); set('allowAttempts', v) }
                      }}
                      options={ATTEMPT_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      <SecuritySection form={form} set={set} />

      <Section title="성적 공개 정책">
        <div className="space-y-4">
          <Toggle checked={form.scoreRevealEnabled} onChange={v => set('scoreRevealEnabled', v)} label="성적 공개" description="제출 후 학생에게 성적 정보를 공개합니다" />
          <DefaultOverrideNotice show={overrides.scoreReveal} onRevert={() => revertToDefault('scoreReveal')} />
          {form.scoreRevealEnabled && (
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-xs font-semibold mb-2 text-secondary-foreground">공개 범위</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <p className="text-xs font-semibold mb-2 text-secondary-foreground">공개 시점</p>
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
                  <div className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-blue-100">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-secondary-foreground">공개 시작일</label>
                      <DateTimePicker value={form.scoreRevealStart} onChange={v => set('scoreRevealStart', v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-secondary-foreground">공개 종료일</label>
                      <DateTimePicker value={form.scoreRevealEnd} onChange={v => set('scoreRevealEnd', v)} min={form.scoreRevealStart || undefined} />
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

      <GradebookPolicySection value={form.gradebookPolicy} onChange={v => set('gradebookPolicy', v)} />

      <Section title="퀴즈 공개 여부">
        <Toggle
          checked={form.visible}
          onChange={v => set('visible', v)}
          label="학생에게 퀴즈 공개"
          description="공개 시 저장 후 학생이 즉시 응시할 수 있습니다. 임시저장은 비공개 상태에서만 가능합니다."
        />
      </Section>
    </div>
  )
}

// 랜덤 출제 그룹 카드: 학생별로 다른 문항이 뽑히는 placeholder. 본문/정답 영역 없음
function RandomGroupItemCard({ group, index, dragIdx, overIdx, onDragStart, onDragOver, onDrop, onDragEnd, onRemove }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={cn('rounded-lg border-2 border-dashed group transition-all bg-accent/30',
        overIdx === index && dragIdx !== index ? 'border-primary shadow-sm' : 'border-primary/40 hover:border-primary/60',
        dragIdx === index && 'opacity-40'
      )}
    >
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <GripVertical size={14} className="cursor-grab active:cursor-grabbing text-muted-foreground/40" />
            <span className="text-xs font-bold w-5 text-center text-muted-foreground">{index + 1}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 gap-1">
              <Shuffle size={11} />
              랜덤 출제 그룹
            </Badge>
            <span className="text-xs text-muted-foreground">
              {group.bankName} 문제은행에서 <span className="font-semibold text-foreground">{group.count}문항</span>
            </span>
            <span className="text-xs text-muted-foreground">· 총 {group.points}점</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => onRemove(group.id)} title="그룹 삭제" className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive-soft transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <p className="text-xs mt-2 ml-8 text-secondary-foreground leading-relaxed">
          학생마다 서로 다른 <span className="font-semibold text-foreground">{group.count}개</span> 문항이 랜덤으로 출제됩니다
          {group.useDifficultyScoring
            ? ' (난이도별 차등 배점)'
            : ` · 문항당 ${group.pointsPerQuestion}점`}
        </p>
      </div>
    </div>
  )
}

function QuestionsTab({ form, set, questions, totalPoints, onShowBank, onShowRandomBank, onShowAdd, onEdit, onRemove, onMove, showInlineAdd, onAddInline, onCancelInline, onInlineDirtyChange }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const [allExpanded, setAllExpanded] = useState(false)

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx !== null && dragIdx !== i) onMove(dragIdx, i)
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  const { questionCount } = summarizeQuizItems(questions)

  return (
    <div className="space-y-3">
      <Section title="문항 표시 설정">
        <div className="space-y-3">
          <Toggle checked={form.shuffleChoices} onChange={v => set('shuffleChoices', v)} label="선지 순서 섞기" description="객관식 문항의 선지 순서가 학생마다 무작위로 표시됩니다" />
          <Toggle checked={form.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} label="문제 순서 섞기" description="문제 순서가 학생마다 무작위로 표시됩니다" />
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
            <div className="border-l-2 border-border pl-4 ml-0.5 space-y-2">
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

      {/* 헤더: 문항 수/점수 + 액션 버튼 */}
      <div className="flex items-center justify-between gap-2 mb-4 px-1 pt-2 py-0.5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[13px] text-secondary-foreground leading-none">
            <span className="font-semibold text-foreground">{questionCount}</span>문항
            <span className="text-muted-foreground mx-1.5">|</span>
            총 <span className="font-semibold text-foreground">{totalPoints}</span>점
          </p>
          {/* 랜덤 출제만 있으면 펼칠 본문이 없어 토글을 숨긴다 (XQ-57) */}
          {questions.some(q => !isRandomGroup(q)) && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Switch size="sm" checked={allExpanded} onCheckedChange={setAllExpanded} />
              <span className="text-[13px] text-secondary-foreground leading-none">모두 펼치기</span>
            </label>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="lg" variant="outline" onClick={onShowAdd}>문항 만들기</Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="lg">
                문제은행에서 추가
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-1.5">
              <button onClick={onShowBank} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors">
                <p className="text-sm font-medium text-foreground">직접 선택</p>
                <p className="text-xs text-muted-foreground mt-0.5">문제은행에서 원하는 문항을 골라 추가합니다</p>
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
      {questions.length === 0 && !showInlineAdd ? (
        <div className="p-14 text-center rounded-md border-2 border-dashed border-border bg-secondary space-y-1.5">
          <p className="text-sm text-secondary-foreground">아직 추가된 문항이 없습니다</p>
          <p className="text-xs text-muted-foreground">상단의 "문항 만들기" 또는 "문제은행에서 추가" 버튼으로 시작합니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.length > 0 && questions.map((q, i) => isRandomGroup(q) ? (
            <RandomGroupItemCard
              key={q.id}
              group={q}
              index={i}
              dragIdx={dragIdx}
              overIdx={overIdx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onRemove={onRemove}
            />
          ) : (
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
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{QUIZ_TYPES[q.type]?.label}</Badge>
                    <span className="text-xs text-muted-foreground">{q.points}점</span>
                    {QUIZ_TYPES[q.type]?.autoGrade === false && <Badge variant="secondary" className="bg-warning-bg text-warning-foreground">수동채점</Badge>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onEdit(q)} title="문항 편집" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onRemove(q.id)} title="문항 삭제" className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive-soft transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 중단 행: 문제 본문 (HTML 태그 제거 후 요약 표시) */}
                <p className={cn('text-sm font-medium text-secondary-foreground mt-2 ml-8', !allExpanded && 'line-clamp-2')}>{htmlToPlainText(q.text)}</p>

                {/* 하단 행: 정답 영역 */}
                {q.type !== 'essay' && q.type !== 'file_upload' && q.type !== 'text' && (
                  allExpanded ? (
                    <div className="mt-1.5 ml-8">
                      <QuestionAnswer q={q} expanded />
                    </div>
                  ) : (
                    <div className="mt-1.5 ml-8 bg-secondary/80 rounded px-2.5 py-1.5">
                      <QuestionAnswer q={q} />
                    </div>
                  )
                )}

                {allExpanded && (q.type === 'essay' || q.type === 'file_upload' || q.type === 'text') && (
                  <p className="mt-1.5 ml-8 text-[13px] text-muted-foreground">정답이 없는 수동 채점 문항입니다</p>
                )}
              </div>
            </div>
          ))}
          {showInlineAdd && (
            <InlineQuestionEditor
              index={questions.length}
              prevType={questions[questions.length - 1]?.type}
              onAdd={onAddInline}
              onCancel={onCancelInline}
              onDirtyChange={onInlineDirtyChange}
            />
          )}
        </div>
      )}
    </div>
  )
}


