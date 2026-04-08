import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import CustomSelect from '../components/CustomSelect'
import AddQuestionModal from '../components/AddQuestionModal'
import QuestionBankModal from '../components/QuestionBankModal'
import { QUIZ_TYPES, mockQuizzes, mockStudents } from '../data/mockData'
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog'

// ── 옵션 상수 ──────────────────────────────────────────────────────────────
const WEEK_OPTIONS = [
  { value: 0, label: '연결 안함' },
  ...Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}주차` })),
]
const SESSION_OPTIONS = [
  { value: 0, label: '연결 안함' },
  ...[1, 2, 3, 4].map(s => ({ value: s, label: `${s}차시` })),
]
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
    // 성적공개 정책
    scoreRevealEnabled: false,
    scoreRevealScope: 'wrong_only',       // 'wrong_only' | 'with_answer'
    scoreRevealTiming: 'immediately',     // 'immediately' | 'after_due' | 'period'
    scoreRevealStart: '',
    scoreRevealEnd: '',
    quizMode: 'graded',
    accessCode: '',
    ipRestriction: '',
    assignments: [],
    allowLateSubmit: false,
    notice: DEFAULT_NOTICE,
  })
  const [questions, setQuestions] = useState([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null) // { title, message, onConfirm }
  const [alertDialog, setAlertDialog] = useState(null)    // { title, message, variant }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const addAssignment = () => setForm(prev => ({
    ...prev,
    assignments: [...prev.assignments, { id: `a${Date.now()}`, assignTo: [], dueDate: '', availableFrom: '', availableUntil: '' }],
  }))
  const removeAssignment = (id) => setForm(prev => ({
    ...prev,
    assignments: prev.assignments.filter(a => a.id !== id),
  }))
  const updateAssignment = (id, field, val) => setForm(prev => ({
    ...prev,
    assignments: prev.assignments.map(a => a.id === id ? { ...a, [field]: val } : a),
  }))

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
  const moveQuestion = useCallback((fromIdx, toIdx) => {
    setQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }, [])
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
          <InfoTab form={form} set={set} addAssignment={addAssignment} removeAssignment={removeAssignment} updateAssignment={updateAssignment} />
        ) : (
          <QuestionsTab
            questions={questions}
            totalPoints={totalPoints}
            onShowBank={() => setShowBankModal(true)}
            onShowAdd={() => setShowAddModal(true)}
            onRemove={removeQuestion}
            onMove={moveQuestion}
          />
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: '1px solid #EEEEEE' }}>
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
                  // 중복 학생 검사
                  const allSelected = form.assignments.flatMap(a => a.assignTo.map(s => s.id))
                  const hasDuplicate = allSelected.length !== new Set(allSelected).size
                  if (hasDuplicate) {
                    setAlertDialog({
                      title: '중복 학생 설정',
                      message: '동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다.\n각 학생은 하나의 설정에만 포함될 수 있습니다.',
                      variant: 'warning',
                    })
                    return
                  }

                  const isMultiAttempt = form.allowAttempts >= 2 || form.allowAttempts === -1
                  const noRevealPeriod = form.scoreRevealEnabled
                    && form.scoreRevealTiming !== 'period' && form.scoreRevealTiming !== 'after_due'
                  const doPublish = () => {
                    mockQuizzes.push({
                      id: String(Date.now()),
                      title: form.title,
                      description: form.description,
                      course: 'CS301 데이터베이스',
                      quizMode: form.quizMode,
                      status: 'open',
                      startDate: form.startDate,
                      dueDate: form.dueDate,
                      week: form.week || null,
                      session: form.session || null,
                      timeLimit: form.timeLimitType === -1
                        ? Number(form.timeLimitCustom) || 0
                        : form.timeLimitType,
                      allowAttempts: form.allowAttempts,
                      scorePolicy: form.allowAttempts >= 2 || form.allowAttempts === -1
                        ? form.scorePolicy
                        : null,
                      shuffleChoices: form.shuffleChoices,
                      shuffleQuestions: form.shuffleQuestions,
                      scoreRevealEnabled: form.scoreRevealEnabled,
                      scoreRevealScope: form.scoreRevealEnabled ? form.scoreRevealScope : null,
                      scoreRevealTiming: form.scoreRevealEnabled ? form.scoreRevealTiming : null,
                      scoreRevealStart: (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealStart || null : null,
                      scoreRevealEnd:   (form.scoreRevealEnabled && form.scoreRevealTiming === 'period') ? form.scoreRevealEnd   || null : null,
                      accessCode: form.accessCode || null,
                      ipRestriction: form.ipRestriction || null,
                      assignments: form.assignments.filter(a => a.assignTo.length > 0),
                      allowLateSubmit: form.allowLateSubmit,
                      notice: form.notice,
                      totalStudents: 0,
                      submitted: 0,
                      graded: 0,
                      pendingGrade: 0,
                      questions: questions.length,
                      totalPoints,
                    })
                    navigate('/')
                  }
                  if (isMultiAttempt && noRevealPeriod) {
                    setConfirmDialog({
                      title: '점수 공개 기간 미설정',
                      message: '재응시가 허용된 퀴즈에서 점수 공개 기간이 설정되지 않으면, 1차 응시 마감 직후 점수(및 정답)가 공개되어 학생이 2차 응시 전에 정답을 확인할 수 있습니다.\n\n점수 공개 기간을 설정하지 않고 발행하시겠습니까?',
                      onConfirm: doPublish,
                    })
                  } else {
                    doPublish()
                  }
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
          currentCourse="CS301 데이터베이스"
        />
      )}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={addNewQuestion}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => { setConfirmDialog(null); confirmDialog.onConfirm() }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {alertDialog && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          variant={alertDialog.variant}
          onClose={() => setAlertDialog(null)}
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
function InfoTab({ form, set, addAssignment, removeAssignment, updateAssignment }) {
  return (
    <div className="space-y-5">

      {/* 퀴즈 유형 */}
      <Section title="퀴즈 유형">
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'graded', label: '평가용 퀴즈', desc: '성적에 반영됩니다' },
            { value: 'practice', label: '연습용 퀴즈', desc: '성적에 반영되지 않습니다' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => set('quizMode', opt.value)}
              className="text-left p-3 rounded transition-all"
              style={{
                border: form.quizMode === opt.value ? '2px solid #6366f1' : '1px solid #E0E0E0',
                background: form.quizMode === opt.value ? '#EEF2FF' : '#fff',
                marginTop: form.quizMode === opt.value ? 0 : '1px',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: form.quizMode === opt.value ? '#4338CA' : '#424242' }}>{opt.label}</p>
              <p className="text-xs mt-0.5" style={{ color: form.quizMode === opt.value ? '#6366f1' : '#9E9E9E' }}>{opt.desc}</p>
            </button>
          ))}
        </div>
        {form.quizMode === 'practice' && (
          <div className="flex items-start gap-2 p-2.5 rounded text-xs" style={{ background: '#FFF9E6', border: '1px solid #FBBF24', color: '#92400E' }}>
            <span className="shrink-0 font-bold mt-0.5">!</span>
            <span>연습용 퀴즈는 성적부에 반영되지 않으며, 학생이 반복 응시하여 학습 용도로 활용할 수 있습니다.</span>
          </div>
        )}
      </Section>

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
            <CustomSelect
              value={form.session}
              onChange={v => set('session', v)}
              options={SESSION_OPTIONS}
              placeholder="차시 선택"
            />
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
        {(form.allowAttempts >= 2 || form.allowAttempts === -1) && (
          <Field label="복수 응시 시 채점 방식">
            <CustomSelect
              value={form.scorePolicy}
              onChange={v => set('scorePolicy', v)}
              options={SCORE_POLICIES}
            />
          </Field>
        )}
      </Section>

      {/* 문항 표시 설정 */}
      <Section title="문항 표시 설정">
        <div className="space-y-3">
          <Toggle checked={form.shuffleChoices} onChange={v => set('shuffleChoices', v)} label="선택지 무작위 배열" description="학생마다 선택지 순서가 달라집니다" />
          <Toggle checked={form.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} label="문항 순서 무작위" description="학생마다 문항 순서가 달라집니다" />
        </div>
      </Section>

      {/* 성적 공개 정책 */}
      <Section title="성적 공개 정책">
        <div className="space-y-4">
          <Toggle
            checked={form.scoreRevealEnabled}
            onChange={v => set('scoreRevealEnabled', v)}
            label="성적 공개"
            description="제출 후 학생에게 성적 정보를 공개합니다"
          />
          {form.scoreRevealEnabled && (
            <div className="space-y-4 pt-1">

              {/* 공개 범위 */}
              <div className="p-4 rounded-lg" style={{ background: '#F8FAFF', border: '1px solid #E8EBFF' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#4F46E5' }}>공개 범위</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'wrong_only',  label: '오답 여부만',  desc: '정오답(✓/✗) + 점수만 표시\n정답은 공개하지 않습니다' },
                    { value: 'with_answer', label: '정답까지',     desc: '정오답(✓/✗) + 점수 +\n정답을 함께 표시합니다' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className="flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        border: `2px solid ${form.scoreRevealScope === opt.value ? '#6366f1' : '#E0E0E0'}`,
                        background: form.scoreRevealScope === opt.value ? '#EEF2FF' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="scoreRevealScope"
                          checked={form.scoreRevealScope === opt.value}
                          onChange={() => set('scoreRevealScope', opt.value)}
                          style={{ accentColor: '#6366f1' }}
                        />
                        <span className="text-sm font-semibold" style={{ color: form.scoreRevealScope === opt.value ? '#4F46E5' : '#212121' }}>{opt.label}</span>
                      </div>
                      <p className="text-xs leading-relaxed pl-5" style={{ color: '#9E9E9E', whiteSpace: 'pre-line' }}>{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* 공개 시점 */}
              <div className="p-4 rounded-lg" style={{ background: '#F8FAFF', border: '1px solid #E8EBFF' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#4F46E5' }}>공개 시점</p>
                <div className="space-y-2">
                  {[
                    { value: 'immediately', label: '제출 즉시',     desc: '학생이 제출하는 순간 바로 공개됩니다' },
                    { value: 'after_due',   label: '마감 후',        desc: '퀴즈 마감일이 지나면 자동으로 공개됩니다' },
                    { value: 'period',      label: '기간 설정',      desc: '지정한 기간에만 공개됩니다' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer py-1">
                      <input
                        type="radio"
                        name="scoreRevealTiming"
                        checked={form.scoreRevealTiming === opt.value}
                        onChange={() => set('scoreRevealTiming', opt.value)}
                        className="mt-0.5"
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#212121' }}>{opt.label}</span>
                        <p className="text-xs" style={{ color: '#9E9E9E' }}>{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.scoreRevealTiming === 'period' && (
                  <div className="mt-3 pt-3 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #E8EBFF' }}>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#616161' }}>공개 시작일</label>
                      <input type="datetime-local" value={form.scoreRevealStart} onChange={e => set('scoreRevealStart', e.target.value)} className="input text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#616161' }}>공개 종료일</label>
                      <input type="datetime-local" value={form.scoreRevealEnd} onChange={e => set('scoreRevealEnd', e.target.value)} className="input text-sm" />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </Section>

      {/* 추가 기간 설정 */}
      <Section title="추가 기간 설정">
        <p className="text-xs -mt-1" style={{ color: '#9E9E9E' }}>
          특정 학생에게 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다. 설정된 학생은 기본 기간보다 이 설정이 우선 적용됩니다.
        </p>
        <div className="space-y-2">
          {form.assignments.map((a, idx) => (
            <div key={a.id} className="p-3 rounded space-y-3" style={{ border: '1px solid #E0E0E0', background: '#FAFAFA' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: '#424242' }}>추가 대상 {idx + 1}</p>
                <button
                  onClick={() => removeAssignment(a.id)}
                  className="text-xs transition-colors px-2 py-0.5 rounded"
                  style={{ color: '#9E9E9E' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EF2B2A'; e.currentTarget.style.background = '#FFF0EF' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
                >
                  삭제
                </button>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>대상 학생</label>
                <AssignToSelector
                  selected={a.assignTo}
                  onChange={val => updateAssignment(a.id, 'assignTo', val)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>마감 일시</label>
                  <input type="datetime-local" value={a.dueDate} onChange={e => updateAssignment(a.id, 'dueDate', e.target.value)} className="input text-xs" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>열람 시작</label>
                  <input type="datetime-local" value={a.availableFrom} onChange={e => updateAssignment(a.id, 'availableFrom', e.target.value)} className="input text-xs" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9E9E9E' }}>열람 마감</label>
                  <input type="datetime-local" value={a.availableUntil} onChange={e => updateAssignment(a.id, 'availableUntil', e.target.value)} className="input text-xs" />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addAssignment}
            className="w-full text-sm py-2 rounded transition-colors"
            style={{ border: '1px dashed #BDBDBD', color: '#9E9E9E' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#F5F3FF' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
          >
            + 학생 추가
          </button>
        </div>
      </Section>

      {/* 퀴즈 접근 제한 */}
      <Section title="퀴즈 접근 제한">
        <Field label="액세스 코드">
          <input
            type="text"
            value={form.accessCode}
            onChange={e => set('accessCode', e.target.value)}
            placeholder="코드를 입력하면 응시 시 코드 입력이 필요합니다"
            className="input"
          />
          <p className="text-xs mt-1.5" style={{ color: '#9E9E9E' }}>비워두면 액세스 코드 없이 응시 가능합니다.</p>
        </Field>
        <Field label="접근 가능한 IP 주소">
          <textarea
            value={form.ipRestriction}
            onChange={e => set('ipRestriction', e.target.value)}
            placeholder={'허용할 IP 주소를 한 줄에 하나씩 입력하세요\n예) 192.168.1.0/24\n    203.0.113.10'}
            rows={3}
            className="input resize-none text-sm font-mono"
          />
          <p className="text-xs mt-1.5" style={{ color: '#9E9E9E' }}>비워두면 모든 IP에서 접근 가능합니다. CIDR 표기법 지원.</p>
        </Field>
      </Section>

      {/* 퀴즈 안내사항 */}
      <Section title="퀴즈 안내사항">
        <p className="text-xs mb-2" style={{ color: '#9E9E9E' }}>응시 전 학생에게 표시될 안내 문구입니다. 수정하거나 추가할 수 있습니다.</p>
        <textarea
          value={form.notice}
          onChange={e => set('notice', e.target.value)}
          rows={3}
          className="input resize-y text-sm leading-relaxed"
          placeholder="학생에게 안내할 퀴즈 정책을 입력하세요."
        />
      </Section>

    </div>
  )
}

// ── 문항 구성 탭 ───────────────────────────────────────────────────────────
function QuestionsTab({ questions, totalPoints, onShowBank, onShowAdd, onRemove, onMove }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx !== null && dragIdx !== i) onMove(dragIdx, i)
    setDragIdx(null)
    setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

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
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ color: '#424242', border: '1px solid #E0E0E0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            문제은행에서 추가
          </button>
          <button
            onClick={onShowAdd}
            className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
          >
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

// ── Canvas 스타일 대상 학생 선택기 ─────────────────────────────────────────
const STUDENT_OPTIONS = mockStudents.slice(0, 30).map(s => ({
  id: s.id,
  label: s.name,
  sub: s.studentId,
}))

function AssignToSelector({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = STUDENT_OPTIONS.filter(opt => {
    if (selected.find(s => s.id === opt.id)) return false
    if (query === '') return true
    return opt.label.toLowerCase().includes(query.toLowerCase()) || opt.sub.includes(query)
  })

  const addItem = (opt) => {
    onChange([...selected, { id: opt.id, label: opt.label }])
    setQuery('')
  }

  const removeItem = (id) => onChange(selected.filter(s => s.id !== id))

  return (
    <div className="relative">
      <div
        className="min-h-10 flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 cursor-text"
        style={{ border: '1px solid #E0E0E0', borderRadius: 6, background: '#fff' }}
        onClick={() => setOpen(true)}
      >
        {selected.map(s => (
          <span
            key={s.id}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #c7d2fe' }}
          >
            {s.label}
            <button
              onClick={e => { e.stopPropagation(); removeItem(s.id) }}
              className="ml-0.5 leading-none"
              style={{ color: 'inherit', opacity: 0.6 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? '학생 이름 또는 학번 검색' : ''}
          className="flex-1 min-w-24 text-sm bg-transparent focus:outline-none py-0.5"
          style={{ color: '#222222' }}
        />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery('') }} />
          <div
            className="absolute z-20 w-full mt-1 bg-white rounded overflow-hidden"
            style={{ border: '1px solid #E0E0E0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto' }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center" style={{ color: '#9E9E9E' }}>검색 결과 없음</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={e => { e.preventDefault(); addItem(opt) }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors"
                  style={{ color: '#222222' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs" style={{ color: '#9E9E9E' }}>{opt.sub}</span>
                </button>
              ))
            )}
          </div>
        </>
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


