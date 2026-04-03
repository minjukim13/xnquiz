import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpDown, CheckCircle2, AlertCircle, Download, Upload, FileDown,
  ChevronDown, ChevronUp, X, BarChart3, Users, RefreshCw,
  FileText, Search, FileEdit, Circle
} from 'lucide-react'
import Layout from '../components/Layout'
import { mockStudents, QUIZ_TYPES, mockQuizzes, getStudentAnswer, isAnswerCorrect, getQuizQuestions } from '../data/mockData'
import { downloadAnswerSheetsXlsx, downloadGradingSheetXlsx, parseExcelOrCsv } from '../utils/excelUtils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'


function getLocalGrades() {
  try {
    const raw = localStorage.getItem('xnq_manual_grades')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalGrades(grades) {
  try {
    localStorage.setItem('xnq_manual_grades', JSON.stringify(grades))
  } catch {
    // QuotaExceededError 등 무시
  }
}

const SORT_OPTIONS = [
  { value: 'ungraded_first', label: '미채점 우선' },
  { value: 'question_order', label: '문항 번호순' },
]


export default function GradingDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const QUIZ_INFO = mockQuizzes.find(q => q.id === id)

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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [mobileView, setMobileView] = useState('questions')

  // gradedCount 실시간 반영을 위한 버전 카운터
  const [gradeVersion, setGradeVersion] = useState(0)
  const onGradeSaved = useCallback(() => setGradeVersion(v => v + 1), [])

  const quizQuestions = getQuizQuestions(id)

  // localStorage 채점 기록을 반영한 실시간 gradedCount 계산
  const questionsWithLiveCounts = useMemo(() => {
    const grades = getLocalGrades()
    const submittedStudents = mockStudents.filter(s => s.submitted)
    return quizQuestions.map(q => {
      if (q.autoGrade) return q
      const gradedCount = submittedStudents.filter(s => {
        const key = `${id}_${s.id}_${q.id}`
        return (key in grades) || s.manualScores?.[q.id] != null
      }).length
      return { ...q, gradedCount }
    })
  }, [quizQuestions, id, gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const manualQuestions = questionsWithLiveCounts.filter(q => !q.autoGrade)

  const sortedQuestions = useMemo(() => {
    if (!QUIZ_INFO) return []
    if (sortBy === 'ungraded_first') {
      return [...manualQuestions].sort((a, b) => {
        const aComplete = a.gradedCount >= a.totalCount
        const bComplete = b.gradedCount >= b.totalCount
        if (aComplete === bComplete) return a.order - b.order
        return aComplete ? 1 : -1
      })
    }
    return [...manualQuestions].sort((a, b) => a.order - b.order)
  }, [sortBy, QUIZ_INFO, manualQuestions])

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

  // 유효하지 않은 quiz id 처리 (모든 hook 이후)
  if (!QUIZ_INFO) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#B43200' }} />
          <p className="text-sm font-medium mb-1" style={{ color: '#222222' }}>퀴즈를 찾을 수 없습니다</p>
          <Link to="/" className="text-xs text-indigo-600 hover:underline">퀴즈 목록으로 돌아가기</Link>
        </div>
      </Layout>
    )
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
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 xl:px-16 py-6">

        {/* 퀴즈 정보 카드 */}
        <div className="card p-5 sm:p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs" style={{ color: '#9E9E9E' }}>
                  {QUIZ_INFO.week}주차 {QUIZ_INFO.session}차시
                </span>
                <span className="w-px h-3 shrink-0" style={{ background: '#EEEEEE' }} />
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#B43200' }}>
                  채점 중
                </span>
              </div>
              <h2 className="text-lg font-bold mb-1.5" style={{ color: '#222222' }}>{QUIZ_INFO.title}</h2>
              <p className="text-sm" style={{ color: '#9E9E9E' }}>{QUIZ_INFO.startDate} ~ {QUIZ_INFO.dueDate}</p>
            </div>

            <div className="flex items-stretch shrink-0 rounded-lg overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
              {[
                { label: '제출',      value: QUIZ_INFO.submitted,                           sub: `${submitRate}%`,                                                                          styleColor: '#222222' },
                { label: '채점 완료', value: QUIZ_INFO.graded,                               sub: `${QUIZ_INFO.submitted > 0 ? Math.round(QUIZ_INFO.graded / QUIZ_INFO.submitted * 100) : 0}%`,        styleColor: '#018600' },
                { label: '미채점',    value: QUIZ_INFO.pendingGrade,                         sub: `${QUIZ_INFO.submitted > 0 ? Math.round(QUIZ_INFO.pendingGrade / QUIZ_INFO.submitted * 100) : 0}%`,   styleColor: '#B43200' },
                { label: '미제출',    value: QUIZ_INFO.totalStudents - QUIZ_INFO.submitted,  sub: `${100 - submitRate}%`,                                                                    styleColor: '#9E9E9E' },
              ].map((item, i) => (
                <div key={item.label} className="flex flex-col items-center justify-center px-6 py-4 text-center"
                  style={{ borderLeft: i > 0 ? '1px solid #EEEEEE' : 'none', minWidth: 72 }}>
                  <p className="text-2xl font-bold leading-none" style={{ color: item.styleColor }}>{item.value}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: '#9E9E9E' }}>{item.sub}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9E9E9E' }}>
              <span>채점 진행률</span>
              <span className="font-semibold" style={{ color: '#424242' }}>{gradeProgress}%</span>
            </div>
            <div className="h-[4px] rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
              <div
                className="h-full bg-indigo-500 rounded transition-all"
                style={{ width: `${gradeProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          {/* 채점 모드 전환 */}
          <div className="flex items-center p-0.5 gap-0.5 rounded" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0' }}>
            {[
              { mode: 'question', icon: FileText, label: '문항 중심' },
              { mode: 'student',  icon: Users,    label: '학생 중심' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => { setGradingMode(mode); setMobileView('questions') }}
                className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded transition-all"
                style={gradingMode === mode
                  ? { background: '#fff', color: '#222222', fontWeight: 600, border: '1px solid #E0E0E0' }
                  : { color: '#9E9E9E', border: '1px solid transparent' }
                }
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
            <button
              onClick={() => downloadAnswerSheetsXlsx(QUIZ_INFO, mockStudents.filter(s => s.submitted), quizQuestions, { getStudentAnswer })}
              className="btn-secondary text-xs py-2 px-3"
            >
              <FileDown size={12} />
              <span>답안지 다운로드</span>
            </button>
            {!showCloseConfirm ? (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="text-xs font-semibold px-3.5 py-2 transition-colors"
                style={{ background: '#018600', color: '#fff', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = '#016800'}
                onMouseLeave={e => e.currentTarget.style.background = '#018600'}
              >
                채점 종료
              </button>
            ) : (
              <div className="flex items-center gap-1.5 pl-2" style={{ borderLeft: '1px solid #EEEEEE' }}>
                <span className="text-xs" style={{ color: '#616161' }}>퀴즈를 종료할까요?</span>
                <button
                  onClick={() => {
                    const idx = mockQuizzes.findIndex(q => q.id === QUIZ_INFO.id)
                    if (idx !== -1) mockQuizzes[idx] = { ...mockQuizzes[idx], status: 'closed' }
                    navigate('/')
                  }}
                  className="text-xs font-semibold text-white px-3 py-1.5 transition-colors"
                  style={{ background: '#018600', borderRadius: 4 }}
                >
                  확인
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="text-xs px-2.5 py-1.5 transition-colors"
                  style={{ color: '#616161', border: '1px solid #E0E0E0', borderRadius: 4 }}
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 탭 전환 */}
        <div className="flex sm:hidden mb-4 p-0.5 gap-0.5 rounded" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0' }}>
          {[
            { view: 'questions', label: gradingMode === 'question' ? '문항 목록' : '학생 목록' },
            { view: 'detail',    label: gradingMode === 'question' ? (selectedQ ? `Q${selectedQ.order} 상세` : '문항 선택') : (selectedStudent ? selectedStudent.name : '학생 선택') },
          ].map(({ view, label }) => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className="flex-1 text-xs py-2 rounded transition-all"
              style={mobileView === view
                ? { background: '#fff', color: '#222222', fontWeight: 600, border: '1px solid #E0E0E0' }
                : { color: '#9E9E9E', border: '1px solid transparent' }
              }
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
                  <span className="text-xs font-medium" style={{ color: '#616161' }}>
                    주관식 {manualQuestions.length}문항
                  </span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none text-xs bg-white pl-2.5 pr-6 py-1.5 rounded cursor-pointer focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', color: '#424242' }}
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
                        className="flex items-center justify-between w-full text-xs py-2 px-2 transition-colors"
                        style={{ color: '#9E9E9E' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} style={{ color: '#018600' }} />
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
                    quizId={id}
                    onGradeSaved={onGradeSaved}
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
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="학생 이름 또는 학번"
                      className="w-full bg-white text-xs pl-8 pr-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      style={{ border: '1px solid #E0E0E0', color: '#222222' }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                  {ungradedStudentList.length > 0 && (
                    <div className="mb-2">
                      <div className="px-1 pt-1 pb-1.5 flex items-center gap-2 mb-1">
                        <AlertCircle size={11} style={{ color: '#B43200', flexShrink: 0 }} />
                        <span className="text-xs font-semibold" style={{ color: '#B43200' }}>미채점</span>
                        <span className="text-xs" style={{ color: '#BDBDBD' }}>{ungradedStudentList.length}명</span>
                        <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
                      </div>
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
                      <div className="px-1 pt-1 pb-1.5 flex items-center gap-2 mb-1">
                        <CheckCircle2 size={11} style={{ color: '#018600', flexShrink: 0 }} />
                        <span className="text-xs font-semibold" style={{ color: '#018600' }}>채점 완료</span>
                        <span className="text-xs" style={{ color: '#BDBDBD' }}>{gradedStudentList.length}명</span>
                        <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
                      </div>
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
                  <StudentDetailPanel student={selectedStudent} questions={quizQuestions} quizId={id} />
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
      className="w-full text-left p-3 rounded transition-all"
      style={selected
        ? { border: '1px solid #6366f1', background: '#EEF2FF' }
        : dimmed
        ? { border: '1px solid #EEEEEE', background: '#FAFAFA' }
        : { border: '1px solid #E0E0E0', background: '#fff' }
      }
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#BDBDBD' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = dimmed ? '#EEEEEE' : '#E0E0E0' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold" style={{ color: selected ? '#6366f1' : '#9E9E9E' }}>
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {isComplete && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ color: '#018600', background: '#E5FCE3' }}>
                <CheckCircle2 size={10} />완료
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: dimmed ? '#BDBDBD' : '#616161' }}>
            {question.text}
          </p>
        </div>
        <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>{question.points}점</span>
      </div>

      {!isComplete && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#9E9E9E' }}>
            <span>{question.gradedCount}/{question.totalCount}명</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
            <div className="h-full bg-indigo-500 rounded" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </button>
  )
}

// ─── 문항 중심: 우측 상세 패널 ─────────────────────────────────────────────
function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel, quizId, onGradeSaved }) {
  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 */}
      <div className="bg-white p-4 mb-3" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold" style={{ color: '#9E9E9E' }}>Q{question.order}</span>
              <TypeBadge type={question.type} />
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{question.points}점</span>
              <GradeStatus question={question} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#222222' }}>{question.text}</p>
            {question.correctAnswer && (
              <div className="mt-2 text-xs px-3 py-1.5 rounded" style={{ color: '#018600', background: '#E5FCE3' }}>
                모범 답안: {question.correctAnswer}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex p-0.5 rounded" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0' }}>
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
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid #c7d2fe' }}
          >
            <Download size={12} />
            엑셀 일괄 채점
          </button>
        )}
      </div>

      {activeTab === 'responses' ? (
        <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} quizId={quizId} onGradeSaved={onGradeSaved} />
      ) : (
        <StatsTab question={question} students={mockStudents} />
      )}
    </div>
  )
}

// ─── 문항 중심: 응시 현황 탭 ───────────────────────────────────────────────
function ResponsesTab({ question, students, search, onSearch, quizId, onGradeSaved }) {
  const gradedStudents = students.filter(s => s.score !== null)
  const ungradedStudents = students.filter(s => s.score === null)

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EEEEEE', background: '#FAFAFA' }}>
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="학생 이름 또는 학번 검색"
            className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded focus:outline-none"
            style={{ border: '1px solid #E0E0E0', color: '#222222' }}
          />
        </div>
        <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>{students.length}명</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {ungradedStudents.length > 0 && (
          <div>
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
              <AlertCircle size={11} style={{ color: '#B43200', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: '#B43200' }}>미채점</span>
              <span className="text-xs" style={{ color: '#BDBDBD' }}>{ungradedStudents.length}명</span>
              <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
            </div>
            {ungradedStudents.map(s => (
              <StudentRow key={s.id} student={s} question={question} quizId={quizId} onGradeSaved={onGradeSaved} />
            ))}
          </div>
        )}
        {gradedStudents.length > 0 && (
          <div>
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
              <CheckCircle2 size={11} style={{ color: '#018600', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: '#018600' }}>채점 완료</span>
              <span className="text-xs" style={{ color: '#BDBDBD' }}>{gradedStudents.length}명</span>
              <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
            </div>
            {gradedStudents.map(s => (
              <StudentRow key={s.id} student={s} question={question} quizId={quizId} onGradeSaved={onGradeSaved} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 문항 중심: 학생 행 (문항 유형별 채점 UI) ─────────────────────────────
function StudentRow({ student, question, quizId, onGradeSaved }) {
  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [expanded, setExpanded] = useState(false)
  const [score, setScore] = useState(() => {
    const saved = getLocalGrades()
    if (storageKey in saved) return saved[storageKey]
    return student.manualScores?.[question.id] ?? ''
  })
  const [saved, setSaved] = useState(() => {
    const grades = getLocalGrades()
    return (storageKey in grades) || student.manualScores?.[question.id] != null
  })
  const isGraded = saved

  const answer = student.response || getStudentAnswer(parseInt(student.id.replace('s', '')), question.id)
  const autoCorrect = question.autoGrade ? isAnswerCorrect(answer, question.id) : null

  const handleSave = () => {
    const grades = getLocalGrades()
    grades[storageKey] = Number(score)
    setLocalGrades(grades)
    if (!student.manualScores) student.manualScores = {}
    student.manualScores[question.id] = Number(score)
    const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
    const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
    student.score = autoTotal + manualTotal
    setSaved(true)
    onGradeSaved?.()
  }

  return (
    <div style={{ borderBottom: '1px solid #EEEEEE' }}>
      {/* 인라인 행 */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* 아바타 */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#EEEEEE', color: '#616161' }}>
          {student.name[0]}
        </div>

        {/* 이름/학번 */}
        <div className="w-28 shrink-0">
          <p className="text-sm font-medium truncate" style={{ color: '#222222' }}>{student.name}</p>
          <p className="text-xs truncate" style={{ color: '#9E9E9E' }}>{student.studentId}</p>
        </div>

        {/* 답안 미리보기 (클릭하면 전체 펼침) */}
        <button
          className="flex-1 min-w-0 text-left flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          <p className="text-xs truncate flex-1" style={{ color: expanded ? '#424242' : '#9E9E9E' }}>
            {answer || '(답안 없음)'}
          </p>
          {expanded
            ? <ChevronUp size={12} style={{ color: '#BDBDBD', flexShrink: 0 }} />
            : <ChevronDown size={12} style={{ color: '#BDBDBD', flexShrink: 0 }} />
          }
        </button>

        {/* 채점 영역 */}
        {!question.autoGrade ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {saved && (
              <CheckCircle2 size={13} style={{ color: '#018600' }} />
            )}
            <input
              type="number"
              value={score}
              onChange={e => { setScore(e.target.value); setSaved(false) }}
              placeholder="—"
              min={0}
              max={question.points}
              className="w-14 bg-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 text-center"
              style={{ border: '1px solid #E0E0E0', color: '#222222' }}
              onKeyDown={e => { if (e.key === 'Enter' && !(score === '' || Number(score) > question.points || Number(score) < 0)) handleSave() }}
            />
            <span className="text-xs" style={{ color: '#BDBDBD' }}>/ {question.points}</span>
            <button
              onClick={handleSave}
              disabled={score === '' || Number(score) > question.points || Number(score) < 0}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded transition-colors font-medium"
            >
              저장
            </button>
          </div>
        ) : (
          <div className="shrink-0">
            {autoCorrect !== null && (
              <span className="text-xs px-2 py-0.5 rounded"
                style={autoCorrect
                  ? { color: '#018600', background: '#E5FCE3' }
                  : { color: '#B43200', background: '#FFF5F5' }
                }>
                {autoCorrect ? '정답' : '오답'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 확장: 전체 답안 */}
      {expanded && (
        <div className="px-3 pb-3 ml-10">
          <div className="p-3 rounded text-xs" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0' }}>
            <p className="leading-relaxed" style={{ color: '#424242' }}>{answer}</p>
            {question.autoGrade && autoCorrect !== null && !autoCorrect && question.correctAnswer && (
              <p className="mt-2" style={{ color: '#9E9E9E' }}>정답: {question.correctAnswer}</p>
            )}
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
      className="w-full text-left p-2.5 rounded transition-all mb-1"
      style={selected
        ? { border: '1px solid #6366f1', background: '#EEF2FF' }
        : { border: '1px solid #E0E0E0', background: '#fff' }
      }
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#BDBDBD' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#E0E0E0' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#EEEEEE', color: '#616161' }}>
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: selected ? '#6366f1' : '#222222' }}>
            {student.name}
          </p>
          <p className="text-xs" style={{ color: '#9E9E9E' }}>{student.studentId} · {student.department}</p>
        </div>
        {student.score !== null ? (
          <span className="text-sm font-bold shrink-0" style={{ color: '#018600' }}>{student.score}점</span>
        ) : (
          <span className="text-xs shrink-0" style={{ color: '#B43200' }}>미채점</span>
        )}
      </div>
    </button>
  )
}

// ─── 학생 중심: 학생별 전체 문항 패널 ─────────────────────────────────────
function StudentDetailPanel({ student, questions, quizId }) {
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
      <div className="bg-white p-4 mb-3" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#EEF2FF', color: '#6366f1' }}>
              {student.name[0]}
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: '#222222' }}>{student.name}</p>
              <p className="text-xs" style={{ color: '#9E9E9E' }}>{student.studentId} · {student.department}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#9E9E9E' }}>제출</p>
            <p className="text-xs" style={{ color: '#616161' }}>{student.endTime || '-'}</p>
          </div>
        </div>
      </div>

      {/* 문항별 답안 카드 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2.5 pr-1">
        {questions.map(q => (
          <div key={q.id} ref={el => { cardRefs.current[q.id] = el }}>
            <AnswerCard question={q} student={student} studentIdx={studentIdx} quizId={quizId} onSaved={() => handleSaved(q.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 학생 중심: 문항별 답안 카드 ──────────────────────────────────────────
function AnswerCard({ question, student, studentIdx, quizId, onSaved }) {
  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [score, setScore] = useState(() => {
    if (question.autoGrade) {
      return student.autoScores?.[question.id] ?? question.points
    }
    const grades = getLocalGrades()
    if (storageKey in grades) return grades[storageKey]
    return student.manualScores?.[question.id] ?? ''
  })
  const [saved, setSaved] = useState(() => {
    if (question.autoGrade) return true
    const grades = getLocalGrades()
    return (storageKey in grades) || student.manualScores?.[question.id] != null
  })

  const answer = getStudentAnswer(studentIdx, question.id)
  const autoCorrect = question.autoGrade ? isAnswerCorrect(answer, question.id) : null
  const [answerExpanded, setAnswerExpanded] = useState(false)

  const correctAnswer = question.correctAnswer ?? ''
  const isLongAnswer = correctAnswer.length > 30

  return (
    <div className="bg-white p-4" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      {/* 문항 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-bold" style={{ color: '#9E9E9E' }}>Q{question.order}</span>
            <TypeBadge type={question.type} small />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#424242' }}>{question.text}</p>
        </div>
        {/* 점수 / 배점 */}
        <div className="shrink-0 text-right">
          {question.autoGrade ? (
            <span className="text-sm font-bold" style={{ color: autoCorrect ? '#018600' : '#424242' }}>
              {autoCorrect ? question.points : 0}
              <span className="text-xs font-normal" style={{ color: '#BDBDBD' }}> / {question.points}</span>
            </span>
          ) : saved && score !== '' ? (
            <span className="text-sm font-bold" style={{ color: '#222222' }}>
              {score}
              <span className="text-xs font-normal" style={{ color: '#BDBDBD' }}> / {question.points}</span>
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#B43200' }}>미채점</span>
          )}
        </div>
      </div>

      {/* 답안 박스 — 자동채점 배경 틴트로 정오답 표시 */}
      <div
        className="px-3 py-2 text-xs leading-relaxed rounded flex items-start justify-between gap-2"
        style={{
          color: '#424242',
          border: '1px solid #E0E0E0',
          background: question.autoGrade && autoCorrect !== null
            ? autoCorrect ? '#F0FFF4' : '#FFF6F2'
            : '#FAFAFA',
        }}
      >
        <span className="flex-1">{answer}</span>
        {question.autoGrade && autoCorrect !== null && (
          autoCorrect
            ? <CheckCircle2 size={13} className="shrink-0 mt-px" style={{ color: '#018600' }} />
            : <X size={13} className="shrink-0 mt-px" style={{ color: '#B43200' }} />
        )}
      </div>

      {/* 자동채점 하단 고정 영역 — 정오답 모두 동일 높이 유지 */}
      {question.autoGrade && autoCorrect !== null && (
        <div className="mt-1.5 pl-1 flex items-start gap-1 min-h-[16px]">
          {autoCorrect ? (
            <span className="text-xs" style={{ color: '#9E9E9E' }}>정답</span>
          ) : correctAnswer ? (
            <>
              <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>정답:</span>
              {isLongAnswer ? (
                <span className="text-xs" style={{ color: '#424242' }}>
                  {answerExpanded ? correctAnswer : `${correctAnswer.slice(0, 30)}…`}
                  <button
                    onClick={() => setAnswerExpanded(v => !v)}
                    className="ml-1 text-xs"
                    style={{ color: '#6366f1' }}
                  >
                    {answerExpanded ? '접기' : '더보기'}
                  </button>
                </span>
              ) : (
                <span className="text-xs" style={{ color: '#424242' }}>{correctAnswer}</span>
              )}
            </>
          ) : (
            <span className="text-xs" style={{ color: '#9E9E9E' }}>오답</span>
          )}
        </div>
      )}

      {/* 수동채점 입력 */}
      {!question.autoGrade && (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="number"
            value={score}
            onChange={e => { setScore(e.target.value); setSaved(false) }}
            min={0}
            max={question.points}
            placeholder="0"
            className="w-16 bg-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 text-center"
            style={{ border: '1px solid #E0E0E0', color: '#222222' }}
          />
          <span className="text-xs" style={{ color: '#9E9E9E' }}>/ {question.points}</span>
          {saved && (
            <span className="text-xs flex items-center gap-1 ml-1" style={{ color: '#018600' }}>
              <CheckCircle2 size={11} />저장됨
            </span>
          )}
          {score !== '' && (
          <button
            onClick={() => {
              const grades = getLocalGrades()
              grades[storageKey] = Number(score)
              setLocalGrades(grades)
              if (!student.manualScores) student.manualScores = {}
              student.manualScores[question.id] = Number(score)
              const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
              const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
              student.score = autoTotal + manualTotal
              setSaved(true)
              onSaved?.()
            }}
            disabled={Number(score) > question.points || Number(score) < 0}
            className="ml-auto text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors font-medium"
          >
            저장
          </button>
          )}
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
    <div className="flex-1 bg-white p-4 overflow-y-auto scrollbar-thin" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="평균 점수" value={avg} unit="점" accent />
        <StatCard label="최고 점수" value={max} unit="점" />
        <StatCard label="최저 점수" value={min} unit="점" />
        <StatCard label="채점 완료" value={gradedStudents.length} unit={`/ ${students.length}명`} />
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-3" style={{ color: '#616161' }}>점수 분포</h3>
        {gradedStudents.length === 0 ? (
          <div className="text-center py-8 text-xs" style={{ color: '#BDBDBD' }}>채점 완료된 학생이 없습니다</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9E9E9E' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9E9E9E' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: '#424242' }}
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
    <div className="bg-white p-3 text-center" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      <div className="flex items-baseline justify-center gap-0.5 flex-wrap">
        <span className="text-xl font-bold" style={{ color: accent ? '#6366f1' : '#222222' }}>{value}</span>
        {unit && <span className="text-xs" style={{ color: '#9E9E9E' }}>{unit}</span>}
      </div>
      <div className="text-xs mt-1" style={{ color: '#616161' }}>{label}</div>
    </div>
  )
}

function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <span
      className={`inline-block font-medium px-1.5 py-0.5 rounded ${small ? 'text-xs' : 'text-xs'}`}
      style={{ background: '#F5F5F5', color: '#616161' }}
    >
      {cfg.label}
    </span>
  )
}

function GradeStatus({ question }) {
  const complete = question.gradedCount >= question.totalCount
  if (complete) {
    return (
      <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ color: '#018600', background: '#E5FCE3' }}>
        <CheckCircle2 size={10} />채점 완료
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ color: '#B43200', background: '#FFF6F2' }}>
      <AlertCircle size={10} />미채점 {question.totalCount - question.gradedCount}명
    </span>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
      style={active
        ? { background: '#fff', color: '#222222', fontWeight: 600, border: '1px solid #E0E0E0' }
        : { color: '#9E9E9E', border: '1px solid transparent' }
      }
    >
      {children}
    </button>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      <div className="text-center px-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F5F5F5' }}>
          <FileText size={20} style={{ color: '#BDBDBD' }} />
        </div>
        <p className="text-sm" style={{ color: '#BDBDBD' }}>{message}</p>
      </div>
    </div>
  )
}

// ─── 모달 ──────────────────────────────────────────────────────────────────
function ExcelModal({ question, onClose }) {
  const [step, setStep] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = () => {
    const submittedStudents = mockStudents.filter(s => s.submitted)
    downloadGradingSheetXlsx(question, submittedStudents)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStep('uploading')
    setErrorMsg('')

    const result = await parseExcelOrCsv(file)
    if (result.error) {
      setErrorMsg(result.error)
      setStep('error')
      return
    }

    // 점수 유효성 검사
    const maxPoints = question?.points ?? 0
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i]
      const scoreRaw = row.answer ?? ''
      if (scoreRaw === '') continue
      const score = Number(scoreRaw)
      if (isNaN(score) || score < 0) {
        setErrorMsg(`${i + 2}행: 점수는 0 이상의 숫자여야 합니다.`)
        setStep('error')
        return
      }
      if (score > maxPoints) {
        setErrorMsg(`${i + 2}행: 점수(${score})가 배점(${maxPoints}점)을 초과합니다. 전체 업로드가 취소되었습니다.`)
        setStep('error')
        return
      }
    }

    setStep('success')
  }

  return (
    <Modal onClose={onClose} title="엑셀 일괄 채점">
      <div className="space-y-4">
        <div className="p-3 text-sm rounded" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', color: '#616161' }}>
          <p className="font-medium mb-1.5" style={{ color: '#424242' }}>Q{question?.order}. 일괄 채점 방법</p>
          <ol className="space-y-1 text-xs">
            <li>① 양식 다운로드 후 점수 열에 값 입력 (0 ~ {question?.points}점)</li>
            <li>② 파일 저장 후 업로드</li>
            <li className="font-medium" style={{ color: '#B43200' }}>③ 오류가 1개라도 있으면 전체 업로드 취소</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-3 text-sm transition-colors rounded"
            style={step === 'downloading'
              ? { border: '1px solid #c7d2fe', color: '#6366f1', background: '#EEF2FF' }
              : { border: '1px solid #E0E0E0', color: '#424242', background: '#fff' }
            }
          >
            <Download size={15} />
            {step === 'downloading' ? '다운로드 중...' : '양식 다운로드'}
          </button>

          <label
            className="flex items-center justify-center gap-2 py-3 text-sm cursor-pointer transition-colors rounded"
            style={step === 'uploading'
              ? { border: '1px solid #c7d2fe', color: '#6366f1', background: '#EEF2FF' }
              : { border: '1px solid #E0E0E0', color: '#424242', background: '#fff' }
            }
          >
            <Upload size={15} />
            {step === 'uploading' ? '업로드 중...' : '파일 업로드'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {step === 'error' && (
          <div className="p-3 text-xs rounded" style={{ background: '#FFF5F5', border: '1px solid #FFBFBF', color: '#B43200' }}>
            <div className="font-medium mb-1 flex items-center gap-1.5"><AlertCircle size={13} />업로드 실패</div>
            <p>{errorMsg}</p>
            <button className="mt-2 text-red-600 hover:text-red-800 underline" onClick={() => setStep('idle')}>
              다시 시도
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="p-3 text-xs rounded" style={{ background: '#E5FCE3', border: '1px solid #a7f3d0', color: '#018600' }}>
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
        <div className="p-3 text-sm rounded" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', color: '#616161' }}>
          <p>응시한 <span className="font-semibold" style={{ color: '#222222' }}>82명</span> 전원의 문제지와 제출 답안이 PDF로 생성됩니다.</p>
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>감사·증빙 자료로 보관할 수 있습니다.</p>
        </div>

        {progress === 0 && (
          <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-3 rounded transition-colors">
            <FileDown size={15} />PDF 생성 시작
          </button>
        )}

        {progress > 0 && !done && (
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: '#616161' }}>
              <span>PDF 생성 중...</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
              <div className="h-full bg-indigo-500 rounded transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <div className="p-3 text-xs rounded flex items-center gap-2" style={{ background: '#E5FCE3', border: '1px solid #a7f3d0', color: '#018600' }}>
              <CheckCircle2 size={13} />PDF 생성 완료 (82개 답안지)
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium py-3 rounded transition-colors" style={{ background: '#018600' }}
              onMouseEnter={e => e.currentTarget.style.background = '#015F00'}
              onMouseLeave={e => e.currentTarget.style.background = '#018600'}
            >
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
        <div className="p-3 text-sm rounded" style={{ background: '#FFF6F2', border: '1px solid #ffcdbf', color: '#B43200' }}>
          <p className="font-medium mb-1">재채점 시 주의사항</p>
          <p className="text-xs">정답 기준을 수정하면 해당 문항에 응시한 <span className="font-bold">82명 전원</span>의 점수가 즉시 재계산됩니다.</p>
          <p className="text-xs mt-1.5" style={{ color: '#B43200' }}>자동채점 문항만 재산출되며, 수동채점(주관식·서술형) 점수는 변경되지 않습니다.</p>
          <p className="text-xs mt-1">점수 변경 시 해당 학생에게 LMS 메시지 알림이 발송됩니다.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>변경할 정답 기준</label>
          <input
            type="text"
            defaultValue="외래키(Foreign Key)"
            className="w-full bg-white text-sm px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100"
            style={{ border: '1px solid #E0E0E0', color: '#222222' }}
          />
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>쉼표로 구분하면 복수 정답 처리됩니다</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-indigo-500" style={{ borderColor: '#E0E0E0' }} />
          <span className="text-sm" style={{ color: '#424242' }}>위 내용을 확인했으며, 전체 재채점을 진행합니다.</span>
        </label>

        <button
          disabled={!confirmed}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded transition-colors"
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
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-md bg-white p-5"
        style={{ border: '1px solid #E0E0E0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: '#222222' }}>{title}</h3>
          <button onClick={onClose} className="transition-colors" style={{ color: '#9E9E9E' }}
            onMouseEnter={e => e.currentTarget.style.color = '#424242'}
            onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
