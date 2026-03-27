import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, GripVertical, Trash2, X, Search, ChevronLeft } from 'lucide-react'
import Layout from '../components/Layout'
import CustomSelect from '../components/CustomSelect'
import AddQuestionModal from '../components/AddQuestionModal'
import { QUIZ_TYPES, mockQuizzes } from '../data/mockData'
import { useQuestionBank } from '../context/QuestionBankContext'

// ── 옵션 상수 ──────────────────────────────────────────────────────────────
const WEEK_OPTIONS = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` }))
const SESSION_OPTIONS = [1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` }))
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


const DEFAULT_NOTICE = `- 제출 후에는 답안을 수정할 수 없습니다.
- 타인과의 협력 및 자료 공유는 금지됩니다.
- 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.`

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function QuizCreate() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({
    title: '',
    description: '',
    week: '',
    session: '',
    startDate: '',
    dueDate: '',
    timeLimitType: 60,
    timeLimitCustom: '',
    allowAttempts: 1,
    scorePolicy: '최고 점수 유지',
    shuffleChoices: false,
    shuffleQuestions: false,
    showAnswerAfter: true,
    allowLateSubmit: false,
    notice: DEFAULT_NOTICE,
  })
  const [questions, setQuestions] = useState([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const isFormValid = form.title && form.startDate && form.dueDate
    && new Date(form.dueDate) > new Date(form.startDate)
    && questions.length > 0

  const addQuestion = useCallback((q) => {
    setQuestions(prev => prev.find(e => e.id === q.id) ? prev : [...prev, q])
  }, [])

  const addNewQuestion = useCallback((q) => {
    setQuestions(prev => [...prev, { ...q, id: `new_q${Date.now()}` }])
  }, [])

  const removeQuestion = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: '새 퀴즈 만들기' },
    ]}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#222222' }}>새 퀴즈 만들기</h1>

        {/* 탭 */}
        <div className="flex mb-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
          <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>기본 정보</TabBtn>
          <TabBtn active={tab === 'questions'} onClick={() => setTab('questions')}>
            문항 구성{questions.length > 0 && ` (${questions.length})`}
          </TabBtn>
        </div>

        {tab === 'info' ? (
          <InfoTab form={form} set={set} />
        ) : (
          <QuestionsTab
            questions={questions}
            totalPoints={totalPoints}
            onShowBank={() => setShowBankModal(true)}
            onShowAdd={() => setShowAddModal(true)}
            onRemove={removeQuestion}
          />
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #EEEEEE' }}>
          <button
            onClick={() => navigate('/')}
            className="text-sm transition-colors"
            style={{ color: '#9E9E9E' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#424242' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E' }}
          >
            취소
          </button>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm">임시저장</button>
            {tab === 'info' ? (
              <button onClick={() => setTab('questions')} className="btn-primary text-sm">
                다음: 문항 구성 →
              </button>
            ) : (
              <button
                disabled={!isFormValid}
                onClick={() => {
                  mockQuizzes.push({
                    id: String(Date.now()),
                    title: form.title,
                    course: 'CS301 데이터베이스',
                    status: 'open',
                    startDate: form.startDate,
                    dueDate: form.dueDate,
                    week: form.week || 1,
                    session: form.session || 1,
                    totalStudents: 0,
                    submitted: 0,
                    graded: 0,
                    pendingGrade: 0,
                    questions: questions.length,
                    totalPoints,
                    scorePolicy: form.scorePolicy,
                    allowAttempts: form.allowAttempts,
                  })
                  navigate('/')
                }}
                className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                발행하기
              </button>
            )}
          </div>
        </div>
      </div>

      {showBankModal && (
        <QuestionBankModal
          onClose={() => setShowBankModal(false)}
          onAdd={addQuestion}
          added={questions.map(q => q.id)}
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

// ── 탭 버튼 ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
      style={active
        ? { borderBottomColor: '#6366f1', color: '#6366f1' }
        : { borderBottomColor: 'transparent', color: '#9E9E9E' }
      }
    >
      {children}
    </button>
  )
}

// ── 기본 정보 탭 ───────────────────────────────────────────────────────────
function InfoTab({ form, set }) {
  return (
    <div className="space-y-5">

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <Field label="퀴즈 제목" required>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="예) 중간고사 - 데이터베이스 설계"
            className="input"
          />
        </Field>
        <Field label="설명">
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="학생에게 표시될 퀴즈 설명 (선택)"
            rows={2}
            className="input resize-none"
          />
        </Field>

        {/* 주차 / 차시 */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="주차">
            <CustomSelect
              value={form.week}
              onChange={v => set('week', v)}
              options={WEEK_OPTIONS}
              placeholder="주차 선택"
            />
          </Field>
          <Field label="차시">
            <div className="flex gap-2 flex-wrap h-10 items-center">
              {SESSION_OPTIONS.map(s => (
                <label key={s.value} className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => set('session', s.value)}
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                    style={{
                      borderColor: form.session === s.value ? '#6366f1' : '#BDBDBD',
                      background: form.session === s.value ? '#6366f1' : '#fff',
                    }}
                  >
                    {form.session === s.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    onClick={() => set('session', s.value)}
                    className="text-sm cursor-pointer transition-colors"
                    style={{ color: form.session === s.value ? '#4338ca' : '#616161', fontWeight: form.session === s.value ? 500 : 400 }}
                  >
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* 응시 기간 */}
      <Section title="응시 기간">
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작 일시" required>
            <input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input" />
          </Field>
          <Field label="마감 일시" required>
            <input type="datetime-local" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="input" />
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={form.allowLateSubmit}
            onChange={e => set('allowLateSubmit', e.target.checked)}
            className="rounded text-indigo-500"
            style={{ borderColor: '#BDBDBD' }}
          />
          <span className="text-sm" style={{ color: '#616161' }}>마감 후 지각 제출 허용</span>
        </label>
      </Section>

      {/* 응시 설정 */}
      <Section title="응시 설정">
        <div className="grid grid-cols-2 gap-4">
          <Field label="응시 시간 제한">
            <CustomSelect
              value={form.timeLimitType}
              onChange={v => set('timeLimitType', v)}
              options={TIME_LIMIT_OPTIONS}
              placeholder="제한 선택"
            />
            {form.timeLimitType === -1 && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={form.timeLimitCustom}
                  onChange={e => set('timeLimitCustom', e.target.value)}
                  placeholder="분 입력"
                  min={1}
                  className="input"
                />
                <span className="text-sm shrink-0" style={{ color: '#9E9E9E' }}>분</span>
              </div>
            )}
          </Field>
          <Field label="최대 응시 횟수">
            <CustomSelect
              value={form.allowAttempts}
              onChange={v => set('allowAttempts', v)}
              options={ATTEMPT_OPTIONS}
            />
          </Field>
        </div>
        <Field label="복수 응시 시 채점 방식">
          <CustomSelect
            value={form.scorePolicy}
            onChange={v => set('scorePolicy', v)}
            options={SCORE_POLICIES}
          />
        </Field>
      </Section>

      {/* 표시 설정 */}
      <Section title="표시 설정">
        <div className="space-y-3">
          <Toggle checked={form.shuffleChoices} onChange={v => set('shuffleChoices', v)} label="선택지 무작위 배열" description="학생마다 선택지 순서가 달라집니다" />
          <Toggle checked={form.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} label="문항 순서 무작위" description="학생마다 문항 순서가 달라집니다" />
          <Toggle checked={form.showAnswerAfter} onChange={v => set('showAnswerAfter', v)} label="제출 후 정답 공개" description="응시 완료 후 학생에게 정답을 표시합니다" />
        </div>
      </Section>

      {/* 퀴즈 안내사항 */}
      <Section title="퀴즈 안내사항">
        <p className="text-xs mb-2" style={{ color: '#9E9E9E' }}>응시 전 학생에게 표시될 안내 문구입니다. 수정하거나 추가할 수 있습니다.</p>
        <textarea
          value={form.notice}
          onChange={e => set('notice', e.target.value)}
          rows={5}
          className="input resize-none text-sm leading-relaxed"
          placeholder="학생에게 안내할 퀴즈 정책을 입력하세요."
        />
      </Section>

    </div>
  )
}

// ── 문항 구성 탭 ───────────────────────────────────────────────────────────
function QuestionsTab({ questions, totalPoints, onShowBank, onShowAdd, onRemove }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium" style={{ color: '#424242' }}>{questions.length}문항 · 총 {totalPoints}점</p>
          <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>문항을 추가하고 순서를 조정하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowBank}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
            style={{ color: '#424242', border: '1px solid #E0E0E0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <BookOpen size={13} />
            문제은행에서 추가
          </button>
          <button
            onClick={onShowAdd}
            className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
          >
            <Plus size={13} />
            직접 추가
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="p-14 text-center rounded" style={{ border: '2px dashed #E0E0E0', background: '#FAFAFA' }}>
          <p className="text-sm mb-3" style={{ color: '#BDBDBD' }}>아직 추가된 문항이 없습니다</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={onShowBank} className="text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded transition-colors" style={{ border: '1px solid #c7d2fe' }}>
              문제은행에서 추가
            </button>
            <button onClick={onShowAdd} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors">
              직접 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 bg-white p-3 group transition-all rounded"
              style={{ border: '1px solid #E0E0E0' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#BDBDBD'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0E0'}
            >
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <GripVertical size={14} className="cursor-grab" style={{ color: '#BDBDBD' }} />
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
                onClick={() => onRemove(q.id)}
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
  )
}

// ── 헬퍼 컴포넌트 ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="card-flat p-5 space-y-4">
      <h2 className="text-sm font-semibold pb-3" style={{ color: '#222222', borderBottom: '1px solid #EEEEEE' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#EF2B2A' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div className="w-9 h-5 rounded-full transition-colors" style={{ background: checked ? '#6366f1' : '#BDBDBD' }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: checked ? '1.0rem' : '0.125rem', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: '#424242' }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{description}</p>}
      </div>
    </label>
  )
}

// ── 문제은행에서 추가 모달 (은행 선택 → 문항 선택 2단계) ────────────────────
function QuestionBankModal({ onClose, onAdd, added }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [visibleCount, setVisibleCount] = useState(15)

  const selectedBank = banks.find(b => b.id === selectedBankId)
  const bankQuestions = selectedBankId ? getBankQuestions(selectedBankId) : []

  const filtered = bankQuestions.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    return matchSearch && matchType
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleBack = () => {
    setSelectedBankId(null)
    setSearch('')
    setFilterType('all')
    setVisibleCount(15)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-2xl bg-white flex flex-col"
        style={{ maxHeight: '85vh', border: '1px solid #E0E0E0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            {selectedBankId && (
              <button
                onClick={handleBack}
                className="p-1 transition-colors"
                style={{ color: '#9E9E9E', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold" style={{ color: '#222222' }}>
              {selectedBank ? selectedBank.name : '문제은행에서 추가'}
            </h3>
            {selectedBank && (
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{bankQuestions.length}개 문항</span>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}><X size={18} /></button>
        </div>

        {/* Step 1: 은행 선택 */}
        {!selectedBankId ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs mb-3" style={{ color: '#9E9E9E' }}>문제를 가져올 은행을 선택하세요</p>
            {banks.map(b => {
              const count = getBankQuestions(b.id).length
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBankId(b.id)}
                  className="w-full flex items-center justify-between p-3 text-left transition-colors"
                  style={{ border: '1px solid #E0E0E0', borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#FAFAFA' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} style={{ color: '#9E9E9E' }} />
                    <span className="text-sm font-medium" style={{ color: '#222222' }}>{b.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#9E9E9E' }}>{count}개 문항</span>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            {/* Step 2: 문항 선택 */}
            <div className="p-3 space-y-2" style={{ borderBottom: '1px solid #EEEEEE' }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
                  placeholder="문항 내용 검색..."
                  className="w-full text-sm pl-9 pr-3 py-2 focus:outline-none"
                  style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={e => { setFilterType(e.target.value); setVisibleCount(15) }}
                  className="text-xs bg-white px-2 py-1.5 focus:outline-none shrink-0"
                  style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#616161' }}
                >
                  <option value="all">모든 유형</option>
                  {Object.entries(QUIZ_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span className="text-xs ml-auto" style={{ color: '#9E9E9E' }}>{filtered.length}개</span>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              onScroll={e => {
                const el = e.target
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) setVisibleCount(c => c + 10)
              }}
            >
              {visible.map(q => {
                const isAdded = added.includes(q.id)
                return (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 transition-all"
                    style={{
                      border: isAdded ? '1px solid #c7d2fe' : '1px solid #E0E0E0',
                      borderRadius: 6,
                      background: isAdded ? '#EEF2FF' : '#fff',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: '#F5F5F5', color: '#616161', borderRadius: 4 }}>
                          {QUIZ_TYPES[q.type]?.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9E9E9E' }}>{q.points}점</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>{q.text}</p>
                    </div>
                    <button
                      onClick={() => !isAdded && onAdd({ ...q, bankName: selectedBank?.name })}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 transition-colors"
                      style={{
                        borderRadius: 4,
                        background: isAdded ? '#EEF2FF' : '#F5F5F5',
                        color: isAdded ? '#6366f1' : '#424242',
                        cursor: isAdded ? 'default' : 'pointer',
                      }}
                    >
                      {isAdded ? '추가됨' : '추가'}
                    </button>
                  </div>
                )
              })}
              {hasMore && <div className="py-4 text-center text-xs" style={{ color: '#9E9E9E' }}>스크롤하면 더 불러옵니다...</div>}
              {!hasMore && filtered.length > 0 && <div className="py-4 text-center text-xs" style={{ color: '#BDBDBD' }}>모든 문항을 불러왔습니다</div>}
              {filtered.length === 0 && <div className="py-10 text-center text-sm" style={{ color: '#BDBDBD' }}>검색 결과가 없습니다</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
