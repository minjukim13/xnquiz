import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DropdownSelect } from '../components/DropdownSelect'
import {
  ArrowUpDown, CheckCircle2, AlertCircle, Download, Upload, FileDown,
  ChevronDown, ChevronUp, X, BarChart3, Users, RefreshCw,
  FileText, Search, FileEdit, Circle
} from 'lucide-react'
import Layout from '../components/Layout'
import { getQuizStudents, QUIZ_TYPES, mockQuizzes, getStudentAnswer, isAnswerCorrect, getQuizQuestions } from '../data/mockData'
import { downloadAnswerSheetsXlsx, downloadGradingSheetXlsx, parseExcelOrCsv, parseGradingSheet } from '../utils/excelUtils'
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
  const [collapsedGraded, setCollapsedGraded] = useState(false)
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

  // gradedCount 실시간 반영을 위한 버전 카운터
  const [gradeVersion, setGradeVersion] = useState(0)
  const onGradeSaved = useCallback(() => setGradeVersion(v => v + 1), [])
  const [excelRows, setExcelRows] = useState(null)

  // 토스트
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const quizQuestions = getQuizQuestions(id)
  const quizStudents = getQuizStudents(id)

  // localStorage 채점 기록을 반영한 실시간 gradedCount 계산
  const questionsWithLiveCounts = useMemo(() => {
    const grades = getLocalGrades()
    const submittedStudents = quizStudents.filter(s => s.submitted)
    return quizQuestions.map(q => {
      if (q.autoGrade) return q
      const gradedCount = submittedStudents.filter(s => {
        const key = `${id}_${s.id}_${q.id}`
        return (key in grades) || s.manualScores?.[q.id] != null
      }).length
      return { ...q, gradedCount }
    })
  }, [quizQuestions, id, gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedQuestions = useMemo(() => {
    if (!QUIZ_INFO) return []
    if (sortBy === 'ungraded_first') {
      return [...questionsWithLiveCounts].sort((a, b) => {
        const aComplete = a.gradedCount >= a.totalCount
        const bComplete = b.gradedCount >= b.totalCount
        if (aComplete === bComplete) return a.order - b.order
        return aComplete ? 1 : -1
      })
    }
    return [...questionsWithLiveCounts].sort((a, b) => a.order - b.order)
  }, [sortBy, QUIZ_INFO, questionsWithLiveCounts])

  const gradedQuestions = sortedQuestions.filter(q => q.gradedCount >= q.totalCount)
  const ungradedQuestions = sortedQuestions.filter(q => q.gradedCount < q.totalCount)

  // 최초 로드 시 첫 번째 문항 자동 선택
  useEffect(() => {
    if (sortedQuestions.length > 0 && !selectedQ) {
      setSelectedQ(sortedQuestions[0])
    }
  }, [sortedQuestions]) // eslint-disable-line react-hooks/exhaustive-deps

  const questionStudents = useMemo(() => {
    if (!selectedQ) return []
    return quizStudents.filter(s => s.submitted).filter(s =>
      searchStudent === '' ||
      s.name.includes(searchStudent) ||
      s.studentId.includes(searchStudent)
    )
  }, [selectedQ, searchStudent, quizStudents])

  // 학생 중심 - 전체 학생 목록
  const allStudents = useMemo(() => {
    return quizStudents.filter(s => s.submitted).filter(s =>
      studentSearch === '' ||
      s.name.includes(studentSearch) ||
      s.studentId.includes(studentSearch)
    )
  }, [studentSearch, quizStudents])

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
        {(() => {
          const STATUS_MAP = {
            open:      { label: '진행중', color: '#16A34A', bg: '#F0FDF4' },
            grading:   { label: '진행중', color: '#16A34A', bg: '#F0FDF4' },
            closed:    { label: '마감',   color: '#6B7280', bg: '#F3F4F6' },
            scheduled: { label: '예정',   color: '#D97706', bg: '#FFFBEB' },
            draft:     { label: '발행 전',color: '#6366F1', bg: '#EEF2FF' },
          }
          const statusStyle = STATUS_MAP[QUIZ_INFO.status] ?? { label: QUIZ_INFO.status, color: '#6B7280', bg: '#F3F4F6' }
          return (
            <div className="card mb-5 overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                        {QUIZ_INFO.week}주차 {QUIZ_INFO.session}차시
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-1.5" style={{ color: '#111827' }}>{QUIZ_INFO.title}</h2>
                    <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>{QUIZ_INFO.startDate} ~ {QUIZ_INFO.dueDate}</p>
                    {QUIZ_INFO.scoreReleasePolicy !== undefined && (() => {
                      const POLICY_LABEL = {
                        wrong_only:  { label: '오답여부만 공개', color: '#0369A1', bg: '#E0F2FE' },
                        with_answer: { label: '정답까지 공개',   color: '#065F46', bg: '#D1FAE5' },
                        after_due:   { label: '마감 후 자동공개',color: '#6366F1', bg: '#EEF2FF' },
                        period:      { label: '기간 설정',       color: '#92400E', bg: '#FEF3C7' },
                      }
                      const p = POLICY_LABEL[QUIZ_INFO.scoreReleasePolicy]
                      if (!p) return <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>성적 비공개</span>
                      return <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: p.bg, color: p.color }}>성적공개: {p.label}</span>
                    })()}
                  </div>

                  <div className="flex items-stretch shrink-0 rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 90 }}>
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>제출률</p>
                      <p className="text-2xl font-bold leading-none" style={{ color: '#4F46E5' }}>{submitRate}%</p>
                    </div>
                    <div style={{ width: 1, background: '#E5E7EB' }} />
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 110 }}>
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>제출 인원</p>
                      <p className="text-2xl font-bold leading-none" style={{ color: '#111827' }}>
                        {QUIZ_INFO.submitted}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>/ {QUIZ_INFO.totalStudents}명</span>
                      </p>
                    </div>
                    <div style={{ width: 1, background: '#E5E7EB' }} />
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 110 }}>
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>채점 완료</p>
                      <p className="text-2xl font-bold leading-none" style={{ color: '#111827' }}>
                        {QUIZ_INFO.graded}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>/ {QUIZ_INFO.submitted}명</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 채점 진행률 — 콘텐츠 영역 내 통합 */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div className="flex justify-between text-xs mb-2" style={{ color: '#9CA3AF' }}>
                    <span>채점 진행률</span>
                    <span className="font-semibold" style={{ color: '#4F46E5' }}>{gradeProgress}%</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${gradeProgress}%`, background: '#6366F1' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

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
              onClick={() => downloadAnswerSheetsXlsx(QUIZ_INFO, quizStudents.filter(s => s.submitted), quizQuestions, { getStudentAnswer })}
              className="btn-secondary text-xs py-2 px-3"
            >
              <FileDown size={12} />
              <span>답안지 다운로드</span>
            </button>
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
              <aside className={`${mobileView === 'questions' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0 rounded-xl overflow-hidden`} style={{ border: '1px solid #E5E7EB' }}>
                <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span className="text-xs font-medium" style={{ color: '#616161' }}>
                    총 문항 {questionsWithLiveCounts.length}개
                  </span>
                  <DropdownSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={SORT_OPTIONS}
                    size="sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2" style={{ background: '#fff' }}>
                  {ungradedQuestions.map(q => (
                    <QuestionItem key={q.id} question={q} selected={selectedQ?.id === q.id} onClick={() => handleSelectQ(q)} />
                  ))}

                  {gradedQuestions.length > 0 && (
                    <div>
                      <button
                        onClick={() => setCollapsedGraded(!collapsedGraded)}
                        className="flex items-center justify-between w-full font-medium pt-2 pb-1.5 px-1 transition-colors"
                        style={{ fontSize: 11, color: '#4B5563' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#111827'}
                        onMouseLeave={e => e.currentTarget.style.color = '#4B5563'}
                      >
                        <span>채점 완료 ({gradedQuestions.length})</span>
                        {collapsedGraded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </button>
                      {!collapsedGraded && (
                        <div className="space-y-2 mt-1">
                          {gradedQuestions.map(q => (
                            <QuestionItem key={q.id} question={q} selected={selectedQ?.id === q.id} onClick={() => handleSelectQ(q)} dimmed />
                          ))}
                        </div>
                      )}
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
                    gradeVersion={gradeVersion}
                    excelRows={excelRows}
                    onExcelRowsConsumed={() => setExcelRows(null)}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {/* 학생 중심: 좌측 학생 목록 */}
              <aside className={`${mobileView === 'questions' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0 rounded-xl overflow-hidden`} style={{ border: '1px solid #E5E7EB' }}>
                <div className="flex items-center px-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div className="relative w-full">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9E9E9E' }} />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="학생 이름 또는 학번"
                      className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      style={{ border: '1px solid #E0E0E0', color: '#222222' }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2" style={{ background: '#fff' }}>
                  {ungradedStudentList.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>미채점</span>
                        <span className="text-xs" style={{ color: '#BDBDBD' }}>{ungradedStudentList.length}명</span>
                        <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
                      </div>
                      <div className="space-y-2">
                        {ungradedStudentList.map(s => (
                          <StudentListItem
                            key={s.id} student={s}
                            selected={selectedStudent?.id === s.id}
                            onClick={() => handleSelectStudent(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {gradedStudentList.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>채점 완료</span>
                        <span className="text-xs" style={{ color: '#BDBDBD' }}>{gradedStudentList.length}명</span>
                        <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
                      </div>
                      <div className="space-y-2">
                        {gradedStudentList.map(s => (
                          <StudentListItem
                            key={s.id} student={s}
                            selected={selectedStudent?.id === s.id}
                            onClick={() => handleSelectStudent(s)}
                          />
                        ))}
                      </div>
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

      {showExcelModal && (
        <ExcelModal
          question={selectedQ}
          students={quizStudents}
          quizId={id}
          onClose={() => setShowExcelModal(false)}
          onUploaded={onGradeSaved}
          onApplied={(rows) => { setShowExcelModal(false); setExcelRows(rows) }}
        />
      )}
      {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}
      {showRegradeModal && <RegradeModal onClose={() => setShowRegradeModal(false)} />}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 text-sm text-white"
          style={{ background: '#1E1E1E', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          <CheckCircle2 size={15} className="shrink-0" style={{ color: '#A5B4FC' }} />
          <span className="font-medium">{toast}</span>
        </div>
      )}
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
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#018600', background: '#E5FCE3' }}>완료</span>
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
function QuestionDetailPanel({ question, students, search, onSearch, activeTab, onTabChange, onExcel, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed }) {
  return (
    <div className="flex flex-col h-full">
      {/* 문항 정보 */}
      <div className="bg-white p-4 mb-3" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm leading-relaxed" style={{ color: '#222222' }}>{question.text}</p>
            {question.choices && question.choices.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {question.choices.map((choice, i) => {
                  const isCorrect = choice === question.correctAnswer
                  return (
                    <div key={i} className="flex items-baseline gap-2"
                      style={{ fontSize: 13, color: isCorrect ? '#3730a3' : '#6B7280', fontWeight: isCorrect ? 600 : 400 }}>
                      <span style={{ minWidth: 16, flexShrink: 0, color: isCorrect ? '#6366f1' : '#9CA3AF' }}>{i + 1}.</span>
                      <span>{choice}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {question.correctAnswer && (
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#6366f1' }}>모범 답안</span>
                {question.type === 'true_false' ? (
                  <div className="flex items-center gap-1.5">
                    {['참', '거짓'].map(opt => {
                      const isCorrect = opt === question.correctAnswer
                      return (
                        <span key={opt} className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={isCorrect ? { background: '#6366f1', color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
                          {opt}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: '#1E293B' }}>{question.correctAnswer}</span>
                )}
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
        <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} quizId={quizId} onGradeSaved={onGradeSaved} gradeVersion={gradeVersion} excelRows={excelRows} onExcelRowsConsumed={onExcelRowsConsumed} />
      ) : (
        <StatsTab question={question} students={quizStudents} />
      )}
    </div>
  )
}

// ─── 문항 중심: 응시 현황 탭 ───────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10명씩' },
  { value: 20, label: '20명씩' },
  { value: 30, label: '30명씩' },
  { value: 'all', label: '전체' },
]

function ResponsesTab({ question, students, search, onSearch, quizId, onGradeSaved, gradeVersion, excelRows, onExcelRowsConsumed }) {
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [pendingScores, setPendingScores] = useState({}) // { [student.id]: scoreValue }
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saved'
  const isFirstRender = useRef(true)

  // 검색 or pageSize 변경 시 첫 페이지로
  useEffect(() => { setPage(1) }, [search, pageSize])

  // 문항 전환 시 초기화
  useEffect(() => {
    setPendingScores({})
    setSaveStatus('idle')
    isFirstRender.current = true
  }, [question?.id])

  // 엑셀 업로드 rows → pendingScores에 병합 (저장은 일괄 저장 버튼으로)
  useEffect(() => {
    if (!excelRows?.length) return
    const merged = {}
    excelRows.forEach(row => {
      const student = students.find(s => s.studentId === row.studentId)
      if (student) merged[student.id] = row.score
    })
    setPendingScores(prev => ({ ...prev, ...merged }))
    onExcelRowsConsumed?.()
  }, [excelRows]) // eslint-disable-line react-hooks/exhaustive-deps

  // 일괄 저장 후 "저장 완료" 표시
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const ungradedAll = students.filter(s => s.score === null)
  const gradedAll   = students.filter(s => s.score !== null)
  const flat = [...ungradedAll, ...gradedAll]

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(flat.length / pageSize)
  const visible = pageSize === 'all' ? flat : flat.slice((page - 1) * pageSize, page * pageSize)

  const visibleUngraded = visible.filter(s => s.score === null)
  const visibleGraded   = visible.filter(s => s.score !== null)

  const handleScoreChange = useCallback((studentId, score) => {
    setPendingScores(prev => ({ ...prev, [studentId]: score }))
    setSaveStatus('idle')
  }, [])

  const pendingCount = Object.values(pendingScores).filter(v => v !== '' && !isNaN(Number(v)) && Number(v) >= 0).length

  const handleBulkSave = () => {
    const grades = getLocalGrades()
    for (const [studentId, score] of Object.entries(pendingScores)) {
      if (score === '' || isNaN(Number(score)) || Number(score) < 0) continue
      const student = students.find(s => s.id === studentId)
      if (!student) continue
      const storageKey = `${quizId}_${studentId}_${question.id}`
      grades[storageKey] = Number(score)
      if (!student.manualScores) student.manualScores = {}
      student.manualScores[question.id] = Number(score)
      const autoTotal = Object.values(student.autoScores || {}).reduce((a, b) => a + b, 0)
      const manualTotal = Object.values(student.manualScores).reduce((a, b) => a + (b || 0), 0)
      student.score = autoTotal + manualTotal
    }
    setLocalGrades(grades)
    setPendingScores({})
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
    onGradeSaved?.()
  }

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid #EEEEEE', background: '#FAFAFA' }}>
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
        <DropdownSelect
          size="sm"
          value={pageSize}
          onChange={v => setPageSize(v === 'all' ? 'all' : Number(v))}
          options={PAGE_SIZE_OPTIONS}
          style={{ width: 80 }}
        />
        <div className="flex items-center gap-2 shrink-0" style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>
          {saveStatus === 'saved' && (
            <span className="text-xs" style={{ color: '#4B5563' }}>저장 완료</span>
          )}
<button
            onClick={handleBulkSave}
            disabled={pendingCount === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#4F46E5', color: '#fff' }}
            onMouseEnter={e => { if (pendingCount > 0) e.currentTarget.style.background = '#4338CA' }}
            onMouseLeave={e => { if (pendingCount > 0) e.currentTarget.style.background = '#4F46E5' }}
          >
            일괄 저장
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visibleUngraded.length > 0 && (
          <div>
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>미채점</span>
              <span className="text-xs" style={{ color: '#BDBDBD' }}>{ungradedAll.length}명</span>
              <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
            </div>
            {visibleUngraded.map(s => (
              <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} />
            ))}
          </div>
        )}
        {visibleGraded.length > 0 && (
          <div>
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>채점 완료</span>
              <span className="text-xs" style={{ color: '#BDBDBD' }}>{gradedAll.length}명</span>
              <div className="flex-1 h-px" style={{ background: '#EEEEEE' }} />
            </div>
            {visibleGraded.map(s => (
              <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} />
            ))}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center px-3 py-2" style={{ borderTop: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
              style={{ border: '1px solid #E0E0E0', color: '#4B5563' }}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-6 h-6 rounded text-xs flex items-center justify-center transition-colors"
                style={p === page
                  ? { background: '#6366f1', color: '#fff', border: '1px solid #6366f1' }
                  : { border: '1px solid #E0E0E0', color: '#4B5563' }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
              style={{ border: '1px solid #E0E0E0', color: '#4B5563' }}
            >
              다음
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── 문항 중심: 학생 행 (문항 유형별 채점 UI) ─────────────────────────────
function StudentRow({ student, question, quizId, onScoreChange, pendingScore }) {
  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [expanded, setExpanded] = useState(false)
  const studentIdx = parseInt(student.id.replace('s', ''))
  const rawAnswer = question.autoGrade
    ? getStudentAnswer(studentIdx, question.id)
    : (student.response || getStudentAnswer(studentIdx, question.id))

  // 유형별 compact 표시용 답안
  const CHOICE_LABELS = ['①', '②', '③', '④', '⑤']
  const choiceIndex = question.choices ? question.choices.indexOf(rawAnswer) : -1
  let compactAnswer
  if (question.type === 'true_false') {
    const lower = (rawAnswer || '').toLowerCase()
    compactAnswer = (lower === '참' || lower === 'true') ? '참' : (lower === '거짓' || lower === 'false') ? '거짓' : rawAnswer
  } else {
    compactAnswer = rawAnswer
  }

  const autoCorrect = question.autoGrade ? isAnswerCorrect(rawAnswer, question.id) : null

  const initScore = (() => {
    const grades = getLocalGrades()
    if (storageKey in grades) return grades[storageKey]
    if (student.manualScores?.[question.id] != null) return student.manualScores[question.id]
    if (question.autoGrade) return student.autoScores?.[question.id] ?? (autoCorrect ? question.points : 0)
    return ''
  })()
  const displayScore = pendingScore !== undefined ? pendingScore : initScore

  return (
    <div style={{ borderBottom: '1px solid #EEEEEE' }}>
      {/* 인라인 행 */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* 아바타 */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#EEEEEE', color: '#616161' }}>
          {student.name[0]}
        </div>

        {/* 이름/학번 */}
        <div className="w-24 shrink-0">
          <p className="text-xs truncate" style={{ color: '#6B7280' }}>{student.name}</p>
          <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{student.studentId}</p>
        </div>

        {/* 답안 미리보기 */}
        {['essay', 'short_answer', 'multiple_answers'].includes(question.type) ? (
          <button
            className="flex-1 min-w-0 text-left flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            <p className="truncate flex-1" style={{ fontSize: 13, color: expanded ? '#111827' : '#374151' }}>
              {compactAnswer || '(답안 없음)'}
            </p>
            {expanded
              ? <ChevronUp size={12} style={{ color: '#BDBDBD', flexShrink: 0 }} />
              : <ChevronDown size={12} style={{ color: '#BDBDBD', flexShrink: 0 }} />
            }
          </button>
        ) : (
          <p className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: '#374151' }}>
            {compactAnswer || '(답안 없음)'}
          </p>
        )}

        {/* 채점 영역 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {question.autoGrade && autoCorrect !== null && (
            <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
              style={autoCorrect
                ? { color: '#018600', background: '#E5FCE3' }
                : { color: '#B43200', background: '#FFF5F5' }
              }>
              {autoCorrect ? '정답' : '오답'}
            </span>
          )}
          <input
            type="number"
            value={displayScore}
            onChange={e => onScoreChange(student.id, e.target.value)}
            placeholder="—"
            min={0}
            max={question.points}
            className="w-14 bg-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 text-center"
            style={{ border: pendingScore !== undefined ? '1px solid #6366f1' : '1px solid #E0E0E0', color: '#222222' }}
          />
          <span className="text-xs" style={{ color: '#BDBDBD' }}>/ {question.points}</span>
        </div>
      </div>

      {/* 확장: 서술형/단답형/복수선택만 */}
      {expanded && ['essay', 'short_answer', 'multiple_answers'].includes(question.type) && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0' }}>
            <p className="leading-relaxed" style={{ fontSize: 13, color: '#424242' }}>{rawAnswer}</p>
            {autoCorrect !== null && !autoCorrect && question.correctAnswer && (
              <p className="mt-2 text-xs" style={{ color: '#9E9E9E' }}>정답: {question.correctAnswer}</p>
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
      <span className="text-xs px-2 py-0.5 rounded" style={{ color: '#4B5563', background: '#F5F5F5' }}>채점 완료</span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded" style={{ color: '#4B5563', background: '#F5F5F5' }}>미채점 {question.totalCount - question.gradedCount}명</span>
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
function ExcelModal({ question, students: allStudents, quizId, onClose, onApplied }) {
  const [step, setStep] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState([])

  const handleDownload = () => {
    const submittedStudents = allStudents.filter(s => s.submitted)
    downloadGradingSheetXlsx(question, submittedStudents)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStep('uploading')
    setErrorMsg('')
    setFileName(file.name)

    const result = await parseGradingSheet(file)
    if (result.error) {
      setErrorMsg(result.error)
      setStep('error')
      return
    }

    // 배점 초과 검사
    const maxPoints = question?.points ?? 0
    for (const row of result.rows) {
      if (row.score > maxPoints) {
        setErrorMsg(`학번 ${row.studentId}: 점수(${row.score})가 배점(${maxPoints}점)을 초과합니다. 전체 업로드가 불가합니다.`)
        setStep('error')
        return
      }
    }

    // 학번 전체 매칭 사전 검증
    for (const row of result.rows) {
      const found = allStudents.find(s => s.studentId === row.studentId)
      if (!found) {
        setErrorMsg(`학번 "${row.studentId}"(이)가 수강생 목록에 없습니다. 채점 양식을 수정하지 마세요. 전체 업로드가 불가합니다.`)
        setStep('error')
        return
      }
    }

    setPreviewRows(result.rows)
    setStep('preview')
  }

  const handleApply = () => {
    onApplied(previewRows)
  }

  return (
    <Modal onClose={onClose} title="엑셀 일괄 채점">
      <div className="space-y-4">

        {/* 가이드 + 버튼: 성공 이후엔 숨김 */}
        {step !== 'success' && (
          <>
            <div className="p-3 rounded" style={{ background: '#FAFAFA', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#1E293B' }}>일괄 채점 가이드</p>
              <ol className="space-y-1 text-xs" style={{ color: '#64748B' }}>
                <li>① 제공된 양식을 다운로드하여 점수를 입력해 주세요.</li>
                <li>② 파일을 저장한 뒤 업로드하면 완료됩니다.</li>
              </ol>
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>양식에 오류가 1개라도 포함되어 있으면 업로드되지 않습니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 py-3 text-sm transition-colors rounded"
                style={{ border: '1px solid #E0E0E0', color: '#424242', background: '#fff' }}
              >
                <Download size={15} />
                양식 다운로드
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
          </>
        )}

        {/* 오류 */}
        {step === 'error' && (() => {
          const rowMatch = errorMsg.match(/^(\d+행): (.+)/)
          const rowLabel = rowMatch ? rowMatch[1] : '-'
          const rowContent = rowMatch ? rowMatch[2] : errorMsg
          return (
            <div className="rounded" style={{ border: '1px solid #FECACA' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #FECACA', background: '#FEE2E2' }}>
                <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>업로드 실패</span>
                <span className="text-xs truncate max-w-[200px]" style={{ color: '#B91C1C' }} title={fileName}>{fileName}</span>
              </div>
              <div className="grid text-xs px-4 py-2" style={{ gridTemplateColumns: '52px 1fr', borderBottom: '1px solid #F1F5F9', color: '#94A3B8' }}>
                <span>위치</span>
                <span>오류 내용</span>
              </div>
              <div className="grid text-xs px-4 py-3 items-start" style={{ gridTemplateColumns: '52px 1fr' }}>
                <span className="font-medium" style={{ color: '#64748B' }}>{rowLabel}</span>
                <span className="leading-relaxed" style={{ color: '#1E293B' }}>{rowContent}</span>
              </div>
            </div>
          )
        })()}

        {/* 미리보기 */}
        {step === 'preview' && (
          <div className="rounded" style={{ border: '1px solid #E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <span className="text-xs font-semibold" style={{ color: '#1E293B' }}>업로드 내용 확인</span>
              <span className="text-xs" style={{ color: '#94A3B8' }}>{previewRows.length}명 · {fileName}</span>
            </div>
            {/* 표 헤더 */}
            <div className="grid text-xs px-4 py-2" style={{ gridTemplateColumns: '1fr 1fr 48px', borderBottom: '1px solid #F1F5F9', color: '#94A3B8' }}>
              <span className="text-center">이름</span>
              <span className="text-center">학번</span>
              <span className="text-center">점수</span>
            </div>
            {/* 표 데이터 */}
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 200 }}>
              {previewRows.map((row, i) => {
                const student = allStudents.find(s => s.studentId === row.studentId)
                return (
                  <div
                    key={i}
                    className="grid text-xs px-4 py-2"
                    style={{ gridTemplateColumns: '1fr 1fr 48px', borderBottom: '1px solid #F8FAFC', color: '#1E293B' }}
                  >
                    <span className="text-center">{student?.name ?? '-'}</span>
                    <span className="text-center" style={{ color: '#64748B' }}>{row.studentId}</span>
                    <span className="text-center font-medium" style={{ color: '#4F46E5' }}>{row.score}</span>
                  </div>
                )
              })}
            </div>
            {/* 적용 버튼 */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button
                onClick={handleApply}
                className="w-full py-2.5 text-sm font-semibold rounded transition-colors"
                style={{ background: '#4F46E5', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#4338CA' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#4F46E5' }}
              >
                {previewRows.length}명 점수 적용
              </button>
            </div>
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
