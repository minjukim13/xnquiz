import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, GripVertical, Trash2, X, Search } from 'lucide-react'
import Layout from '../components/Layout'
import CustomSelect from '../components/CustomSelect'
import { QUIZ_TYPES } from '../data/mockData'

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

const INITIAL_BANKS = ['DB 기초', 'SQL 심화', '설계 원칙', '트랜잭션']

const QUESTION_BANK = Array.from({ length: 60 }, (_, i) => ({
  id: `bank_q${i + 1}`,
  text: [
    'SQL SELECT 문의 기본 구조를 설명하시오.',
    '정규화의 목적과 단계를 서술하시오.',
    'JOIN의 종류와 각 특징을 설명하시오.',
    'PRIMARY KEY와 FOREIGN KEY의 차이점은?',
    'WHERE 절과 HAVING 절의 차이는?',
    '인덱스의 역할과 장단점을 설명하시오.',
    'ACID 속성이란 무엇인가?',
    '뷰(View)의 개념과 사용 목적은?',
    '서브쿼리와 JOIN의 성능 차이는?',
    'GROUP BY 절의 사용 방법을 예시와 함께 설명하시오.',
  ][i % 10] + (i > 9 ? ` (${Math.floor(i / 10) + 1})` : ''),
  type: Object.keys(QUIZ_TYPES)[i % Object.keys(QUIZ_TYPES).length],
  points: [3, 5, 8, 10, 15][i % 5],
  bank: INITIAL_BANKS[i % 4],
}))

const LIGHT_COLORS = {
  multiple_choice:         'bg-blue-50 text-blue-700',
  true_false:              'bg-purple-50 text-purple-700',
  multiple_answers:        'bg-indigo-50 text-indigo-700',
  short_answer:            'bg-amber-50 text-amber-700',
  essay:                   'bg-orange-50 text-orange-700',
  numerical:               'bg-teal-50 text-teal-700',
  matching:                'bg-pink-50 text-pink-700',
  fill_in_blank:           'bg-cyan-50 text-cyan-700',
  fill_in_multiple_blanks: 'bg-sky-50 text-sky-700',
  multiple_dropdowns:      'bg-violet-50 text-violet-700',
  ordering:                'bg-lime-50 text-lime-700',
  file_upload:             'bg-rose-50 text-rose-700',
}

