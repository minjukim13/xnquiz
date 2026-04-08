import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, GripVertical, Trash2, BookOpen, Settings2 } from 'lucide-react'
import Layout from '../components/Layout'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import CustomSelect from '../components/CustomSelect'
import { QUIZ_TYPES, mockQuizzes, getQuizQuestions, mockStudents } from '../data/mockData'

const TIME_LIMIT_OPTIONS = [
  { value: 0,   label: '제한 없음' },
  { value: 30,  label: '30분' },
  { value: 60,  label: '60분' },
  { value: 90,  label: '90분' },
  { value: 120, label: '120분' },
  { value: -1,  label: '직접 입력' },
]
const ATTEMPT_OPTIONS = [
  { value: 1,  label: '1회' },
  { value: 2,  label: '2회' },
  { value: 3,  label: '3회' },
  { value: -1, label: '무제한' },
]
const SCORE_POLICIES = ['최고 점수 유지', '최신 점수 유지', '평균 점수'].map(v => ({ value: v, label: v }))

export default function QuizEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]

  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questions, setQuestions] = useState(() => getQuizQuestions(quiz.id))

  // 기본 정보
  const [title, setTitle] = useState(quiz.title ?? '')
  const [description, setDescription] = useState(quiz.description ?? '')

  // 응시 설정
  const [timeLimitType, setTimeLimitType] = useState(quiz.timeLimit ?? 60)
  const [timeLimitCustom, setTimeLimitCustom] = useState('')
  const [allowAttempts, setAllowAttempts] = useState(quiz.allowAttempts ?? 1)
  const [scorePolicy, setScorePolicy] = useState(quiz.scorePolicy ?? '최고 점수 유지')

  // 표시 설정
  const [shuffleChoices, setShuffleChoices] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [scoreRevealEnabled, setScoreRevealEnabled] = useState(quiz.scoreRevealEnabled ?? false)
  const [scoreRevealScope,   setScoreRevealScope]   = useState(quiz.scoreRevealScope   ?? 'wrong_only')
  const [scoreRevealTiming,  setScoreRevealTiming]  = useState(quiz.scoreRevealTiming  ?? 'immediately')
  const [scoreRevealStart,   setScoreRevealStart]   = useState(quiz.scoreRevealStart   ?? '')
  const [scoreRevealEnd,     setScoreRevealEnd]     = useState(quiz.scoreRevealEnd     ?? '')

  // 퀴즈 접근 제한
  const [accessCode, setAccessCode] = useState('')
  const [ipRestriction, setIpRestriction] = useState('')

  // 퀴즈 유형
  const [quizMode, setQuizMode] = useState('graded')

  // 추가 기간 설정
  const [assignments, setAssignments] = useState([])
  const addAssignment = () => setAssignments(prev => [...prev, { id: `a${Date.now()}`, assignTo: [], dueDate: '', availableFrom: '', availableUntil: '' }])
  const removeAssignment = (id) => setAssignments(prev => prev.filter(a => a.id !== id))
  const updateAssignment = (id, field, val) => setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))

  // 드래그 상태
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const addQuestion = (q) => {
    if (!questions.find(existing => existing.id === q.id)) {
      setQuestions(prev => [...prev, q])
    }
  }
  const addNewQuestion = (q) => setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const moveQuestion = useCallback((fromIdx, toIdx) => {
    setQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }, [])

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx !== null && dragIdx !== i) moveQuestion(dragIdx, i)
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const isMultiAttempt = allowAttempts >= 2 || allowAttempts === -1

  const handleSave = () => {
    const idx = mockQuizzes.findIndex(q => q.id === quiz.id)
    if (idx !== -1) {
      mockQuizzes[idx] = {
        ...mockQuizzes[idx],
        title,
        description,
        status: quiz.status === 'draft' ? 'open' : quiz.status,
        questions: questions.length,
        totalPoints,
        timeLimit: timeLimitType === -1 ? Number(timeLimitCustom) : timeLimitType,
        allowAttempts,
        scorePolicy,
        scoreRevealEnabled,
        scoreRevealScope:  scoreRevealEnabled ? scoreRevealScope  : null,
        scoreRevealTiming: scoreRevealEnabled ? scoreRevealTiming : null,
        scoreRevealStart:  (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealStart || null : null,
        scoreRevealEnd:    (scoreRevealEnabled && scoreRevealTiming === 'period') ? scoreRevealEnd   || null : null,
      }
    }
    navigate('/')
  }

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: quiz.title },
      { label: '편집' },
    ]}>
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 xl:px-16 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg font-bold" style={{ color: '#222222' }}>퀴즈 편집</h1>
          <button onClick={handleSave} className="btn-primary text-sm">저장 및 발행</button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* 왼쪽: 문항 구성 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: '#222222' }}>문항 구성</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{questions.length}문항 · 총 {totalPoints}점</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
                  style={{ color: '#424242', border: '1px solid #E0E0E0' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <BookOpen size={13} />
                  문제은행에서 추가
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                >
                  <Plus size={13} />
                  직접 추가
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-12 text-center rounded" style={{ border: '2px dashed #E0E0E0', background: '#FAFAFA' }}>
                <p className="text-sm mb-3" style={{ color: '#BDBDBD' }}>아직 추가된 문항이 없습니다</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setShowBankModal(true)} className="text-xs text-indigo-600 px-3 py-1.5 rounded" style={{ border: '1px solid #c7d2fe' }}>
                    문제은행에서 추가
                  </button>
                  <button onClick={() => setShowAddModal(true)} className="text-xs text-white bg-indigo-600 px-3 py-1.5 rounded">
                    직접 추가
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    className="flex items-start gap-2 bg-white p-3 group transition-all rounded"
                    style={{
                      border: overIdx === i && dragIdx !== i ? '1px solid #6366f1' : '1px solid #E0E0E0',
                      opacity: dragIdx === i ? 0.4 : 1,
                      background: overIdx === i && dragIdx !== i ? '#F5F3FF' : '#fff',
                    }}
                  >
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <GripVertical size={14} className="cursor-grab active:cursor-grabbing" style={{ color: '#BDBDBD' }} />
                      <span className="text-xs font-bold w-5 text-center" style={{ color: '#9E9E9E' }}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#F5F5F5', color: '#616161' }}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                        {QUIZ_TYPES[q.type]?.autoGrade === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#B43200', background: '#FFF6F2' }}>수동채점</span>
                        )}
                        {q.bankName && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#0369a1', background: '#e0f2fe' }}>{q.bankName}</span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="shrink-0 transition-colors opacity-0 group-hover:opacity-100 p-1"
                      style={{ color: '#BDBDBD' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF2B2A'}
                      onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 오른쪽: 설정 패널 */}
          <div className="space-y-4">

            {/* 기본 정보 */}
            <SettingCard title="기본 정보">
              <SettingField label="퀴즈 제목">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input text-sm w-full"
                  placeholder="퀴즈 제목을 입력하세요"
                />
              </SettingField>
              <SettingField label="퀴즈 설명">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input text-sm w-full resize-none"
                  rows={3}
                  placeholder="학생에게 표시될 퀴즈 설명 (선택)"
                />
              </SettingField>
            </SettingCard>

            {/* 퀴즈 유형 */}
            <SettingCard title="퀴즈 유형">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'graded', label: '평가용', desc: '성적 반영' },
                  { value: 'practice', label: '연습용', desc: '성적 미반영' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setQuizMode(opt.value)}
                    className="text-left p-2.5 rounded transition-all"
                    style={{
                      border: quizMode === opt.value ? '2px solid #6366f1' : '1px solid #E0E0E0',
                      background: quizMode === opt.value ? '#EEF2FF' : '#fff',
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: quizMode === opt.value ? '#4338CA' : '#424242' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: quizMode === opt.value ? '#6366f1' : '#9E9E9E' }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </SettingCard>

            {/* 응시 설정 */}
            <SettingCard title="응시 설정">
              <SettingField label="응시 시간 제한">
                <CustomSelect value={timeLimitType} onChange={setTimeLimitType} options={TIME_LIMIT_OPTIONS} />
                {timeLimitType === -1 && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" value={timeLimitCustom} onChange={e => setTimeLimitCustom(e.target.value)} placeholder="분 입력" min={1} className="input text-sm" />
                    <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>분</span>
                  </div>
                )}
              </SettingField>
              <SettingField label="최대 응시 횟수">
                <CustomSelect value={allowAttempts} onChange={setAllowAttempts} options={ATTEMPT_OPTIONS} />
              </SettingField>
              {isMultiAttempt && (
                <SettingField label="복수 응시 시 채점 방식">
                  <CustomSelect value={scorePolicy} onChange={setScorePolicy} options={SCORE_POLICIES} />
                </SettingField>
              )}
            </SettingCard>

            {/* 표시 설정 */}
            <SettingCard title="표시 설정">
              <div className="space-y-3">
                <Toggle checked={shuffleChoices} onChange={setShuffleChoices} label="선택지 무작위 배열" />
                <Toggle checked={shuffleQuestions} onChange={setShuffleQuestions} label="문항 순서 무작위" />

                {/* 성적 공개 정책 */}
                <div className="space-y-3">
                  <Toggle checked={scoreRevealEnabled} onChange={setScoreRevealEnabled} label="성적 공개" description="제출 후 학생에게 성적 정보를 공개합니다" />
                  {scoreRevealEnabled && (
                    <div className="space-y-3">
                      {/* 공개 범위 */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#616161' }}>공개 범위</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'wrong_only',  label: '오답 여부만', desc: '정오답(✓/✗) + 점수' },
                            { value: 'with_answer', label: '정답까지',    desc: '정오답 + 점수 + 정답' },
                          ].map(opt => {
                            const active = scoreRevealScope === opt.value
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setScoreRevealScope(opt.value)}
                                className="flex flex-col items-start gap-0.5 p-2.5 rounded-lg text-left w-full transition-all"
                                style={{
                                  border: `2px solid ${active ? '#6366f1' : '#E0E0E0'}`,
                                  background: active ? '#EEF2FF' : '#FFFFFF',
                                }}
                              >
                                <span className="text-xs font-semibold" style={{ color: active ? '#4F46E5' : '#212121' }}>{opt.label}</span>
                                <span className="text-xs" style={{ color: '#9E9E9E' }}>{opt.desc}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {/* 공개 시점 */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#616161' }}>공개 시점</p>
                        <div className="space-y-1.5">
                          {[
                            { value: 'immediately', label: '제출 즉시' },
                            { value: 'after_due',   label: '마감 후' },
                            { value: 'period',      label: '기간 설정' },
                          ].map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="scoreRevealTimingEdit" checked={scoreRevealTiming === opt.value} onChange={() => setScoreRevealTiming(opt.value)} style={{ accentColor: '#6366f1' }} />
                              <span className="text-xs font-medium" style={{ color: '#212121' }}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {scoreRevealTiming === 'period' && (
                          <div className="mt-2 pt-2 space-y-1.5" style={{ borderTop: '1px solid #E8EBFF' }}>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>공개 시작일</label>
                              <input type="datetime-local" value={scoreRevealStart} onChange={e => setScoreRevealStart(e.target.value)} className="input text-xs" />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>공개 종료일</label>
                              <input type="datetime-local" value={scoreRevealEnd} onChange={e => setScoreRevealEnd(e.target.value)} className="input text-xs" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SettingCard>

            {/* 추가 기간 설정 */}
            <SettingCard title="추가 기간 설정">
              <p className="text-xs -mt-1" style={{ color: '#9E9E9E' }}>특정 학생에게 기본 기간과 다른 마감일/열람 기간을 설정합니다. 추가된 학생은 이 설정이 우선 적용됩니다.</p>
              <div className="space-y-2">
                {assignments.map((a, idx) => (
                  <div key={a.id} className="p-2.5 rounded space-y-2" style={{ border: '1px solid #E0E0E0', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: '#424242' }}>추가 대상 {idx + 1}</p>
                      <button
                        onClick={() => removeAssignment(a.id)}
                        className="text-xs px-1.5 py-0.5 rounded transition-colors"
                        style={{ color: '#9E9E9E' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF2B2A'; e.currentTarget.style.background = '#FFF0EF' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
                      >
                        삭제
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>대상 학생</label>
                      <AssignToSelector selected={a.assignTo} onChange={val => updateAssignment(a.id, 'assignTo', val)} />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[['마감 일시', 'dueDate'], ['열람 시작', 'availableFrom'], ['열람 마감', 'availableUntil']].map(([lbl, field]) => (
                        <div key={field}>
                          <label className="block text-xs mb-0.5" style={{ color: '#9E9E9E' }}>{lbl}</label>
                          <input type="datetime-local" value={a[field]} onChange={e => updateAssignment(a.id, field, e.target.value)} className="input text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addAssignment}
                  className="w-full text-xs py-1.5 rounded transition-colors"
                  style={{ border: '1px dashed #BDBDBD', color: '#9E9E9E' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#F5F3FF' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
                >
                  + 학생 추가
                </button>
              </div>
            </SettingCard>

            {/* 접근 제한 */}
            <SettingCard title="접근 제한">
              <SettingField label="액세스 코드">
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  placeholder="코드를 입력하면 응시 시 코드 입력 필요"
                  className="input text-sm"
                />
              </SettingField>
              <SettingField label="접근 가능한 IP 주소">
                <textarea
                  value={ipRestriction}
                  onChange={e => setIpRestriction(e.target.value)}
                  placeholder={'IP 주소를 한 줄에 하나씩\n예) 192.168.1.0/24'}
                  rows={2}
                  className="input resize-none text-sm"
                />
                <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>비워두면 모든 IP 허용. CIDR 지원.</p>
              </SettingField>
            </SettingCard>

          </div>
        </div>
      </div>

      {showBankModal && (
        <QuestionBankModal
          onClose={() => setShowBankModal(false)}
          onAdd={addQuestion}
          added={questions.map(q => q.id)}
          currentCourse={quiz?.course}
        />
      )}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={addNewQuestion}
        />
      )}
    </Layout>
  )
}

function SettingCard({ title, children }) {
  return (
    <div className="card-flat p-4 space-y-3">
      <h3 className="text-xs font-semibold flex items-center gap-1.5 pb-2" style={{ color: '#222222', borderBottom: '1px solid #EEEEEE' }}>
        <Settings2 size={12} style={{ color: '#9E9E9E' }} />
        {title}
      </h3>
      {children}
    </div>
  )
}

function SettingField({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#424242' }}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div className="relative shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div className="w-8 h-4 rounded-full transition-colors" style={{ background: checked ? '#6366f1' : '#BDBDBD' }}>
          <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: checked ? '1rem' : '0.125rem', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
        </div>
      </div>
      <span className="text-sm" style={{ color: '#424242' }}>{label}</span>
    </label>
  )
}

const EDIT_STUDENT_OPTIONS = mockStudents.slice(0, 30).map(s => ({
  id: s.id,
  label: s.name,
  sub: s.studentId,
}))

function AssignToSelector({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = EDIT_STUDENT_OPTIONS.filter(opt => {
    if (selected.find(s => s.id === opt.id)) return false
    if (!query) return true
    return opt.label.includes(query) || opt.sub.includes(query)
  })

  const addItem = (opt) => { onChange([...selected, { id: opt.id, label: opt.label }]); setQuery('') }
  const removeItem = (id) => onChange(selected.filter(s => s.id !== id))

  return (
    <div className="relative">
      <div
        className="min-h-9 flex flex-wrap gap-1 items-center px-2 py-1.5 cursor-text"
        style={{ border: '1px solid #E0E0E0', borderRadius: 6, background: '#fff' }}
        onClick={() => setOpen(true)}
      >
        {selected.map(s => (
          <span key={s.id} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #c7d2fe' }}>
            {s.label}
            <button onClick={e => { e.stopPropagation(); removeItem(s.id) }} style={{ color: 'inherit', opacity: 0.6 }}>×</button>
          </span>
        ))}
        <input
          type="text" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? '이름 또는 학번 검색' : ''}
          className="flex-1 min-w-16 text-xs bg-transparent focus:outline-none"
          style={{ color: '#222222' }}
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery('') }} />
          <div className="absolute z-20 w-full mt-1 bg-white rounded overflow-hidden"
            style={{ border: '1px solid #E0E0E0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 160, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div className="px-3 py-3 text-xs text-center" style={{ color: '#9E9E9E' }}>검색 결과 없음</div>
              : filtered.map(opt => (
                <button key={opt.id} onMouseDown={e => { e.preventDefault(); addItem(opt) }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors"
                  style={{ color: '#222222' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{opt.label}</span>
                  <span style={{ color: '#9E9E9E' }}>{opt.sub}</span>
                </button>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}
