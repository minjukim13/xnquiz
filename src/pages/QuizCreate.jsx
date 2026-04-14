import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2, AlertCircle, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout'
import CustomSelect from '../components/CustomSelect'
import QuestionAnswer from '../components/QuestionAnswer'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import RandomQuestionBankModal from '../components/RandomQuestionBankModal'
import { QUIZ_TYPES, mockQuizzes } from '../data/mockData'
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

const WEEK_OPTIONS = [
  { value: null, label: '선택 안함' },
  ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` })),
]
const SESSION_OPTIONS = [
  { value: null, label: '선택 안함' },
  ...[1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` })),
]
const TIME_LIMIT_OPTIONS = [
  { value: 0, label: '제한 없음' },
  { value: 30, label: '30분' },
  { value: 60, label: '60분' },
  { value: 90, label: '90분' },
  { value: 120, label: '120분' },
  { value: -1, label: '직접 입력' },
]
const ATTEMPT_OPTIONS = [
  { value: 1, label: '1회' },
  { value: 2, label: '2회' },
  { value: 3, label: '3회' },
  { value: -1, label: '무제한' },
]
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

const DEFAULT_NOTICE = `- 제출 후에는 답안을 수정할 수 없습니다.
- 타인과의 협력 및 자료 공유는 금지됩니다.
- 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.`