const DEFAULT_NOTICE = `- 제출 후에는 답안을 수정할 수 없습니다.
- 타인과의 협력 및 자료 공유는 금지됩니다.
- 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.
- 제한 시간 내에 제출하지 않으면 자동 제출되지 않습니다.`

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
        <h1 className="text-xl font-bold text-slate-900 mb-6">새 퀴즈 만들기</h1>

        {/* 탭 */}
        <div className="flex border-b border-slate-200 mb-6">
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
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
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
                onClick={() => navigate('/')}
                className="btn-primary text-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
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
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
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
            <div className="flex gap-2 flex-wrap pt-0.5">
              {SESSION_OPTIONS.map(s => (
                <label key={s.value} className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => set('session', s.value)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                      form.session === s.value
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-slate-300 bg-white hover:border-indigo-300'
                    }`}
                  >
                    {form.session === s.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    onClick={() => set('session', s.value)}
                    className={`text-sm cursor-pointer transition-colors ${
                      form.session === s.value ? 'text-indigo-700 font-medium' : 'text-slate-600'
                    }`}
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
            className="rounded border-slate-300 text-indigo-500"
          />
          <span className="text-sm text-slate-600">마감 후 지각 제출 허용</span>
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
                <span className="text-sm text-slate-400 shrink-0">분</span>
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
        <p className="text-xs text-slate-400 mb-2">응시 전 학생에게 표시될 안내 문구입니다. 수정하거나 추가할 수 있습니다.</p>
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
          <p className="text-sm font-medium text-slate-700">{questions.length}문항 · 총 {totalPoints}점</p>
          <p className="text-xs text-slate-400 mt-0.5">문항을 추가하고 순서를 조정하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowBank}
            className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <BookOpen size={13} />
            문제은행에서 추가
          </button>
          <button
            onClick={onShowAdd}
            className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} />
            직접 추가
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-14 text-center bg-slate-50">
          <p className="text-sm text-slate-400 mb-3">아직 추가된 문항이 없습니다</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={onShowBank} className="text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              문제은행에서 추가
            </button>
            <button onClick={onShowAdd} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
              직접 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 bg-white border border-slate-200 rounded-xl p-3 group hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <GripVertical size={14} className="text-slate-300 cursor-grab" />
                <span className="text-xs font-bold text-slate-400 w-5 text-center">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${LIGHT_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                    {QUIZ_TYPES[q.type]?.label}
                  </span>
                  <span className="text-xs text-slate-400">{q.points}점</span>
                  {QUIZ_TYPES[q.type]?.autoGrade === false && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">수동채점</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
              </div>
              <button
                onClick={() => onRemove(q.id)}
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
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
      <h2 className="text-sm font-semibold text-gray-800 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-700 font-medium">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// ── 직접 문항 추가 모달 ────────────────────────────────────────────────────
function AddQuestionModal({ onClose, onAdd }) {
  const [step, setStep] = useState('type')
  const [selectedType, setSelectedType] = useState(null)
  const [form, setForm] = useState({ text: '', points: 5, correctAnswer: '' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleAdd = () => {
    onAdd({ type: selectedType, text: form.text, points: Number(form.points), correctAnswer: form.correctAnswer || null })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">문항 직접 추가</h3>
            {step === 'form' && selectedType && (
              <p className="text-xs text-slate-400 mt-0.5">{QUIZ_TYPES[selectedType]?.label}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {step === 'type' ? (
          <div className="p-4">
            <p className="text-sm text-slate-600 mb-4">추가할 문항 유형을 선택하세요</p>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {Object.entries(QUIZ_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedType(key); setStep('form') }}
                  className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all group"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${val.autoGrade === false ? 'bg-orange-400' : val.autoGrade === 'partial' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{val.label}</p>
                    <p className="text-xs text-slate-400">{val.autoGrade === false ? '수동채점' : val.autoGrade === 'partial' ? '부분자동' : '자동채점'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">문제 내용 <span className="text-red-500">*</span></label>
              <textarea
                value={form.text}
                onChange={e => set('text', e.target.value)}
                placeholder="문제를 입력하세요..."
                rows={3}
                className="w-full bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">배점</label>
                <input type="number" value={form.points} onChange={e => set('points', e.target.value)} min={1}
                  className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400" />
              </div>
              {QUIZ_TYPES[selectedType]?.autoGrade !== false && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">정답</label>
                  <input type="text" value={form.correctAnswer} onChange={e => set('correctAnswer', e.target.value)} placeholder="정답 입력"
                    className="w-full bg-white border border-slate-300 text-sm text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setStep('type')} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← 유형 다시 선택</button>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">취소</button>
                <button
                  disabled={!form.text}
                  onClick={handleAdd}
                  className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 문제은행에서 추가 모달 ─────────────────────────────────────────────────
function QuestionBankModal({ onClose, onAdd, added }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterBank, setFilterBank] = useState('all')
  const [visibleCount, setVisibleCount] = useState(15)

  const filtered = QUESTION_BANK.filter(q => {
    const matchSearch = search === '' || q.text.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || q.type === filterType
    const matchBank = filterBank === 'all' || q.bank === filterBank
    return matchSearch && matchType && matchBank
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const banks = ['all', ...new Set(QUESTION_BANK.map(q => q.bank))]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">문제은행에서 추가</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
              placeholder="문제 내용 검색..."
              className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-800 placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select value={filterBank} onChange={e => setFilterBank(e.target.value)}
              className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg focus:outline-none shrink-0">
              {banks.map(b => <option key={b} value={b}>{b === 'all' ? '모든 문제은행' : b}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg focus:outline-none shrink-0">
              <option value="all">모든 유형</option>
              {Object.entries(QUIZ_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-xs text-slate-400 shrink-0 ml-auto">{filtered.length}개</span>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2"
          onScroll={e => {
            const el = e.target
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) setVisibleCount(c => c + 10)
          }}
        >
          {visible.map(q => {
            const isAdded = added.includes(q.id)
            return (
              <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isAdded ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${LIGHT_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                      {QUIZ_TYPES[q.type]?.label}
                    </span>
                    <span className="text-xs text-slate-400">{q.bank}</span>
                    <span className="text-xs text-slate-400">{q.points}점</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{q.text}</p>
                </div>
                <button
                  onClick={() => !isAdded && onAdd(q)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isAdded ? 'bg-indigo-100 text-indigo-600 cursor-default' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isAdded ? '추가됨' : '추가'}
                </button>
              </div>
            )
          })}
          {hasMore && <div className="py-4 text-center text-xs text-slate-400">스크롤하면 더 불러옵니다...</div>}
          {!hasMore && filtered.length > 0 && <div className="py-4 text-center text-xs text-slate-300">모든 문항을 불러왔습니다</div>}
          {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-400">검색 결과가 없습니다</div>}
        </div>
      </div>
    </div>
  )
}
