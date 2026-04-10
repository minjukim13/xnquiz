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
    return quizStudents.filter(s =>
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
                    {(() => {
                      if (QUIZ_INFO.scoreRevealEnabled === undefined && QUIZ_INFO.scoreReleasePolicy === undefined) return null
                      const enabled = QUIZ_INFO.scoreRevealEnabled ?? (QUIZ_INFO.scoreReleasePolicy !== null)
                      if (!enabled) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>성적 공개</span>
                            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>비공개</span>
                          </div>
                        )
                      }
                      const isWithAnswer = QUIZ_INFO.scoreRevealScope === 'with_answer'
                      const timing = QUIZ_INFO.scoreRevealTiming ?? QUIZ_INFO.scoreReleasePolicy
                      const timingLabel = timing === 'after_due' ? '마감 후 공개'
                        : timing === 'period' ? '공개 기간 지정'
                        : '즉시 공개'
                      const periodStart = QUIZ_INFO.scoreRevealStart?.split(' ')[0]
                      const periodEnd = QUIZ_INFO.scoreRevealEnd?.split(' ')[0]
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>성적 공개</span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                            {isWithAnswer ? '정답 포함' : '점수만'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                            {timingLabel}
                          </span>
                          {timing === 'period' && periodStart && (
                            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                              {periodStart} ~ {periodEnd}
                            </span>
                          )}
                        </div>
                      )
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
                      placeholder="학생 이름 또는 학번 검색"
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
      <div className="bg-white mb-3" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
        {/* 문항 메타 */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#6366f1' }}>Q{question.order}</span>
            <TypeBadge type={question.type} small />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#374151' }}>{question.points}점</span>
        </div>
        {/* 문항 본문 */}
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #F3F4F6' }}>
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
              <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#6366f1' }}>정답</span>
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

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex" style={{ borderBottom: '2px solid #E5E7EB' }}>
          {[
            { key: 'responses', icon: <Users size={12} />, label: `응시 현황`, count: students.length },
            { key: 'stats', icon: <BarChart3 size={12} />, label: '통계' },
          ].map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap"
              style={activeTab === key
                ? { color: '#4F46E5', borderBottom: '2px solid #4F46E5', marginBottom: -2 }
                : { color: '#9CA3AF', borderBottom: '2px solid transparent', marginBottom: -2 }
              }
            >
              {icon}
              {label}
              {count != null && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={activeTab === key
                    ? { background: '#EEF2FF', color: '#4F46E5' }
                    : { background: '#F3F4F6', color: '#9CA3AF' }
                  }>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'responses' && (
          <button
            onClick={onExcel}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors shrink-0"
            style={{ border: '1px solid #C7D2FE', color: '#4F46E5', background: '#EEF2FF' }}
          >
            <Download size={12} />
            엑셀 일괄 채점
          </button>
        )}
      </div>

      {activeTab === 'responses' ? (
        <ResponsesTab question={question} students={students} search={search} onSearch={onSearch} quizId={quizId} onGradeSaved={onGradeSaved} gradeVersion={gradeVersion} excelRows={excelRows} onExcelRowsConsumed={onExcelRowsConsumed} />
      ) : (
        <StatsTab question={question} students={students} />
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
  const [pendingScores, setPendingScores] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'graded' | 'ungraded' | 'unsubmitted'
  const isFirstRender = useRef(true)

  useEffect(() => { setPage(1) }, [search, pageSize, sortBy, sortDir, filterStatus])

  useEffect(() => {
    setPendingScores({})
    setSaveStatus('idle')
    setSortBy('name')
    setSortDir('asc')
    setFilterStatus('all')
    isFirstRender.current = true
  }, [question?.id])

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

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const list = [...students]
    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'ko')
      if (sortBy === 'studentId') cmp = a.studentId.localeCompare(b.studentId)
      if (sortBy === 'score') cmp = (a.score ?? -1) - (b.score ?? -1)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [students, sortBy, sortDir])

  const filtered = useMemo(() => {
    if (filterStatus === 'graded') return sorted.filter(s => s.submitted && s.score !== null)
    if (filterStatus === 'ungraded') return sorted.filter(s => s.submitted && s.score === null)
    if (filterStatus === 'unsubmitted') return sorted.filter(s => !s.submitted)
    return sorted
  }, [sorted, filterStatus])

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / pageSize)
  const visible = pageSize === 'all' ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSortClick = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

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

  const gradedCount = students.filter(s => s.submitted && s.score !== null).length
  const ungradedCount = students.filter(s => s.submitted && s.score === null).length
  const unsubmittedCount = students.filter(s => !s.submitted).length

  const SortTh = ({ col, children, className = '', style = {} }) => {
    const isActive = sortBy === col
    return (
      <button
        onClick={() => handleSortClick(col)}
        className={`flex items-center gap-0.5 transition-colors ${className}`}
        style={{ fontSize: 14, fontWeight: 600, color: isActive ? '#4F46E5' : '#6B7280', ...style }}
      >
        {children}
        <ArrowUpDown size={11} style={{ color: isActive ? '#6366f1' : '#D1D5DB', transform: isActive && sortDir === 'desc' ? 'scaleY(-1)' : undefined, flexShrink: 0 }} />
      </button>
    )
  }

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      {/* 툴바 */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="이름 또는 학번"
            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 rounded focus:outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#222222' }}
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
            <span className="text-xs font-medium" style={{ color: '#059669' }}>저장 완료</span>
          )}
          <button
            onClick={handleBulkSave}
            disabled={pendingCount === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#4F46E5', color: '#fff' }}
          >
            일괄 저장{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6', background: '#fff' }}>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: '#F3F4F6', display: 'inline-flex' }}>
          {[
            { key: 'all',          label: '전체',    count: students.length,  dotColor: null },
            { key: 'graded',       label: '채점완료', count: gradedCount,      dotColor: '#10B981' },
            { key: 'ungraded',     label: '미채점',   count: ungradedCount,    dotColor: '#F59E0B' },
            { key: 'unsubmitted',  label: '미제출',   count: unsubmittedCount, dotColor: '#D1D5DB' },
          ].map(({ key, label, count, dotColor }) => {
            const isActive = filterStatus === key
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={isActive
                  ? { background: '#fff', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }
                  : { background: 'transparent', color: '#6B7280' }
                }
              >
                {dotColor && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                )}
                {label}
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#6366f1' : '#9CA3AF' }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center px-3 py-2 gap-2" style={{ borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
        <div className="w-28 shrink-0"><SortTh col="name">이름</SortTh></div>
        <div className="w-24 shrink-0"><SortTh col="studentId">학번</SortTh></div>
        <div className="flex-1 text-sm font-semibold" style={{ color: '#6B7280' }}>제출 답안</div>
        {question.autoGrade && <div className="w-16 shrink-0 text-sm font-semibold" style={{ color: '#6B7280' }}>정답 여부</div>}
        <div className="w-40 shrink-0 flex justify-end"><SortTh col="score">점수</SortTh></div>
      </div>

      {/* 행 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs" style={{ color: '#9CA3AF' }}>검색 결과가 없습니다</div>
        ) : (
          visible.map(s => (
            <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: '1px solid #F3F4F6' }}>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>{page} / {totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 rounded text-xs disabled:opacity-30"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}>이전</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded text-xs flex items-center justify-center"
                  style={p === page ? { background: '#6366f1', color: '#fff', fontWeight: 600 } : { border: '1px solid #E5E7EB', color: '#374151' }}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1 rounded text-xs disabled:opacity-30"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}>다음</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 문항 중심: 학생 행 (문항 유형별 채점 UI) ─────────────────────────────
function StudentRow({ student, question, quizId, onScoreChange, pendingScore }) {
  // 미제출 학생
  if (!student.submitted) {
    const unsubStorageKey = `${quizId}_${student.id}_${question.id}`
    const unsubInitScore = (() => {
      const grades = getLocalGrades()
      if (unsubStorageKey in grades) return grades[unsubStorageKey]
      return ''
    })()
    const unsubDisplayScore = pendingScore !== undefined ? pendingScore : unsubInitScore
    return (
      <div className="flex items-center gap-2 px-3 py-3" style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
        <div className="w-28 shrink-0">
          <p className="text-sm font-medium truncate" style={{ color: '#9CA3AF' }}>{student.name}</p>
        </div>
        <div className="w-24 shrink-0">
          <p className="text-sm truncate" style={{ color: '#C4C4C4' }}>{student.studentId}</p>
        </div>
        <p className="flex-1 text-sm" style={{ color: '#D1D5DB' }}>미제출</p>
        {question.autoGrade && <div className="w-16 shrink-0" />}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-end">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0" style={{ color: '#9CA3AF', background: '#F3F4F6' }}>
            미제출
          </span>
          <input
            type="number"
            value={unsubDisplayScore}
            onChange={e => onScoreChange(student.id, e.target.value)}
            placeholder="—"
            min={0}
            max={question.points}
            step={0.5}
            className="w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-200 text-center"
            style={{ border: pendingScore !== undefined ? '1px solid #6366f1' : '1px solid #E5E7EB', color: '#222222' }}
          />
          <span className="text-sm shrink-0" style={{ color: '#9CA3AF' }}>/ {question.points}</span>
        </div>
      </div>
    )
  }

  const storageKey = `${quizId}_${student.id}_${question.id}`
  const [expanded, setExpanded] = useState(false)
  const studentIdx = parseInt(student.id.replace('s', ''))
  const rawAnswer = student.selections?.[question.id] ??
    (question.autoGrade
      ? getStudentAnswer(studentIdx, question.id)
      : (student.response || getStudentAnswer(studentIdx, question.id)))

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

  const isUngraded = student.score === null

  return (
    <div style={{ borderBottom: '1px solid #F3F4F6' }}>
      <div className="flex items-center gap-2 px-3 py-3" style={isUngraded ? { background: '#FFFCF5' } : {}}>
        {/* 이름 */}
        <div className="w-28 shrink-0">
          <p className="text-sm font-medium truncate" style={{ color: '#374151' }}>{student.name}</p>
        </div>

        {/* 학번 */}
        <div className="w-24 shrink-0">
          <p className="text-sm truncate" style={{ color: '#9CA3AF' }}>{student.studentId}</p>
        </div>

        {/* 답안 */}
        {['essay', 'short_answer', 'multiple_answers'].includes(question.type) ? (
          <button className="flex-1 min-w-0 text-left flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
            <p className="truncate flex-1 text-sm" style={{ color: '#374151' }}>{compactAnswer || '(답안 없음)'}</p>
            {expanded
              ? <ChevronUp size={13} style={{ color: '#D1D5DB', flexShrink: 0 }} />
              : <ChevronDown size={13} style={{ color: '#D1D5DB', flexShrink: 0 }} />
            }
          </button>
        ) : (
          <p className="flex-1 min-w-0 truncate text-sm" style={{ color: '#374151' }}>{compactAnswer || '(답안 없음)'}</p>
        )}

        {/* 정답 여부 */}
        {question.autoGrade && (
          <div className="w-16 shrink-0">
            {autoCorrect !== null && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={autoCorrect ? { color: '#059669', background: '#ECFDF5' } : { color: '#DC2626', background: '#FEF2F2' }}>
                {autoCorrect ? '정답' : '오답'}
              </span>
            )}
          </div>
        )}

        {/* 채점여부 + 점수 */}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-end">
          {isUngraded && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0" style={{ color: '#D97706', background: '#FFFBEB' }}>
              미채점
            </span>
          )}
          <input
            type="number"
            value={displayScore}
            onChange={e => onScoreChange(student.id, e.target.value)}
            placeholder="—"
            min={0}
            max={question.points}
            step={0.5}
            className="w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-200 text-center"
            style={{ border: pendingScore !== undefined ? '1px solid #6366f1' : '1px solid #E5E7EB', color: '#222222' }}
          />
          <span className="text-sm shrink-0" style={{ color: '#9CA3AF' }}>/ {question.points}</span>
        </div>
      </div>

      {expanded && ['essay', 'short_answer', 'multiple_answers'].includes(question.type) && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p className="leading-relaxed text-sm" style={{ color: '#374151' }}>{rawAnswer}</p>
            {autoCorrect !== null && !autoCorrect && question.correctAnswer && (
              <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>정답: {question.correctAnswer}</p>
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

  const answer = student.selections?.[question.id] ?? getStudentAnswer(studentIdx, question.id)
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
            step={0.5}
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
  // 문항별 득점 (총점이 아닌 해당 문항 점수)
  const getQScore = (s) => question.autoGrade
    ? s.autoScores?.[question.id]
    : s.manualScores?.[question.id]

  const scoredStudents = students.filter(s => getQScore(s) != null)
  const scores = scoredStudents.map(s => getQScore(s))
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
  const maxScore = scores.length ? Math.max(...scores) : '-'
  const minScore = scores.length ? Math.min(...scores) : '-'

  // 점수별 빈도 (0점 ~ 만점)
  const freqMap = {}
  scores.forEach(s => { freqMap[s] = (freqMap[s] || 0) + 1 })
  const distribution = Array.from({ length: question.points + 1 }, (_, i) => ({
    label: `${i}점`, score: i, count: freqMap[i] || 0,
  }))

  const correctCount = question.autoGrade
    ? scoredStudents.filter(s => (getQScore(s) ?? 0) === question.points).length
    : null
  const correctPct = correctCount != null && scoredStudents.length > 0
    ? Math.round((correctCount / scoredStudents.length) * 100) : null

  return (
    <div className="flex-1 bg-white overflow-y-auto scrollbar-thin" style={{ border: '1px solid #E0E0E0', borderRadius: 8 }}>
      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3 p-4">
        <StatCard label="문항 평균" value={avg} unit="점" accent />
        <StatCard label="최고" value={maxScore} unit="점" />
        <StatCard label="최저" value={minScore} unit="점" />
        <StatCard label="채점 완료" value={scoredStudents.length} unit={`/ ${students.length}명`} />
      </div>

      <div className="mx-4" style={{ height: 1, background: '#F3F4F6' }} />

      {/* 점수 분포 */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: '#374151' }}>점수 분포</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>만점 {question.points}점</span>
        </div>
        {scoredStudents.length === 0 ? (
          <div className="flex items-center justify-center h-28 rounded" style={{ background: '#F9FAFB', border: '1px dashed #E5E7EB' }}>
            <span className="text-xs" style={{ color: '#C4C4C4' }}>채점 완료된 학생이 없습니다</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={distribution} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(val) => [`${val}명`, '인원']}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {distribution.map((d, i) => (
                  <Cell key={i} fill={d.score === maxScore ? '#6366f1' : '#C7D2FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 정답률 (자동채점 문항만) */}
      {correctPct != null && (
        <>
          <div className="mx-4" style={{ height: 1, background: '#F3F4F6' }} />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>정답률</span>
              <span className="text-sm font-bold"
                style={{ color: correctPct >= 70 ? '#059669' : correctPct >= 40 ? '#D97706' : '#DC2626' }}>
                {correctPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: '#E5E7EB' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${correctPct}%`, background: correctPct >= 70 ? '#34D399' : correctPct >= 40 ? '#FBBF24' : '#F87171' }} />
            </div>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              정답 {correctCount}명 · 오답 {scoredStudents.length - correctCount}명
            </p>
          </div>
        </>
      )}
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
