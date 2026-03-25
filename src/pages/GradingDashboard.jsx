import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowUpDown, CheckCircle2, AlertCircle, Download, Upload, FileDown,
  ChevronDown, ChevronUp, X, BarChart3, Users, RefreshCw,
  FileText, Search, FileEdit, Circle
} from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuestions, mockStudents, QUIZ_TYPES, mockQuizzes, getStudentAnswer, isAnswerCorrect } from '../data/mockData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'


const SORT_OPTIONS = [
  { value: 'ungraded_first', label: '미채점 우선' },
  { value: 'question_order', label: '문항 번호순' },
]

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

export default function GradingDashboard() {
  const { id } = useParams()
  const QUIZ_INFO = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]

  // 채점 모드: 'question' = 문항 중심, 'student' = 학생 중심
  const [gradingMode, setGradingMode] = useState('question')

  // 문항 중심 상태
  const [selectedQ, setSelectedQ] = useState(null)
  const [sortBy, setSortBy] = useState('ungraded_first')
  const [collapsedGraded, setCollapsedGraded] = useState(true)
  const [activeTab, setActiveTab] = useState('responses')

  // 학생 중심 상태
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')

  // 공통
  const [searchStudent, setSearchStudent] = useState('')
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showRegradeModal, setShowRegradeModal] = useState(false)
  const [mobileView, setMobileView] = useState('questions')

  const manualQuestions = mockQuestions.filter(q => !q.autoGrade)

  const sortedQuestions = useMemo(() => {
    if (sortBy === 'ungraded_first') {
      return [...manualQuestions].sort((a, b) => {
        const aComplete = a.gradedCount >= a.totalCount
        const bComplete = b.gradedCount >= b.totalCount
        if (aComplete === bComplete) return a.order - b.order
        return aComplete ? 1 : -1
      })
    }
    return [...manualQuestions].sort((a, b) => a.order - b.order)
  }, [sortBy])

  const gradedQuestions = sortedQuestions.filter(q => q.gradedCount >= q.totalCount)
  const ungradedQuestions = sortedQuestions.filter(q => q.gradedCount < q.totalCount)

  const questionStudents = useMemo(() => {
    if (!selectedQ) return []
    return mockStudents.filter(s => s.submitted).filter(s =>
      searchStudent === '' ||
      s.name.includes(searchStudent) ||
      s.studentId.includes(searchStudent)
    )
  }, [selectedQ, searchStudent])

  // 학생 중심 - 전체 학생 목록
  const allStudents = useMemo(() => {
    return mockStudents.filter(s => s.submitted).filter(s =>
      studentSearch === '' ||
      s.name.includes(studentSearch) ||
      s.studentId.includes(studentSearch)
    )
  }, [studentSearch])

  const gradedStudentList = allStudents.filter(s => s.score !== null)
  const ungradedStudentList = allStudents.filter(s => s.score === null)

  const handleSelectQ = (q) => {
    setSelectedQ(q)
    setMobileView('detail')
    setSearchStudent('')
  }

  const handleSelectStudent = (s) => {
    setSelectedStudent(s)
    setMobileView('detail')
  }

  const submitRate = Math.round((QUIZ_INFO.submitted / QUIZ_INFO.totalStudents) * 100)
  const gradeProgress = QUIZ_INFO.submitted > 0
    ? Math.round((QUIZ_INFO.graded / QUIZ_INFO.submitted) * 100) : 0

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: QUIZ_INFO.title },
      { label: '채점 대시보드' },
    ]}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* 퀴즈 정보 카드 */}
        <div className="card p-4 sm:p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-400">
                  {QUIZ_INFO.week}주차 {QUIZ_INFO.session}차시
                </span>
                <span className="w-px h-3 bg-gray-200 shrink-0" />
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  채점 중
                </span>
              </div>
              <h2 className="text-[15px] font-bold text-gray-900 mb-1">{QUIZ_INFO.title}</h2>
              <p className="text-xs text-gray-400">{QUIZ_INFO.startDate} ~ {QUIZ_INFO.dueDate}</p>
            </div>

            <div className="flex items-center gap-5 sm:gap-7 shrink-0">
              {[
                { label: '제출',      value: QUIZ_INFO.submitted,                          sub: `${submitRate}%`,        color: 'text-gray-900' },
                { label: '미제출',    value: QUIZ_INFO.totalStudents - QUIZ_INFO.submitted, sub: `${100 - submitRate}%`,  color: 'text-amber-500' },
                { label: '채점 완료', value: QUIZ_INFO.graded,                              sub: null,                    color: 'text-emerald-600' },
                { label: '미채점',    value: QUIZ_INFO.pendingGrade,                        sub: null,                    color: 'text-amber-500' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className={`text-[18px] font-bold leading-none ${item.color}`}>{item.value}</p>
                  {item.sub && <p className="text-[11px] text-indigo-500 font-medium mt-0.5">{item.sub}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>채점 진행률</span>
              <span className="font-semibold text-gray-600">{gradeProgress}%</span>
            </div>
            <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${gradeProgress}%`, background: 'linear-gradient(90deg, #818CF8, #6366F1)' }}
              />
            </div>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          {/* 채점 모드 전환 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {[
              { mode: 'question', icon: FileText, label: '문항 중심' },
              { mode: 'student',  icon: Users,    label: '학생 중심' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => { setGradingMode(mode); setMobileView('questions') }}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg transition-all ${
                  gradingMode === mode
                    ? 'bg-white text-gray-900 font-semibold shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/quiz/${QUIZ_INFO.id}/stats`}
              className="btn-secondary text-xs py-2 px-3"
            >
              <BarChart3 size={12} />
              <span className="hidden sm:block">퀴즈 통계</span>
            </Link>
            <button onClick={() => setShowRegradeModal(true)} className="btn-secondary text-xs py-2 px-3">
              <RefreshCw size={12} />
              <span className="hidden sm:block">재채점</span>
            </button>
            <button onClick={() => setShowPdfModal(true)} className="btn-primary text-xs py-2 px-3">
              <FileDown size={12} />
              <span>답안지 출력</span>
            </button>
          </div>
        </div>

        {/* 모바일 탭 전환 */}
        <div className="flex sm:hidden mb-4 bg-gray-100 rounded-xl p-1 gap-0.5">
          {[
            { view: 'questions', label: gradingMode === 'question' ? '문항 목록' : '학생 목록' },
            { view: 'detail',    label: gradingMode === 'question' ? (selectedQ ? `Q${selectedQ.order} 상세` : '문항 선택') : (selectedStudent ? selectedStudent.name : '학생 선택') },
          ].map(({ view, label }) => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className={`flex-1 text-xs py-2 rounded-lg transition-all ${mobileView === view ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Split-pane */}
        <div className="flex gap-4 min-h-[calc(100vh-360px)]">

          {gradingMode === 'question' ? (
            <>
              {/* 문항 중심: 좌측 문항 목록 */}
              <aside className={`${mobileView === 'questions' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">
                    주관식 {manualQuestions.length}문항
                  </span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none text-xs bg-white border border-slate-300 text-slate-600 pl-2.5 pr-6 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:border-indigo-400 shadow-sm"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
                  {ungradedQuestions.map(q => (
                    <QuestionItem key={q.id} question={q} selected={selectedQ?.id === q.id} onClick={() => handleSelectQ(q)} />
                  ))}

                  {gradedQuestions.length > 0 && (
                    <div>
                      <button
                        onClick={() => setCollapsedGraded(!collapsedGraded)}
                        className="flex items-center justify-between w-full text-xs text-slate-400 py-2 px-2 hover:text-slate-600 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          채점 완료 ({gradedQuestions.length})
                        </span>
                        {collapsedGraded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </button>
                      {!collapsedGraded && gradedQuestions.map(q => (
                        <QuestionItem key={q.id} question={q} selected={selectedQ?.id === q.id} onClick={() => handleSelectQ(q)} dimmed />
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* 문항 중심: 우측 상세 패널 */}
              <div className={`${mobileView === 'detail' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col min-w-0`}>
                {!selectedQ ? (
                  <EmptyState message="문항을 선택하면 학생 답안을 채점할 수 있습니다" />
                ) : (
                  <QuestionDetailPanel
                    question={selectedQ}
                    students={questionStudents}
                    search={searchStudent}
                    onSearch={setSearchStudent}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onExcel={() => setShowExcelModal(true)}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {/* 학생 중심: 좌측 학생 목록 */}
              <aside className={`${mobileView === 'questions' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0`}>
                <div className="mb-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="학생 이름 또는 학번"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-700 placeholder-slate-400 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                  {ungradedStudentList.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-amber-700 font-medium px-2 py-1.5 bg-amber-50 rounded-lg mb-1 flex items-center gap-1.5">
                        <AlertCircle size={11} />미채점 ({ungradedStudentList.length}명)
                      </p>
                      {ungradedStudentList.map(s => (
                        <StudentListItem
                          key={s.id} student={s}
                          selected={selectedStudent?.id === s.id}
                          onClick={() => handleSelectStudent(s)}
                        />
                      ))}
                    </div>
                  )}
                  {gradedStudentList.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-700 font-medium px-2 py-1.5 bg-emerald-50 rounded-lg mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={11} />채점 완료 ({gradedStudentList.length}명)
                      </p>
                      {gradedStudentList.map(s => (
                        <StudentListItem
                          key={s.id} student={s}
                          selected={selectedStudent?.id === s.id}
                          onClick={() => handleSelectStudent(s)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* 학생 중심: 우측 학생별 전체 문항 */}
              <div className={`${mobileView === 'detail' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col min-w-0`}>
                {!selectedStudent ? (
                  <EmptyState message="학생을 선택하면 전체 문항 답안을 확인할 수 있습니다" />
                ) : (
                  <StudentDetailPanel student={selectedStudent} questions={mockQuestions} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showExcelModal && <ExcelModal question={selectedQ} onClose={() => setShowExcelModal(false)} />}
      {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}
      {showRegradeModal && <RegradeModal onClose={() => setShowRegradeModal(false)} />}
    </Layout>
  )
}

// ─── 문항 중심: 문항 아이템 ─────────────────────────────────────────────────
function QuestionItem({ question, selected, onClick, dimmed }) {
  const isComplete = question.gradedCount >= question.totalCount
  const progress = Math.round((question.gradedCount / question.totalCount) * 100)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
          : dimmed
          ? 'border-slate-100 bg-slate-50 hover:border-slate-200'
          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${selected ? 'text-indigo-600' : 'text-slate-400'}`}>
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {isComplete && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 size={10} />완료
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed line-clamp-2 ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>
            {question.text}
          </p>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{question.points}점</span>
      </div>

      {!isComplete && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{question.gradedCount}/{question.totalCount}명</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </button>
  )
}

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel }) {
  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400">Q{question.order}</span>
              <TypeBadge type={question.type} />
              <span className="text-xs text-slate-400">{question.points}점</span>
              <GradeStatus question={question} />
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">{question.text}</p>
            {question.correctAnswer && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                모범 답안: {question.correctAnswer}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <TabBtn active={activeTab === 'responses'} onClick={() => onTabChange('responses')}>
            <Users size={12} />응시 현황 ({question.totalCount})
          </TabBtn>
          <TabBtn active={activeTab === 'stats'} onClick={() => onTabChange('stats')}>
            <BarChart3 size={12} />통계
          </TabBtn>
        </div>
        {activeTab === 'responses' && (
          <button
            onClick={onExcel}
            className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={12} />
            엑셀 일괄 채점
          </button>
        )}
      </div>

      {activeTab === 'responses' ? (
        <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} />
      ) : (
        <StatsTab question={question} students={mockStudents} />
      )}
    </div>
  )
}

// ─── 문항 중심: 응시 현황 탭 ───────────────────────────────────────────────
function ResponsesTab({ question, students, search, onSearch }) {
  const gradedStudents = students.filter(s => s.score !== null)
  const ungradedStudents = students.filter(s => s.score === null)

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="학생 이름 또는 학번 검색"
            className="w-full bg-white border border-slate-300 text-xs text-slate-700 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
          />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{students.length}명</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {ungradedStudents.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border-b border-slate-100 flex items-center gap-1.5">
              <AlertCircle size={11} />미채점 ({ungradedStudents.length}명)
            </div>
            {ungradedStudents.map(s => (
              <StudentRow key={s.id} student={s} question={question} />
            ))}
          </div>
        )}
        {gradedStudents.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border-b border-slate-100 flex items-center gap-1.5">
              <CheckCircle2 size={11} />채점 완료 ({gradedStudents.length}명)
            </div>
            {gradedStudents.map(s => (
              <StudentRow key={s.id} student={s} question={question} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 문항 중심: 학생 행 (문항 유형별 채점 UI) ─────────────────────────────
function StudentRow({ student, question }) {
  const [expanded, setExpanded] = useState(false)
  const [score, setScore] = useState(student.score ?? '')
  const [saved, setSaved] = useState(student.score !== null)
  const isGraded = student.score !== null || saved

  const answer = student.response || getStudentAnswer(parseInt(student.id.replace('s', '')), question.id)
  const autoCorrect = question.autoGrade ? isAnswerCorrect(answer, question.id) : null

  return (
    <div className={`border-b border-slate-100 hover:bg-slate-50 transition-colors`}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{student.name}</span>
            <span className="text-xs text-slate-400">{student.studentId}</span>
          </div>
          {expanded && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{answer}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isGraded ? (
            <span className="text-sm font-bold text-emerald-600">{score || student.score}점</span>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">미채점</span>
          )}
          {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
            {/* 제출 답안 */}
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">제출 답안</p>
              <p className="text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2">
                {answer}
              </p>
            </div>

            {/* 자동채점 결과 표시 */}
            {question.autoGrade && autoCorrect !== null && (
              <div className={`flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg border ${
                autoCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {autoCorrect ? <CheckCircle2 size={13} /> : <X size={13} />}
                {autoCorrect ? '정답' : '오답'}
                {question.correctAnswer && !autoCorrect && (
                  <span className="ml-1">· 정답: {question.correctAnswer}</span>
                )}
              </div>
            )}

            {/* 채점 입력 (수동채점 문항) */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">제출: {student.endTime || '-'}</span>
              {!question.autoGrade && (
                <div className="flex items-center gap-2">
                  {saved && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={11} />저장됨
                    </span>
                  )}
                  <input
                    type="number"
                    value={score}
                    onChange={e => { setScore(e.target.value); setSaved(false) }}
                    placeholder="점수"
                    min={0}
                    max={question.points}
                    className="w-16 bg-white border border-slate-300 text-xs text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400 text-center"
                  />
                  <span className="text-xs text-slate-400">/ {question.points}</span>
                  <button
                    onClick={() => setSaved(true)}
                    disabled={score === '' || Number(score) > question.points || Number(score) < 0}
                    className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 학생 중심: 학생 리스트 아이템 ────────────────────────────────────────
function StudentListItem({ student, selected, onClick }) {
  const totalAutoScore = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
  const totalManualScore = student.manualScores
    ? Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
    : 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl border transition-all mb-1 ${
        selected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>
            {student.name}
          </p>
          <p className="text-xs text-slate-400">{student.studentId}</p>
        </div>
        {student.score !== null ? (
          <span className="text-sm font-bold text-emerald-600 shrink-0">{student.score}점</span>
        ) : (
          <span className="text-xs text-amber-600 shrink-0">미채점</span>
        )}
      </div>
    </button>
  )
}

// ─── 학생 중심: 학생별 전체 문항 패널 ─────────────────────────────────────
function StudentDetailPanel({ student, questions }) {
  const studentIdx = parseInt(student.id.replace('s', '')) - 1
  const [savedQIds, setSavedQIds] = useState(new Set())
  const cardRefs = useRef({})

  const handleSaved = useCallback((qId) => {
    setSavedQIds(prev => {
      const next = new Set(prev)
      next.add(qId)
      const manualQs = questions.filter(q => !q.autoGrade)
      const currentIdx = manualQs.findIndex(q => q.id === qId)
      for (let i = currentIdx + 1; i < manualQs.length; i++) {
        if (!next.has(manualQs[i].id)) {
          setTimeout(() => {
            cardRefs.current[manualQs[i].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 150)
          break
        }
      }
      return next
    })
  }, [questions])

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 학생 정보 헤더 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
              {student.name[0]}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{student.name}</p>
              <p className="text-xs text-slate-400">{student.studentId} · {student.department}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">제출</p>
            <p className="text-xs text-slate-500">{student.endTime || '-'}</p>
          </div>
        </div>
      </div>

      {/* 문항별 답안 카드 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2.5 pr-1">
        {questions.map(q => (
          <div key={q.id} ref={el => { cardRefs.current[q.id] = el }}>
            <AnswerCard question={q} student={student} studentIdx={studentIdx} onSaved={() => handleSaved(q.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 학생 중심: 문항별 답안 카드 ──────────────────────────────────────────
function AnswerCard({ question, student, studentIdx, onSaved }) {
  const [score, setScore] = useState(() => {
    if (question.autoGrade) {
      return student.autoScores?.[question.id] ?? question.points
    }
    return student.manualScores?.[question.id] ?? ''
  })
  const [saved, setSaved] = useState(question.autoGrade || (student.manualScores?.[question.id] != null))

  const answer = getStudentAnswer(studentIdx, question.id)
  const autoCorrect = question.autoGrade ? isAnswerCorrect(answer, question.id) : null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {/* 문항 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400">Q{question.order}</span>
          <TypeBadge type={question.type} small />
          <span className="text-xs text-slate-400">{question.points}점</span>
          {question.autoGrade && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">자동채점</span>
          )}
        </div>
        {/* 점수 표시 */}
        <div className="flex items-center gap-1.5">
          {question.autoGrade ? (
            <span className={`text-sm font-bold ${autoCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
              {autoCorrect ? question.points : 0}점
            </span>
          ) : saved && score !== '' ? (
            <span className="text-sm font-bold text-emerald-600">{score}점</span>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">미채점</span>
          )}
        </div>
      </div>

      {/* 문항 텍스트 */}
      <p className="text-xs text-slate-500 mb-2 leading-relaxed">{question.text}</p>

      {/* 답안 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 mb-2 leading-relaxed">
        {answer}
      </div>

      {/* 자동채점: 정답/오답 배지 */}
      {question.autoGrade && autoCorrect !== null && (
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg mb-2 ${
          autoCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {autoCorrect ? <CheckCircle2 size={12} /> : <X size={12} />}
          {autoCorrect ? '정답' : '오답'}
          {question.correctAnswer && !autoCorrect && (
            <span className="ml-1 text-slate-500">· 정답: {question.correctAnswer}</span>
          )}
        </div>
      )}

      {/* 수동채점 입력 */}
      {!question.autoGrade && (
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-slate-500">점수</label>
          <input
            type="number"
            value={score}
            onChange={e => { setScore(e.target.value); setSaved(false) }}
            min={0}
            max={question.points}
            placeholder="0"
            className="w-16 bg-white border border-slate-300 text-sm text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400 text-center"
          />
          <span className="text-xs text-slate-400">/ {question.points}</span>
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 ml-1">
              <CheckCircle2 size={11} />저장됨
            </span>
          )}
          <button
            onClick={() => { setSaved(true); onSaved?.() }}
            disabled={score === '' || Number(score) > question.points || Number(score) < 0}
            className="ml-auto text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            저장
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 통계 탭 ───────────────────────────────────────────────────────────────
function StatsTab({ question, students }) {
  const gradedStudents = students.filter(s => s.score !== null)
  const scores = gradedStudents.map(s => s.score)
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
  const max = scores.length ? Math.max(...scores) : '-'
  const min = scores.length ? Math.min(...scores) : '-'

  const distribution = Array.from({ length: Math.ceil(question.points / 2) }, (_, i) => {
    const low = i * 2
    const high = Math.min(low + 2, question.points)
    return {
      range: `${low}-${high}`,
      count: scores.filter(s => s >= low && s < high + (i === Math.ceil(question.points / 2) - 1 ? 1 : 0)).length,
    }
  })

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto scrollbar-thin shadow-sm">
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="평균 점수" value={avg} unit="점" accent />
        <StatCard label="최고 점수" value={max} unit="점" />
        <StatCard label="최저 점수" value={min} unit="점" />
        <StatCard label="채점 완료" value={gradedStudents.length} unit={`/ ${students.length}명`} />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 mb-3">점수 분포</h3>
        {gradedStudents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">채점 완료된 학생이 없습니다</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#475569' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((_, i) => (
                  <Cell key={i} fill={i === Math.floor(distribution.length / 2) ? '#6366f1' : '#e0e7ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}


// ─── 공용 컴포넌트 ─────────────────────────────────────────────────────────
function StatCard({ label, value, unit, accent }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{unit}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  const colorClass = LIGHT_COLORS[type] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium ${colorClass} ${small ? 'text-[10px]' : ''}`}>
      {cfg.label}
    </span>
  )
}

function GradeStatus({ question }) {
  const complete = question.gradedCount >= question.totalCount
  if (complete) {
    return (
      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
        <CheckCircle2 size={10} />채점 완료
      </span>
    )
  }
  return (
    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
      <AlertCircle size={10} />미채점 {question.totalCount - question.gradedCount}명
    </span>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="text-center px-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <FileText size={20} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  )
}

// ─── 모달 ──────────────────────────────────────────────────────────────────
function ExcelModal({ question, onClose }) {
  const [step, setStep] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = () => {
    setStep('downloading')
    setTimeout(() => setStep('idle'), 1500)
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입/크기 검증
    const validTypes = ['.xlsx', '.xls', '.csv']
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)
    if (!ext || !validTypes.includes(ext[0])) {
      setErrorMsg('xlsx, xls, csv 형식의 파일만 업로드할 수 있습니다.')
      setStep('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('파일 크기는 10MB 이하여야 합니다.')
      setStep('error')
      return
    }

    setStep('uploading')
    setTimeout(() => {
      // 데모: 90% 성공
      if (Math.random() < 0.1) {
        setStep('error')
        setErrorMsg('3행: 점수가 배점(10점)을 초과합니다. 전체 업로드가 취소되었습니다.')
      } else {
        setStep('success')
      }
    }, 1800)
  }

  return (
    <Modal onClose={onClose} title="엑셀 일괄 채점">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-500">
          <p className="font-medium text-slate-700 mb-1.5">Q{question?.order}. 일괄 채점 방법</p>
          <ol className="space-y-1 text-xs">
            <li>① 양식 다운로드 후 점수 열에 값 입력 (0 ~ {question?.points}점)</li>
            <li>② 파일 저장 후 업로드</li>
            <li className="text-amber-600 font-medium">③ 오류가 1개라도 있으면 전체 업로드 취소</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className={`flex items-center justify-center gap-2 border rounded-xl py-3 text-sm transition-colors ${
              step === 'downloading' ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Download size={15} />
            {step === 'downloading' ? '다운로드 중...' : '양식 다운로드'}
          </button>

          <label className={`flex items-center justify-center gap-2 border rounded-xl py-3 text-sm cursor-pointer transition-colors ${
            step === 'uploading' ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}>
            <Upload size={15} />
            {step === 'uploading' ? '업로드 중...' : '파일 업로드'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
            <div className="font-medium mb-1 flex items-center gap-1.5"><AlertCircle size={13} />업로드 실패</div>
            <p>{errorMsg}</p>
            <button className="mt-2 text-red-600 hover:text-red-800 underline" onClick={() => setStep('idle')}>
              다시 시도
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
            <div className="font-medium flex items-center gap-1.5"><CheckCircle2 size={13} />채점 완료</div>
            <p className="mt-1">82명의 점수가 성공적으로 반영되었습니다.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function PdfModal({ onClose }) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  const handleGenerate = () => {
    setProgress(1)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); setDone(true); return 100 }
        return prev + Math.floor(Math.random() * 8) + 3
      })
    }, 200)
  }

  return (
    <Modal onClose={onClose} title="답안지 일괄 출력">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-500">
          <p>응시한 <span className="text-slate-900 font-semibold">82명</span> 전원의 문제지와 제출 답안이 PDF로 생성됩니다.</p>
          <p className="text-xs mt-1 text-slate-400">감사·증빙 자료로 보관할 수 있습니다.</p>
        </div>

        {progress === 0 && (
          <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-3 rounded-xl transition-colors shadow-sm">
            <FileDown size={15} />PDF 생성 시작
          </button>
        )}

        {progress > 0 && !done && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>PDF 생성 중...</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={13} />PDF 생성 완료 (82개 답안지)
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 rounded-xl transition-colors shadow-sm">
              <Download size={15} />다운로드
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function RegradeModal({ onClose }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Modal onClose={onClose} title="재채점">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          <p className="font-medium mb-1">재채점 시 주의사항</p>
          <p className="text-xs">정답 기준을 수정하면 해당 문항에 응시한 <span className="font-bold">82명 전원</span>의 점수가 즉시 재계산됩니다.</p>
          <p className="text-xs mt-1.5 text-amber-600">자동채점 문항만 재산출되며, 수동채점(주관식·서술형) 점수는 변경되지 않습니다.</p>
          <p className="text-xs mt-1">점수 변경 시 해당 학생에게 LMS 메시지 알림이 발송됩니다.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">변경할 정답 기준</label>
          <input
            type="text"
            defaultValue="외래키(Foreign Key)"
            className="w-full bg-white border border-slate-300 text-sm text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-400"
          />
          <p className="text-xs text-slate-400 mt-1">쉼표로 구분하면 복수 정답 처리됩니다</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-indigo-500" />
          <span className="text-sm text-slate-600">위 내용을 확인했으며, 전체 재채점을 진행합니다.</span>
        </label>

        <button
          disabled={!confirmed}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-xl transition-colors shadow-sm"
        >
          <RefreshCw size={14} />재채점 실행
        </button>
      </div>
    </Modal>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
