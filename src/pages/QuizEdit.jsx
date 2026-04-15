import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, GripVertical, Trash2, Settings2, Pencil, Printer, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import RandomQuestionBankModal from '../components/RandomQuestionBankModal'
import { printQuizQuestions } from '../utils/pdfUtils'
import CustomSelect from '../components/CustomSelect'
import QuestionAnswer from '../components/QuestionAnswer'
import { QUIZ_TYPES, mockQuizzes, getQuizQuestions, setQuizQuestions, recalculateScorePolicy } from '../data/mockData'
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

const WEEK_OPTIONS = [{ value: null, label: '선택 안함' }, ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` }))]
const SESSION_OPTIONS = [{ value: null, label: '선택 안함' }, ...[1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` }))]
const ATTEMPT_MIN = 1
const ATTEMPT_MAX = 99
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

const INPUT_CLS = "w-full text-sm font-medium text-slate-700 px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all"

export default function QuizEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const [showBankModal, setShowBankModal] = useState(false)
  const [showRandomBankModal, setShowRandomBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questions, setQuestions] = useState(() => getQuizQuestions(quiz.id))
  const [initialQuestionsSnapshot] = useState(() => JSON.stringify(getQuizQuestions(quiz.id)))
  const [title, setTitle] = useState(quiz.title ?? '')
  const [description, setDescription] = useState(quiz.description ?? '')
  const [week, setWeek] = useState(quiz.week ?? null)
  const [session, setSession] = useState(quiz.session ?? null)
  const [allowLateSubmit, setAllowLateSubmit] = useState(quiz.allowLateSubmit ?? false)
  const [lateSubmitDeadline, setLateSubmitDeadline] = useState(quiz.lateSubmitDeadline ?? '')
  const [lockDate, setLockDate] = useState(quiz.lockDate ?? '')
  const [timeLimit, setTimeLimit] = useState(String(quiz.timeLimit ?? 60))
  const [allowAttempts, setAllowAttempts] = useState(quiz.allowAttempts === -1 ? 1 : (quiz.allowAttempts ?? 1))
  const [unlimitedAttempts, setUnlimitedAttempts] = useState(quiz.allowAttempts === -1)
  const [scorePolicy, setScorePolicy] = useState(quiz.scorePolicy ?? '최고 점수 유지')
  const [shuffleChoices, setShuffleChoices] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [scoreRevealEnabled, setScoreRevealEnabled] = useState(quiz.scoreRevealEnabled ?? false)
  const [scoreRevealScope, setScoreRevealScope] = useState(quiz.scoreRevealScope ?? 'wrong_only')
  const [scoreRevealTiming, setScoreRevealTiming] = useState(quiz.scoreRevealTiming ?? 'immediately')
  const [scoreRevealStart, setScoreRevealStart] = useState(quiz.scoreRevealStart ?? '')
  const [scoreRevealEnd, setScoreRevealEnd] = useState(quiz.scoreRevealEnd ?? '')
  const [accessCode, setAccessCode] = useState('')
  const [ipRestriction, setIpRestriction] = useState('')
  const [quizMode, setQuizMode] = useState('graded')
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const addQuestion = (q) => { if (!questions.find(e => e.id === q.id)) setQuestions(prev => [...prev, q]) }
  const addNewQuestion = (q) => setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  const updateQuestion = (updated) => setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...updated, id: editingQuestion.id } : q))
  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const moveQuestion = useCallback((fromIdx, toIdx) => { setQuestions(prev => { const next = [...prev]; const [moved] = next.splice(fromIdx, 1); next.splice(toIdx, 0, moved); return next }) }, [])
  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => { if (dragIdx !== null && dragIdx !== i) moveQuestion(dragIdx, i); setDragIdx(null); setOverIdx(null) }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const isMultiAttempt = allowAttempts >= 2 || unlimitedAttempts
  const [editingQuestion, setEditingQuestion] = useState(null)
  const submittedCount = quiz.submitted || 0

  // 변경사항 감지
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(questions) !== initialQuestionsSnapshot ||
      title !== (quiz.title ?? '') ||
      description !== (quiz.description ?? '')
  }, [questions, initialQuestionsSnapshot, title, description, quiz.title, quiz.description])

  // 브라우저 뒤로가기/새로고침 시 경고
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  const [confirmDialog, setConfirmDialog] = useState(null)
  const [alertDialog, setAlertDialog] = useState(null)

  // react-router 네비게이션 시 경고 (브레드크럼 등)
  const safeNavigate = useCallback((path) => {
    if (hasUnsavedChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 나가시겠습니까?')) return
    navigate(path)
  }, [hasUnsavedChanges, navigate])

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setConfirmDialog({
        title: '편집 취소',
        message: '저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠습니까?',
        onConfirm: () => navigate('/'),
      })
    } else {
      navigate('/')
    }
  }

  const handleSaveDraft = () => {
    const idx = mockQuizzes.findIndex(q => q.id === quiz.id)
    if (idx !== -1) {
      if (scorePolicy !== quiz.scorePolicy) recalculateScorePolicy(quiz.id, scorePolicy)
      mockQuizzes[idx] = { ...mockQuizzes[idx], title, description, week: week ?? null, session: session ?? null, status: quiz.status, questions: questions.length, totalPoints, timeLimit: timeLimit === '' ? 0 : Number(timeLimit), allowAttempts: unlimitedAttempts ? -1 : allowAttempts, scorePolicy, allowLateSubmit, lateSubmitDeadline: allowLateSubmit && lateSubmitDeadline ? lateSubmitDeadline : null, lockDate: lockDate || null, scoreRevealEnabled, scoreRevealScope: scoreRevealEnabled ? scoreRevealScope : null, scoreRevealTiming: scoreRevealEnabled ? scoreRevealTiming : null, scoreRevealStart: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealStart || null : null, scoreRevealEnd: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealEnd || null : null }
    }
    setQuizQuestions(quiz.id, questions)
    setAlertDialog({ title: '임시저장 완료', message: '변경사항이 임시저장되었습니다.' })
  }

  const handleSave = () => {
    const idx = mockQuizzes.findIndex(q => q.id === quiz.id)
    if (idx !== -1) {
      if (scorePolicy !== quiz.scorePolicy) recalculateScorePolicy(quiz.id, scorePolicy)
      mockQuizzes[idx] = { ...mockQuizzes[idx], title, description, week: week ?? null, session: session ?? null, status: quiz.status, questions: questions.length, totalPoints, timeLimit: timeLimit === '' ? 0 : Number(timeLimit), allowAttempts: unlimitedAttempts ? -1 : allowAttempts, scorePolicy, allowLateSubmit, lateSubmitDeadline: allowLateSubmit && lateSubmitDeadline ? lateSubmitDeadline : null, lockDate: lockDate || null, scoreRevealEnabled, scoreRevealScope: scoreRevealEnabled ? scoreRevealScope : null, scoreRevealTiming: scoreRevealEnabled ? scoreRevealTiming : null, scoreRevealStart: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealStart || null : null, scoreRevealEnd: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealEnd || null : null }
    }
    setQuizQuestions(quiz.id, questions)
    // 문항이 변경되었으면 수정 타임스탬프 기록 (수정 전 제출 학생 필터용)
    if (JSON.stringify(questions) !== initialQuestionsSnapshot) {
      try {
        const raw = localStorage.getItem('xnq_questions_modified') || '{}'
        const map = JSON.parse(raw)
        map[quiz.id] = new Date().toISOString()
        localStorage.setItem('xnq_questions_modified', JSON.stringify(map))
      } catch { /* ignore */ }
    }
    sessionStorage.setItem('xnq_toast', '저장되었습니다.')
    navigate('/')
  }

  return (
    <Layout breadcrumbs={[{ label: '퀴즈 관리', onClick: () => safeNavigate('/') }, { label: quiz.title }, { label: '편집' }]}>
      <div className="max-w-7xl mx-auto pb-6">
        <div className="flex items-center justify-between gap-3 pt-3 pb-4">
          <h1 className="text-[24px] font-bold text-foreground leading-tight">퀴즈 편집</h1>
          <div className="flex items-center gap-3">
            {quiz.status !== 'draft' && (
              <button onClick={() => { const i2 = mockQuizzes.findIndex(q => q.id === quiz.id); if (i2 !== -1) mockQuizzes[i2] = { ...mockQuizzes[i2], visible: !mockQuizzes[i2].visible } }} className={cn('flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md border', quiz.visible !== false ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200')}>
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', quiz.visible !== false ? 'bg-green-600' : 'bg-red-600')} />{quiz.visible !== false ? '공개 중' : '비공개'}
              </button>
            )}
            <Button size="lg" variant="ghost" onClick={handleCancel} className="text-muted-foreground hover:text-foreground">취소</Button>
            <Button size="lg" variant="outline" onClick={handleSaveDraft}>임시저장</Button>
            <Button size="lg" variant="outline" onClick={() => questions.length > 0 && printQuizQuestions(quiz, questions)} disabled={questions.length === 0}><Printer size={15} />문제지 인쇄</Button>
            <Button size="lg" onClick={handleSave} className="px-5">저장</Button>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-semibold text-slate-800">문항 구성</h2><p className="text-sm mt-0.5 text-muted-foreground">{questions.length}문항 · 총 {totalPoints}점</p></div>
              <div className="flex items-center gap-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="gap-1.5">문제은행에서 추가 <ChevronDown size={15} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className=""
                  >
                    <DropdownMenuItem onClick={() => setShowBankModal(true)} className="cursor-pointer py-2 text-sm">
                      직접 선택
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRandomBankModal(true)} className="cursor-pointer py-2 text-sm">
                      랜덤 출제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="lg" onClick={() => setShowAddModal(true)} ><Plus size={15} />직접 추가</Button>
              </div>
            </div>
            {questions.length === 0 ? (
              <div className="p-12 text-center rounded-md border-2 border-dashed border-border bg-slate-50">
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
                      <DropdownMenuItem onClick={() => setShowBankModal(true)} className="cursor-pointer py-2 text-sm">
                        직접 선택
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowRandomBankModal(true)} className="cursor-pointer py-2 text-sm">
                        랜덤 출제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="lg" onClick={() => setShowAddModal(true)} >직접 추가</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={handleDragEnd} className={cn('flex items-start gap-2 bg-white p-3 group transition-all rounded-md border', overIdx === i && dragIdx !== i ? 'border-primary bg-accent/50' : 'border-border', dragIdx === i && 'opacity-40')}>
                    <div className="flex items-center gap-2 shrink-0 h-5 mt-[3px]"><GripVertical size={14} className="cursor-grab active:cursor-grabbing text-muted-foreground/40" /><span className="text-xs font-bold w-5 text-center text-muted-foreground">{i + 1}</span></div>
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
                    <div className="shrink-0 flex items-center gap-1">
                      <button onClick={() => setEditingQuestion(q)} title="문항 편집" className="p-1 text-muted-foreground/40 hover:text-primary transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => removeQuestion(q.id)} className="p-1 text-muted-foreground/40 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <SC title="기본 정보"><SF label="퀴즈 제목"><input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT_CLS} placeholder="퀴즈 제목을 입력하세요" /></SF><SF label="퀴즈 설명"><textarea value={description} onChange={e => setDescription(e.target.value)} className={cn(INPUT_CLS, 'resize-none')} rows={3} placeholder="학생에게 표시될 퀴즈 설명 (선택)" /></SF><div className="grid grid-cols-2 gap-2"><SF label="주차"><CustomSelect value={week} onChange={v => { setWeek(v); if (v !== null && !session) setSession(1); if (v === null) setSession(null) }} options={WEEK_OPTIONS} placeholder="선택 안함" /></SF><SF label="차시"><CustomSelect value={session} onChange={setSession} options={SESSION_OPTIONS} placeholder="선택 안함" /></SF></div></SC>
            <SC title="퀴즈 유형"><div className="grid grid-cols-2 gap-2">{[{ value: 'graded', label: '평가용', desc: '성적 반영' }, { value: 'practice', label: '연습용', desc: '성적 미반영' }].map(opt => (<button key={opt.value} onClick={() => setQuizMode(opt.value)} className={cn('text-left p-2.5 rounded-md transition-all border-2', quizMode === opt.value ? 'border-primary bg-accent' : 'border-border bg-white')}><p className={cn('text-sm font-semibold', quizMode === opt.value ? 'text-primary' : 'text-slate-700')}>{opt.label}</p><p className={cn('text-xs mt-0.5', quizMode === opt.value ? 'text-primary' : 'text-muted-foreground')}>{opt.desc}</p></button>))}</div></SC>
            <SC title="응시 설정"><SF label="응시 시간 제한"><div className="flex items-center gap-2"><input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="제한 없음" min={0} className={INPUT_CLS} /><span className="text-xs shrink-0 text-muted-foreground">분</span></div><p className="text-xs mt-1.5 text-muted-foreground">비워두거나 0 입력 시 시간 제한 없음</p></SF><SF label="최대 응시 횟수"><div className="flex items-center gap-3">{!unlimitedAttempts && <div className="flex items-center border border-border rounded-md overflow-hidden"><button type="button" onClick={() => setAllowAttempts(Math.max(ATTEMPT_MIN, allowAttempts - 1))} disabled={allowAttempts <= ATTEMPT_MIN} className="px-3 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">-</button><span className="px-4 py-2.5 text-sm font-medium text-foreground min-w-[48px] text-center border-x border-border bg-white">{allowAttempts}회</span><button type="button" onClick={() => setAllowAttempts(Math.min(ATTEMPT_MAX, allowAttempts + 1))} disabled={allowAttempts >= ATTEMPT_MAX} className="px-3 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button></div>}<label className="flex items-center gap-1.5 cursor-pointer shrink-0"><input type="checkbox" checked={unlimitedAttempts} onChange={e => setUnlimitedAttempts(e.target.checked)} className="rounded accent-primary" /><span className="text-sm text-secondary-foreground">무제한</span></label></div></SF>{isMultiAttempt && <SF label="복수 응시 시 채점 방식"><CustomSelect value={scorePolicy} onChange={setScorePolicy} options={SCORE_POLICIES} /></SF>}<div className="space-y-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowLateSubmit} onChange={e => setAllowLateSubmit(e.target.checked)} className="rounded accent-primary" /><span className="text-sm font-medium text-slate-700">마감 후 지각 제출 허용</span></label>{allowLateSubmit && <div className="pl-5 mt-1"><SF label="지각 제출 마감 일시"><input type="datetime-local" value={lateSubmitDeadline} onChange={e => setLateSubmitDeadline(e.target.value)} className={INPUT_CLS} /></SF>{!lateSubmitDeadline && <p className="text-xs mt-1 text-muted-foreground">미설정 시 무제한 허용</p>}</div>}</div><SF label="이용 종료 일시"><input type="datetime-local" value={lockDate} onChange={e => setLockDate(e.target.value)} className={INPUT_CLS} /><p className="text-xs mt-1.5 text-muted-foreground">이용 종료 일시가 지나면 학생은 퀴즈 정보를 확인할 수 없습니다. 미설정 시 제한 없음.</p></SF></SC>
            <SC title="표시 설정"><div className="space-y-3"><Tgl checked={shuffleChoices} onChange={setShuffleChoices} label="선택지 무작위 배열" /><Tgl checked={shuffleQuestions} onChange={setShuffleQuestions} label="문항 순서 무작위" /><Tgl checked={scoreRevealEnabled} onChange={setScoreRevealEnabled} label="성적 공개" />{scoreRevealEnabled && <div className="space-y-3 pl-1"><div><p className="text-sm font-semibold mb-2 text-slate-600">공개 범위</p><div className="grid grid-cols-2 gap-2">{[{ value: 'wrong_only', label: '오답 여부만', desc: '정오답 + 점수' }, { value: 'with_answer', label: '정답까지', desc: '정오답 + 점수 + 정답' }].map(opt => (<button key={opt.value} type="button" onClick={() => setScoreRevealScope(opt.value)} className={cn('flex flex-col items-start gap-0.5 p-2.5 rounded-lg text-left w-full transition-all border-2', scoreRevealScope === opt.value ? 'border-primary bg-accent' : 'border-border bg-white')}><span className={cn('text-sm font-semibold', scoreRevealScope === opt.value ? 'text-primary' : 'text-slate-700')}>{opt.label}</span><span className="text-xs text-muted-foreground">{opt.desc}</span></button>))}</div></div><div><p className="text-sm font-semibold mb-2 text-slate-600">공개 시점</p><div className="space-y-1.5">{[{ value: 'immediately', label: '제출 즉시' }, { value: 'after_due', label: '마감 후' }, { value: 'period', label: '기간 설정' }].map(opt => (<label key={opt.value} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="revealTimingEdit" checked={scoreRevealTiming === opt.value} onChange={() => setScoreRevealTiming(opt.value)} className="accent-primary" /><span className="text-sm font-medium text-slate-700">{opt.label}</span></label>))}</div>{scoreRevealTiming === 'period' && <div className="mt-2 pt-2 space-y-1.5 border-t border-blue-100"><div><label className="block text-sm font-semibold mb-2 text-slate-600">공개 시작일</label><input type="datetime-local" value={scoreRevealStart} onChange={e => setScoreRevealStart(e.target.value)} className={INPUT_CLS} /></div><div><label className="block text-sm font-semibold mb-2 text-slate-600">공개 종료일</label><input type="datetime-local" value={scoreRevealEnd} onChange={e => setScoreRevealEnd(e.target.value)} className={INPUT_CLS} /></div></div>}</div></div>}</div></SC>
            <SC title="접근 제한"><SF label="액세스 코드"><input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="코드 입력 시 응시 시 코드 필요" className={INPUT_CLS} /></SF><SF label="접근 가능한 IP 주소"><textarea value={ipRestriction} onChange={e => setIpRestriction(e.target.value)} placeholder={'IP 주소를 한 줄에 하나씩\n예) 192.168.1.0/24'} rows={2} className={cn(INPUT_CLS, 'resize-none')} /><p className="text-xs mt-1.5 text-muted-foreground">비워두면 모든 IP 허용. CIDR 지원.</p></SF></SC>
          </div>
        </div>
      </div>
      <QuestionBankModal open={showBankModal} onOpenChange={setShowBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse={quiz?.course} />
      <RandomQuestionBankModal open={showRandomBankModal} onOpenChange={setShowRandomBankModal} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse={quiz?.course} />
      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onAdd={addNewQuestion} />}
      {editingQuestion && <AddQuestionModal onClose={() => setEditingQuestion(null)} onAdd={updateQuestion} initialQuestion={editingQuestion} submittedCount={submittedCount} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} onConfirm={() => { setConfirmDialog(null); confirmDialog.onConfirm() }} onCancel={() => setConfirmDialog(null)} />}
      {alertDialog && <AlertDialog title={alertDialog.title} message={alertDialog.message} variant={alertDialog.variant} onClose={() => setAlertDialog(null)} />}
    </Layout>
  )
}

function SC({ title, children }) { return <Card><CardContent className="px-5 pb-4 pt-0 space-y-3"><h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-border"><Settings2 size={16} className="text-slate-900" />{title}</h3>{children}</CardContent></Card> }
function SF({ label, children }) { return <div><label className="text-sm font-semibold block mb-2 text-slate-600">{label}</label>{children}</div> }
function Tgl({ checked, onChange, label }) { return <label className="flex items-center gap-2.5 cursor-pointer"><Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary" /><span className="text-sm font-medium text-slate-700">{label}</span></label> }