export default function QuizCreate() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({
    title: '', description: '', week: null, session: null,
    startDate: '', dueDate: '', timeLimitType: 60, timeLimitCustom: '',
    allowAttempts: 1, scorePolicy: '최고 점수 유지',
    shuffleChoices: false, shuffleQuestions: false,
    scoreRevealEnabled: false, scoreRevealScope: 'wrong_only',
    scoreRevealTiming: 'immediately', scoreRevealStart: '', scoreRevealEnd: '',
    quizMode: 'graded', accessCode: '', ipRestriction: '',
    allowLateSubmit: false, lateSubmitHours: '',
    notice: DEFAULT_NOTICE,
  })
  const [questions, setQuestions] = useState([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [showRandomBankModal, setShowRandomBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [alertDialog, setAlertDialog] = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const isFormValid = form.title && form.startDate && form.dueDate
    && new Date(form.dueDate) > new Date(form.startDate) && questions.length > 0

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

  const handlePublish = () => {
    const isMultiAttempt = form.allowAttempts >= 2 || form.allowAttempts === -1
    const noRevealPeriod = form.scoreRevealEnabled && form.scoreRevealTiming !== 'period' && form.scoreRevealTiming !== 'after_due'
    const doPublish = () => {
      mockQuizzes.push({
        id: String(Date.now()), title: form.title, description: form.description,
        course: 'CS301 데이터베이스', quizMode: form.quizMode, status: 'open', visible: true,
        startDate: form.startDate, dueDate: form.dueDate,
        week: form.week ?? null, session: form.session ?? null,
        timeLimit: form.timeLimitType === -1 ? Number(form.timeLimitCustom) || 0 : form.timeLimitType,
        allowAttempts: form.allowAttempts,
        scorePolicy: form.allowAttempts >= 2 || form.allowAttempts === -1 ? form.scorePolicy : null,
        shuffleChoices: form.shuffleChoices, shuffleQuestions: form.shuffleQuestions,
        scoreRevealEnabled: form.scoreRevealEnabled,
        scoreRevealScope: form.scoreRevealEnabled ? form.scoreRevealScope : null,
        scoreRevealTiming: form.scoreRevealEnabled ? form.scoreRevealTiming : null,
        scoreRevealStart: (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealStart || null : null,
        scoreRevealEnd: (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealEnd || null : null,
        accessCode: form.accessCode || null, ipRestriction: form.ipRestriction || null,
        allowLateSubmit: form.allowLateSubmit,
        lateSubmitHours: form.allowLateSubmit && form.lateSubmitHours ? Number(form.lateSubmitHours) : null,
        notice: form.notice,
        totalStudents: 0, submitted: 0, graded: 0, pendingGrade: 0,
        questions: questions.length, totalPoints,
      })
      navigate('/')
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
    <Layout breadcrumbs={[{ label: '퀴즈 관리', href: '/' }, { label: '새 퀴즈 만들기' }]}>
      <div className="max-w-5xl mx-auto pb-4">
        <h1 className="text-[22px] font-bold text-foreground pt-3 pb-5">새 퀴즈 만들기</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className="gap-4 border-b border-border pb-0">
            <TabsTrigger value="info" className="text-[14px] px-1 pb-2.5">기본 정보</TabsTrigger>
            <TabsTrigger value="questions" className="text-[14px] px-1 pb-2.5">
              문항 구성{questions.length > 0 && ` (${questions.length})`}
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
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-border">
          <Button size="lg" variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground px-4">취소</Button>
          <div className="flex items-center gap-2">
            <Button size="lg" variant="outline" className="px-4">임시저장</Button>
            {tab === 'info' ? (
              <Button size="lg" onClick={() => setTab('questions')} className="px-4">문항 구성 →</Button>
            ) : (
              <Button size="lg" disabled={!isFormValid} onClick={handlePublish} className="px-4">저장하기</Button>
            )}
          </div>
        </div>
      </div>

      <QuestionBankModal open={showBankModal} onOpenChange={setShowBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      <RandomQuestionBankModal open={showRandomBankModal} onOpenChange={setShowRandomBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse="CS301 데이터베이스" />
      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onAdd={addNewQuestion} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} onConfirm={() => { setConfirmDialog(null); confirmDialog.onConfirm() }} onCancel={() => setConfirmDialog(null)} />}
      {alertDialog && <AlertDialog title={alertDialog.title} message={alertDialog.message} variant={alertDialog.variant} onClose={() => setAlertDialog(null)} />}
    </Layout>
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
          <div className="flex items-start gap-2 p-2.5 rounded-md text-xs bg-amber-50 border border-amber-300 text-amber-800">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
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
          <Field label="주차"><CustomSelect value={form.week} onChange={v => set('week', v)} options={WEEK_OPTIONS} placeholder="주차 선택" /></Field>
          <Field label="차시"><CustomSelect value={form.session} onChange={v => set('session', v)} options={SESSION_OPTIONS} placeholder="차시 선택" /></Field>
        </div>
      </Section>

      <Section title="응시 기간">
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작 일시" required><input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" /></Field>
          <Field label="마감 일시" required><input type="datetime-local" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" /></Field>
        </div>
        <div className="mt-1 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.allowLateSubmit} onChange={e => set('allowLateSubmit', e.target.checked)} className="rounded accent-primary" />
            <span className="text-sm text-slate-600">마감 후 지각 제출 허용</span>
          </label>
          {form.allowLateSubmit && (
            <div className="flex items-center gap-2 pl-6">
              <input type="number" value={form.lateSubmitHours} onChange={e => set('lateSubmitHours', e.target.value)} placeholder="예: 24" min={1} className="w-24 text-sm px-3 py-2 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all" />
              <span className="text-sm text-slate-600">시간까지 허용</span>
              <span className="text-xs text-muted-foreground">(비우면 무제한)</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="응시 설정">
        <div className="grid grid-cols-2 gap-4">
          <Field label="응시 시간 제한">
            <CustomSelect value={form.timeLimitType} onChange={v => set('timeLimitType', v)} options={TIME_LIMIT_OPTIONS} placeholder="제한 선택" />
            {form.timeLimitType === -1 && (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" value={form.timeLimitCustom} onChange={e => set('timeLimitCustom', e.target.value)} placeholder="분 입력" min={1} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:border-primary transition-all" />
                <span className="text-sm shrink-0 text-muted-foreground">분</span>
              </div>
            )}
          </Field>
          <Field label="최대 응시 횟수"><CustomSelect value={form.allowAttempts} onChange={v => set('allowAttempts', v)} options={ATTEMPT_OPTIONS} /></Field>
        </div>
        {(form.allowAttempts >= 2 || form.allowAttempts === -1) && (
          <Field label="복수 응시 시 채점 방식"><CustomSelect value={form.scorePolicy} onChange={v => set('scorePolicy', v)} options={SCORE_POLICIES} /></Field>
        )}
      </Section>

      <Section title="문항 표시 설정">
        <div className="space-y-3">
          <Toggle checked={form.shuffleChoices} onChange={v => set('shuffleChoices', v)} label="선택지 무작위 배열" description="학생마다 선택지 순서가 달라집니다" />
          <Toggle checked={form.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} label="문항 순서 무작위" description="학생마다 문항 순서가 달라집니다" />
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
      <div className="flex items-center justify-between mb-5">
        <p className="text-[14px] text-secondary-foreground">
          <span className="font-semibold text-foreground">{questions.length}</span>문항
          {' '}
          <span className="text-muted-foreground mx-1">|</span>
          {' '}
          총 <span className="font-semibold text-foreground">{totalPoints}</span>점
        </p>
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="outline" className="gap-1.5">
                문제은행에서 추가 <ChevronDown size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className=""
            >
              <DropdownMenuItem onClick={onShowBank} className="cursor-pointer py-2 text-sm">
                직접 선택
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowRandomBank} className="cursor-pointer py-2 text-sm">
                랜덤 출제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="lg" onClick={onShowAdd} >직접 추가</Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="p-14 text-center rounded-md border-2 border-dashed border-border bg-slate-50">
          <p className="text-sm mb-4 text-muted-foreground/60">아직 추가된 문항이 없습니다</p>
          <div className="flex items-center justify-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant="outline" className="gap-1.5">
                  문제은행에서 추가 <ChevronDown size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="w-auto p-2 border-0"
                style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}
              >
                <DropdownMenuItem onClick={onShowBank} className="cursor-pointer py-2 text-sm">
                  직접 선택
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowRandomBank} className="cursor-pointer py-2 text-sm">
                  랜덤 출제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="lg" onClick={onShowAdd} >직접 추가</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={handleDragEnd}
              className={cn('flex items-start gap-2 bg-white p-3 group transition-all rounded-md border',
                overIdx === i && dragIdx !== i ? 'border-primary bg-accent/50' : 'border-border',
                dragIdx === i && 'opacity-40'
              )}>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <GripVertical size={14} className="cursor-grab active:cursor-grabbing text-muted-foreground/40" />
                <span className="text-xs font-bold w-5 text-center text-muted-foreground">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">{QUIZ_TYPES[q.type]?.label}</Badge>
                  <span className="text-xs text-muted-foreground">{q.points}점</span>
                  {QUIZ_TYPES[q.type]?.autoGrade === false && <Badge variant="secondary" className="bg-orange-50 text-orange-700">수동채점</Badge>}
                  {q.bankName && <Badge variant="secondary" className="bg-sky-50 text-sky-700">{q.bankName}</Badge>}
                </div>
                <p className="text-sm line-clamp-2 text-slate-700">{q.text}</p>
                <QuestionAnswer q={q} />
              </div>
              <button onClick={() => onRemove(q.id)} className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-600 transition-all">
                <Trash2 size={14} />
              </button>
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
