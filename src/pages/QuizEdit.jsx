import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, GripVertical, Trash2, BookOpen, RefreshCw, CheckCircle2, Settings2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import CustomSelect from '../components/CustomSelect'
import { QUIZ_TYPES, mockQuizzes, getQuizQuestions, setQuizQuestions, mockStudents, regradeQuestion, recalculateScorePolicy } from '../data/mockData'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '../components/ConfirmDialog'

const WEEK_OPTIONS = [{ value: null, label: '선택 안함' }, ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` }))]
const SESSION_OPTIONS = [{ value: null, label: '선택 안함' }, ...[1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` }))]
const TIME_LIMIT_OPTIONS = [{ value: 0, label: '제한 없음' }, { value: 30, label: '30분' }, { value: 60, label: '60분' }, { value: 90, label: '90분' }, { value: 120, label: '120분' }, { value: -1, label: '직접 입력' }]
const ATTEMPT_OPTIONS = [{ value: 1, label: '1회' }, { value: 2, label: '2회' }, { value: 3, label: '3회' }, { value: -1, label: '무제한' }]
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

const INPUT_CLS = "w-full text-[15px] font-medium text-[#333D4B] leading-[1.5] px-3 py-2 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3182F6] transition-all"

export default function QuizEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questions, setQuestions] = useState(() => getQuizQuestions(quiz.id))
  const [initialQuestionsSnapshot] = useState(() => JSON.stringify(getQuizQuestions(quiz.id)))
  const [title, setTitle] = useState(quiz.title ?? '')
  const [description, setDescription] = useState(quiz.description ?? '')
  const [week, setWeek] = useState(quiz.week ?? null)
  const [session, setSession] = useState(quiz.session ?? null)
  const [allowLateSubmit, setAllowLateSubmit] = useState(quiz.allowLateSubmit ?? false)
  const [lateSubmitHours, setLateSubmitHours] = useState(quiz.lateSubmitHours ? String(quiz.lateSubmitHours) : '')
  const [timeLimitType, setTimeLimitType] = useState(quiz.timeLimit ?? 60)
  const [timeLimitCustom, setTimeLimitCustom] = useState('')
  const [allowAttempts, setAllowAttempts] = useState(quiz.allowAttempts ?? 1)
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
  const [assignments, setAssignments] = useState([])
  const addAssignment = () => setAssignments(prev => [...prev, { id: `a${Date.now()}`, assignTo: [], dueDate: '', availableFrom: '', availableUntil: '' }])
  const removeAssignment = (aId) => setAssignments(prev => prev.filter(a => a.id !== aId))
  const updateAssignment = (aId, field, val) => setAssignments(prev => prev.map(a => a.id === aId ? { ...a, [field]: val } : a))
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const addQuestion = (q) => { if (!questions.find(e => e.id === q.id)) setQuestions(prev => [...prev, q]) }
  const addNewQuestion = (q) => setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const moveQuestion = useCallback((fromIdx, toIdx) => { setQuestions(prev => { const next = [...prev]; const [moved] = next.splice(fromIdx, 1); next.splice(toIdx, 0, moved); return next }) }, [])
  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => { if (dragIdx !== null && dragIdx !== i) moveQuestion(dragIdx, i); setDragIdx(null); setOverIdx(null) }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const isMultiAttempt = allowAttempts >= 2 || allowAttempts === -1
  const [regradeTarget, setRegradeTarget] = useState(null)
  const [regradeSuccess, setRegradeSuccess] = useState(null)
  const confirmRegrade = () => { regradeQuestion(quiz.id, regradeTarget); setRegradeSuccess(regradeTarget.id); setRegradeTarget(null); setTimeout(() => setRegradeSuccess(null), 2500) }
  const handleSave = () => {
    const idx = mockQuizzes.findIndex(q => q.id === quiz.id)
    if (idx !== -1) {
      if (scorePolicy !== quiz.scorePolicy) recalculateScorePolicy(quiz.id, scorePolicy)
      mockQuizzes[idx] = { ...mockQuizzes[idx], title, description, week: week ?? null, session: session ?? null, status: quiz.status, questions: questions.length, totalPoints, timeLimit: timeLimitType === -1 ? Number(timeLimitCustom) : timeLimitType, allowAttempts, scorePolicy, allowLateSubmit, lateSubmitHours: allowLateSubmit && lateSubmitHours ? Number(lateSubmitHours) : null, scoreRevealEnabled, scoreRevealScope: scoreRevealEnabled ? scoreRevealScope : null, scoreRevealTiming: scoreRevealEnabled ? scoreRevealTiming : null, scoreRevealStart: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealStart || null : null, scoreRevealEnd: (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealEnd || null : null }
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
    navigate('/')
  }

  return (
    <Layout breadcrumbs={[{ label: '퀴즈 관리', href: '/' }, { label: quiz.title }, { label: '편집' }]}>
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg font-bold">퀴즈 편집</h1>
          <div className="flex items-center gap-3">
            {quiz.status !== 'draft' && (
              <button onClick={() => { const i2 = mockQuizzes.findIndex(q => q.id === quiz.id); if (i2 !== -1) mockQuizzes[i2] = { ...mockQuizzes[i2], visible: !mockQuizzes[i2].visible } }} className={cn('flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md border', quiz.visible !== false ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200')}>
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', quiz.visible !== false ? 'bg-green-600' : 'bg-red-600')} />{quiz.visible !== false ? '공개 중' : '비공개'}
              </button>
            )}
            <Button size="lg" onClick={handleSave} className="bg-[#3182F6] hover:bg-[#1B64DA] px-4">저장</Button>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-semibold">문항 구성</h2><p className="text-xs mt-0.5 text-muted-foreground">{questions.length}문항 · 총 {totalPoints}점</p></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowBankModal(true)}><BookOpen size={14} />문제은행에서 추가</Button>
                <Button onClick={() => setShowAddModal(true)} className="bg-[#3182F6] hover:bg-[#1B64DA]"><Plus size={14} />직접 추가</Button>
              </div>
            </div>
            {questions.length === 0 ? (
              <div className="p-12 text-center rounded-md border-2 border-dashed border-border bg-slate-50">
                <p className="text-sm mb-3 text-muted-foreground/60">아직 추가된 문항이 없습니다</p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowBankModal(true)}>문제은행에서 추가</Button>
                  <Button onClick={() => setShowAddModal(true)} className="bg-[#3182F6] hover:bg-[#1B64DA]">직접 추가</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={handleDragEnd} className={cn('flex items-start gap-2 bg-white p-3 group transition-all rounded-md border', overIdx === i && dragIdx !== i ? 'border-[#3182F6] bg-[#E8F3FF]/50' : 'border-border', dragIdx === i && 'opacity-40')}>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5"><GripVertical size={14} className="cursor-grab active:cursor-grabbing text-muted-foreground/40" /><span className="text-xs font-bold w-5 text-center text-muted-foreground">{i + 1}</span></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">{QUIZ_TYPES[q.type]?.label}</Badge>
                        <span className="text-xs text-muted-foreground">{q.points}점</span>
                        {QUIZ_TYPES[q.type]?.autoGrade === false && <Badge variant="secondary" className="bg-orange-50 text-orange-700">수동채점</Badge>}
                        {q.bankName && <Badge variant="secondary" className="bg-sky-50 text-sky-700">{q.bankName}</Badge>}
                      </div>
                      <p className="text-sm line-clamp-2 text-slate-700">{q.text}</p>
                      {regradeSuccess === q.id && <p className="text-xs flex items-center gap-1 mt-1 text-green-700"><CheckCircle2 size={11} />재채점 완료</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {QUIZ_TYPES[q.type]?.autoGrade !== false && QUIZ_TYPES[q.type]?.autoGrade !== null && <button onClick={() => setRegradeTarget(q)} title="이 문항 재채점" className="p-1 text-muted-foreground/40 hover:text-[#3182F6] transition-colors"><RefreshCw size={13} /></button>}
                      <button onClick={() => removeQuestion(q.id)} className="p-1 text-muted-foreground/40 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <SC title="기본 정보"><SF label="퀴즈 제목"><input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT_CLS} placeholder="퀴즈 제목을 입력하세요" /></SF><SF label="퀴즈 설명"><textarea value={description} onChange={e => setDescription(e.target.value)} className={cn(INPUT_CLS, 'resize-none')} rows={3} placeholder="학생에게 표시될 퀴즈 설명 (선택)" /></SF><div className="grid grid-cols-2 gap-2"><SF label="주차"><CustomSelect value={week} onChange={setWeek} options={WEEK_OPTIONS} placeholder="선택 안함" /></SF><SF label="차시"><CustomSelect value={session} onChange={setSession} options={SESSION_OPTIONS} placeholder="선택 안함" /></SF></div></SC>
            <SC title="퀴즈 유형"><div className="grid grid-cols-2 gap-2">{[{ value: 'graded', label: '평가용', desc: '성적 반영' }, { value: 'practice', label: '연습용', desc: '성적 미반영' }].map(opt => (<button key={opt.value} onClick={() => setQuizMode(opt.value)} className={cn('text-left p-2.5 rounded-md transition-all border-2', quizMode === opt.value ? 'border-[#3182F6] bg-[#E8F3FF]' : 'border-border bg-white')}><p className={cn('text-[15px] font-semibold leading-[1.5]', quizMode === opt.value ? 'text-[#1B64DA]' : 'text-[#333D4B]')}>{opt.label}</p><p className={cn('text-[13px] font-normal mt-0.5 leading-[1.5]', quizMode === opt.value ? 'text-[#3182F6]' : 'text-[#8B95A1]')}>{opt.desc}</p></button>))}</div></SC>
            <SC title="응시 설정"><SF label="응시 시간 제한"><CustomSelect value={timeLimitType} onChange={setTimeLimitType} options={TIME_LIMIT_OPTIONS} />{timeLimitType === -1 && <div className="flex items-center gap-2 mt-2"><input type="number" value={timeLimitCustom} onChange={e => setTimeLimitCustom(e.target.value)} placeholder="분 입력" min={1} className={INPUT_CLS} /><span className="text-[13px] font-normal shrink-0 text-[#8B95A1] leading-[1.5]">분</span></div>}</SF><SF label="최대 응시 횟수"><CustomSelect value={allowAttempts} onChange={setAllowAttempts} options={ATTEMPT_OPTIONS} /></SF>{isMultiAttempt && <SF label="복수 응시 시 채점 방식"><CustomSelect value={scorePolicy} onChange={setScorePolicy} options={SCORE_POLICIES} /></SF>}<div className="space-y-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowLateSubmit} onChange={e => setAllowLateSubmit(e.target.checked)} className="rounded accent-[#3182F6]" /><span className="text-[15px] font-medium text-[#333D4B] leading-[1.5]">마감 후 지각 제출 허용</span></label>{allowLateSubmit && <div className="flex items-center gap-2 pl-5"><input type="number" value={lateSubmitHours} onChange={e => setLateSubmitHours(e.target.value)} placeholder="예: 24" min={1} className="w-20 text-[15px] font-medium text-[#333D4B] leading-[1.5] px-2 py-1.5 rounded-md border border-border bg-white focus:outline-none focus:border-[#3182F6] transition-all" /><span className="text-[13px] font-normal text-[#8B95A1] leading-[1.5]">시간</span><span className="text-[13px] font-normal text-[#8B95A1] leading-[1.5]">(비우면 무제한)</span></div>}</div></SC>
            <SC title="표시 설정"><div className="space-y-3"><Tgl checked={shuffleChoices} onChange={setShuffleChoices} label="선택지 무작위 배열" /><Tgl checked={shuffleQuestions} onChange={setShuffleQuestions} label="문항 순서 무작위" /><Tgl checked={scoreRevealEnabled} onChange={setScoreRevealEnabled} label="성적 공개" />{scoreRevealEnabled && <div className="space-y-3 pl-1"><div><p className="text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">공개 범위</p><div className="grid grid-cols-2 gap-2">{[{ value: 'wrong_only', label: '오답 여부만', desc: '정오답 + 점수' }, { value: 'with_answer', label: '정답까지', desc: '정오답 + 점수 + 정답' }].map(opt => (<button key={opt.value} type="button" onClick={() => setScoreRevealScope(opt.value)} className={cn('flex flex-col items-start gap-0.5 p-2.5 rounded-lg text-left w-full transition-all border-2', scoreRevealScope === opt.value ? 'border-[#3182F6] bg-[#E8F3FF]' : 'border-border bg-white')}><span className={cn('text-[15px] font-semibold leading-[1.5]', scoreRevealScope === opt.value ? 'text-[#3182F6]' : 'text-[#333D4B]')}>{opt.label}</span><span className="text-[13px] font-normal text-[#8B95A1] leading-[1.5]">{opt.desc}</span></button>))}</div></div><div><p className="text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">공개 시점</p><div className="space-y-1.5">{[{ value: 'immediately', label: '제출 즉시' }, { value: 'after_due', label: '마감 후' }, { value: 'period', label: '기간 설정' }].map(opt => (<label key={opt.value} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="revealTimingEdit" checked={scoreRevealTiming === opt.value} onChange={() => setScoreRevealTiming(opt.value)} className="accent-[#3182F6]" /><span className="text-[15px] font-medium text-[#333D4B] leading-[1.5]">{opt.label}</span></label>))}</div>{scoreRevealTiming === 'period' && <div className="mt-2 pt-2 space-y-1.5 border-t border-blue-100"><div><label className="block text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">공개 시작일</label><input type="datetime-local" value={scoreRevealStart} onChange={e => setScoreRevealStart(e.target.value)} className={INPUT_CLS} /></div><div><label className="block text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">공개 종료일</label><input type="datetime-local" value={scoreRevealEnd} onChange={e => setScoreRevealEnd(e.target.value)} className={INPUT_CLS} /></div></div>}</div></div>}</div></SC>
            <SC title="추가 기간 설정"><p className="text-[13px] font-normal -mt-1 text-[#8B95A1] leading-[1.5]">특정 학생에게 기본 기간과 다른 마감일/열람 기간을 설정합니다.</p><div className="space-y-2">{assignments.map((a, idx) => (<div key={a.id} className="p-2.5 rounded-md space-y-2 border border-border bg-slate-50"><div className="flex items-center justify-between"><p className="text-[14px] font-semibold text-[#4E5968] leading-[1.5]">추가 대상 {idx + 1}</p><Button variant="ghost" size="xs" onClick={() => removeAssignment(a.id)} className="text-muted-foreground hover:text-red-600 hover:bg-red-50">삭제</Button></div><div><label className="block text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">대상 학생</label><AssignToSelector selected={a.assignTo} onChange={val => updateAssignment(a.id, 'assignTo', val)} /></div><div className="grid grid-cols-1 gap-1.5">{[['마감 일시', 'dueDate'], ['열람 시작', 'availableFrom'], ['열람 마감', 'availableUntil']].map(([lbl, field]) => (<div key={field}><label className="block text-[14px] font-semibold mb-2 text-[#4E5968] leading-[1.5]">{lbl}</label><input type="datetime-local" value={a[field]} onChange={e => updateAssignment(a.id, field, e.target.value)} className={INPUT_CLS} /></div>))}</div></div>))}<button onClick={addAssignment} className="w-full text-[15px] font-medium py-1.5 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-[#3182F6] hover:text-[#3182F6] hover:bg-[#E8F3FF]/50 transition-colors">+ 학생 추가</button></div></SC>
            <SC title="접근 제한"><SF label="액세스 코드"><input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="코드 입력 시 응시 시 코드 필요" className={INPUT_CLS} /></SF><SF label="접근 가능한 IP 주소"><textarea value={ipRestriction} onChange={e => setIpRestriction(e.target.value)} placeholder={'IP 주소를 한 줄에 하나씩\n예) 192.168.1.0/24'} rows={2} className={cn(INPUT_CLS, 'resize-none')} /><p className="text-[13px] font-normal mt-1 text-[#8B95A1] leading-[1.5]">비워두면 모든 IP 허용. CIDR 지원.</p></SF></SC>
          </div>
        </div>
      </div>
      {showBankModal && <QuestionBankModal onClose={() => setShowBankModal(false)} onAdd={addQuestion} added={questions.map(q => q.id)} currentCourse={quiz?.course} />}
      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onAdd={addNewQuestion} />}
      {regradeTarget && <ConfirmDialog title="문항 재채점" message={`다음 문항의 현재 정답 기준으로 모든 제출 기록을 재채점합니다.\n\n"${regradeTarget.text}"\n\n진행 중인 응시 세션은 제외되며, 이미 제출된 응답에만 소급 적용됩니다.`} confirmLabel="재채점 실행" onConfirm={confirmRegrade} onCancel={() => setRegradeTarget(null)} />}
    </Layout>
  )
}

function SC({ title, children }) { return <Card><CardContent className="px-4 pb-4 pt-0 space-y-3"><h3 className="text-[18px] font-bold text-[#191F28] leading-[1.5] flex items-center gap-2 pb-2 border-b border-border"><Settings2 size={16} className="text-[#191F28]" />{title}</h3>{children}</CardContent></Card> }
function SF({ label, children }) { return <div><label className="text-[14px] font-semibold block mb-2 text-[#4E5968] leading-[1.5]">{label}</label>{children}</div> }
function Tgl({ checked, onChange, label }) { return <label className="flex items-center gap-2.5 cursor-pointer"><Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-[#3182F6]" /><span className="text-[15px] font-medium text-[#333D4B] leading-[1.5]">{label}</span></label> }

const EDIT_STUDENT_OPTIONS = mockStudents.slice(0, 30).map(s => ({ id: s.id, label: s.name, sub: s.studentId }))

function AssignToSelector({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = EDIT_STUDENT_OPTIONS.filter(opt => { if (selected.find(s => s.id === opt.id)) return false; if (!query) return true; return opt.label.includes(query) || opt.sub.includes(query) })
  const addItem = (opt) => { onChange([...selected, { id: opt.id, label: opt.label }]); setQuery('') }
  const removeItem = (rmId) => onChange(selected.filter(s => s.id !== rmId))
  return (
    <div className="relative">
      <div className="min-h-9 flex flex-wrap gap-1 items-center px-2 py-1.5 cursor-text border border-border rounded-md bg-white" onClick={() => setOpen(true)}>
        {selected.map(s => (<span key={s.id} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-[#E8F3FF] text-[#1B64DA] border border-blue-200">{s.label}<button onClick={e => { e.stopPropagation(); removeItem(s.id) }} className="opacity-60">×</button></span>))}
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={selected.length === 0 ? '학생 이름 또는 학번 검색' : ''} className="flex-1 min-w-16 text-xs bg-transparent focus:outline-none" />
      </div>
      {open && (<><div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery('') }} /><div className="absolute z-20 w-full mt-1 bg-white rounded-md overflow-hidden border border-border shadow-lg max-h-40 overflow-y-auto">{filtered.length === 0 ? <div className="px-3 py-3 text-xs text-center text-muted-foreground">검색 결과가 없습니다</div> : filtered.map(opt => <button key={opt.id} onMouseDown={e => { e.preventDefault(); addItem(opt) }} className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-muted transition-colors"><span>{opt.label}</span><span className="text-muted-foreground">{opt.sub}</span></button>)}</div></>)}
    </div>
  )
}
