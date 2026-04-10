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
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'


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

const STATUS_MAP = {
  open:      { label: '진행중', cls: 'bg-green-50 text-green-600' },
  grading:   { label: '진행중', cls: 'bg-green-50 text-green-600' },
  closed:    { label: '마감',   cls: 'bg-slate-100 text-slate-500' },
  scheduled: { label: '예정',   cls: 'bg-amber-50 text-amber-600' },
  draft:     { label: '임시저장', cls: 'bg-[#E8F3FF] text-[#3182F6]' },
}

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
  const [submissionFilter, setSubmissionFilter] = useState('all') // 'all' | 'before_edit' | 'after_edit'

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

  // 문항 수정 타임스탬프 읽기
  const questionsModifiedAt = useMemo(() => {
    try {
      const raw = localStorage.getItem('xnq_questions_modified')
      if (!raw) return null
      const map = JSON.parse(raw)
      return map[id] ? new Date(map[id]) : null
    } catch { return null }
  }, [id])

  // localStorage 채점 기록을 반영한 실시간 gradedCount 계산
  const questionsWithLiveCounts = useMemo(() => {
    const grades = getLocalGrades()
    const submittedStudents = quizStudents.filter(s => s.submitted)
    const totalCount = submittedStudents.length
    return quizQuestions.map(q => {
      if (q.autoGrade) return { ...q, totalCount, gradedCount: totalCount }
      const gradedCount = submittedStudents.filter(s => {
        const key = `${id}_${s.id}_${q.id}`
        return (key in grades) || s.manualScores?.[q.id] != null
      }).length
      return { ...q, totalCount, gradedCount }
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
    return quizStudents.filter(s => s.submitted).filter(s => {
      // 이름/학번 검색 필터
      if (studentSearch !== '' && !s.name.includes(studentSearch) && !s.studentId.includes(studentSearch)) return false
      // 수정 전/후 제출 필터
      if (submissionFilter !== 'all' && questionsModifiedAt && s.submittedAt) {
        const submittedTime = new Date(s.submittedAt)
        if (submissionFilter === 'before_edit' && submittedTime >= questionsModifiedAt) return false
        if (submissionFilter === 'after_edit' && submittedTime < questionsModifiedAt) return false
      }
      return true
    })
  }, [studentSearch, quizStudents, submissionFilter, questionsModifiedAt])

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
          <AlertCircle size={32} className="mx-auto mb-3 text-red-700" />
          <p className="text-sm font-medium mb-1 text-slate-900">퀴즈를 찾을 수 없습니다</p>
          <Link to="/" className="text-xs text-[#3182F6] hover:underline">퀴즈 목록으로 돌아가기</Link>
        </div>
      </Layout>
    )
  }

  // draft 퀴즈: 응시 시작 전 안내
  if (QUIZ_INFO.status === 'draft') {
    return (
      <Layout breadcrumbs={[
        { label: '퀴즈 관리', href: '/' },
        { label: QUIZ_INFO.title },
        { label: '채점 대시보드' },
      ]}>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#E8F3FF]">
            <FileEdit size={24} className="text-[#3182F6]" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">아직 응시가 시작되지 않았습니다</h3>
          <p className="text-sm mb-6 text-gray-500">
            이 퀴즈는 임시저장 상태입니다. 퀴즈를 공개하면 학생이 응시할 수 있습니다.
          </p>
          <Link
            to={`/quiz/${QUIZ_INFO.id}/edit`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-[#3182F6] hover:bg-[#1B64DA] text-white"
          >
            <FileEdit size={14} />
            퀴즈 편집하기
          </Link>
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
      <div className="py-6">

        {/* 퀴즈 정보 카드 */}
        {(() => {
          const statusStyle = STATUS_MAP[QUIZ_INFO.status] ?? { label: QUIZ_INFO.status, cls: 'bg-slate-100 text-slate-500' }
          return (
            <Card className="mb-5 overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#E8F3FF] text-[#3182F6]">
                        {QUIZ_INFO.week}주차 {QUIZ_INFO.session}차시
                      </span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded', statusStyle.cls)}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-1.5 text-gray-900">{QUIZ_INFO.title}</h2>
                    <p className="text-sm mb-2 text-gray-400">{QUIZ_INFO.startDate} ~ {QUIZ_INFO.dueDate}</p>
                    {(() => {
                      if (QUIZ_INFO.scoreRevealEnabled === undefined && QUIZ_INFO.scoreReleasePolicy === undefined) return null
                      const enabled = QUIZ_INFO.scoreRevealEnabled ?? (QUIZ_INFO.scoreReleasePolicy !== null)
                      if (!enabled) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-400">성적 공개</span>
                            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-gray-500">비공개</span>
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
                          <span className="text-xs font-medium text-gray-400">성적 공개</span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#E8F3FF] text-[#3182F6]">
                            {isWithAnswer ? '정답 포함' : '점수만'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-50 text-green-600">
                            {timingLabel}
                          </span>
                          {timing === 'period' && periodStart && (
                            <span className="text-xs font-medium text-gray-500">
                              {periodStart} ~ {periodEnd}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="flex items-stretch shrink-0 rounded-xl overflow-hidden border border-slate-200">
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 90 }}>
                      <p className="text-xs mb-2 text-gray-400">제출률</p>
                      <p className="text-2xl font-bold leading-none text-[#3182F6]">{submitRate}%</p>
                    </div>
                    <div className="w-px bg-slate-200" />
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 110 }}>
                      <p className="text-xs mb-2 text-gray-400">제출 인원</p>
                      <p className="text-2xl font-bold leading-none text-gray-900">
                        {QUIZ_INFO.submitted}<span className="text-sm font-normal ml-1 text-gray-400">/ {QUIZ_INFO.totalStudents}명</span>
                      </p>
                    </div>
                    <div className="w-px bg-slate-200" />
                    <div className="flex flex-col justify-center px-5 py-4 text-center" style={{ minWidth: 110 }}>
                      <p className="text-xs mb-2 text-gray-400">채점 완료</p>
                      <p className="text-2xl font-bold leading-none text-gray-900">
                        {QUIZ_INFO.graded}<span className="text-sm font-normal ml-1 text-gray-400">/ {QUIZ_INFO.submitted}명</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 채점 진행률 — 콘텐츠 영역 내 통합 */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-xs mb-2 text-gray-400">
                    <span>채점 진행률</span>
                    <span className="font-semibold text-[#3182F6]">{gradeProgress}%</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden bg-slate-200">
                    <div
                      className="h-full rounded-full transition-all bg-[#3182F6]"
                      style={{ width: `${gradeProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )
        })()}

        {/* 액션 바 */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          {/* 채점 모드 전환 */}
          <div className="flex items-center p-0.5 gap-0.5 rounded bg-slate-100 border border-slate-200">
            {[
              { mode: 'question', icon: FileText, label: '문항 중심' },
              { mode: 'student',  icon: Users,    label: '학생 중심' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => { setGradingMode(mode); setMobileView('questions') }}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3.5 py-2 rounded transition-all',
                  gradingMode === mode
                    ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                    : 'text-slate-400 border border-transparent'
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/quiz/${QUIZ_INFO.id}/stats`}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-slate-200 rounded text-slate-600 bg-white hover:bg-slate-100 transition-colors"
            >
              <BarChart3 size={12} />
              <span className="hidden sm:block">퀴즈 통계</span>
            </Link>
            <button onClick={() => setShowRegradeModal(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-slate-200 rounded text-slate-600 bg-white hover:bg-slate-100 transition-colors">
              <RefreshCw size={12} />
              <span className="hidden sm:block">재채점</span>
            </button>
            <button
              onClick={() => downloadAnswerSheetsXlsx(QUIZ_INFO, quizStudents.filter(s => s.submitted), quizQuestions, { getStudentAnswer })}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-slate-200 rounded text-slate-600 bg-white hover:bg-slate-100 transition-colors"
            >
              <FileDown size={12} />
              <span>답안지 다운로드</span>
            </button>
          </div>
        </div>

        {/* 모바일 탭 전환 */}
        <div className="flex sm:hidden mb-4 p-0.5 gap-0.5 rounded bg-slate-100 border border-slate-200">
          {[
            { view: 'questions', label: gradingMode === 'question' ? '문항 목록' : '학생 목록' },
            { view: 'detail',    label: gradingMode === 'question' ? (selectedQ ? `Q${selectedQ.order} 상세` : '문항 선택') : (selectedStudent ? selectedStudent.name : '학생 선택') },
          ].map(({ view, label }) => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className={cn(
                'flex-1 text-xs py-2 rounded transition-all',
                mobileView === view
                  ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                  : 'text-slate-400 border border-transparent'
              )}
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
              <aside className={cn(
                mobileView === 'questions' ? 'flex' : 'hidden',
                'sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0 rounded-xl overflow-hidden border border-slate-200'
              )}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    총 문항 {questionsWithLiveCounts.length}개
                  </span>
                  <DropdownSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={SORT_OPTIONS}
                    size="sm"
                    ghost
                  />
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2 bg-white">
                  {ungradedQuestions.map(q => (
                    <QuestionItem key={q.id} question={q} selected={selectedQ?.id === q.id} onClick={() => handleSelectQ(q)} />
                  ))}

                  {gradedQuestions.length > 0 && (
                    <div>
                      <button
                        onClick={() => setCollapsedGraded(!collapsedGraded)}
                        className="flex items-center justify-between w-full font-medium pt-2 pb-1.5 px-1 transition-colors text-[11px] text-gray-600 hover:text-gray-900"
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
              <div className={cn(mobileView === 'detail' ? 'flex' : 'hidden', 'sm:flex flex-1 flex-col min-w-0')}>
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
              <aside className={cn(
                mobileView === 'questions' ? 'flex' : 'hidden',
                'sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0 rounded-xl overflow-hidden border border-slate-200'
              )}>
                <div className="px-3 py-2.5 space-y-2 border-b border-slate-100">
                  <div className="relative w-full">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="학생 이름 또는 학번 검색"
                      className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  {questionsModifiedAt && (
                    <div className="flex items-center gap-1">
                      {[
                        { value: 'all', label: '전체' },
                        { value: 'before_edit', label: '수정 전 제출' },
                        { value: 'after_edit', label: '수정 후 제출' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setSubmissionFilter(opt.value)}
                          className={cn(
                            'text-xs px-2 py-1 rounded transition-all',
                            submissionFilter === opt.value
                              ? 'bg-[#E8F3FF] text-[#3182F6] font-semibold border border-blue-200'
                              : 'bg-white text-slate-400 border border-slate-200'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2 bg-white">
                  {ungradedStudentList.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">미채점</span>
                        <span className="text-xs text-slate-300">{ungradedStudentList.length}명</span>
                        <div className="flex-1 h-px bg-slate-200" />
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
                        <span className="text-xs font-semibold text-gray-600">채점 완료</span>
                        <span className="text-xs text-slate-300">{gradedStudentList.length}명</span>
                        <div className="flex-1 h-px bg-slate-200" />
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
              <div className={cn(mobileView === 'detail' ? 'flex' : 'hidden', 'sm:flex flex-1 flex-col min-w-0')}>
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
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 text-sm text-white bg-slate-800 rounded-lg shadow-lg">
          <CheckCircle2 size={15} className="shrink-0 text-blue-300" />
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
      className={cn(
        'w-full text-left p-3 rounded transition-all border',
        selected
          ? 'border-[#3182F6] bg-[#E8F3FF]'
          : dimmed
          ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
          : 'border-slate-200 bg-white hover:border-slate-400'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-bold', selected ? 'text-[#3182F6]' : 'text-slate-400')}>
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {isComplete && (
              <span className="text-xs px-1.5 py-0.5 rounded text-green-700 bg-green-50">완료</span>
            )}
          </div>
          <p className={cn('text-xs leading-relaxed line-clamp-2', dimmed ? 'text-slate-300' : 'text-slate-500')}>
            {question.text}
          </p>
        </div>
        <span className="text-xs shrink-0 text-slate-400">{question.points}점</span>
      </div>

      {!isComplete && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1 text-slate-400">
            <span>{question.gradedCount}/{question.totalCount}명</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded overflow-hidden bg-slate-200">
            <div className="h-full bg-[#3182F6] rounded" style={{ width: `${progress}%` }} />
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
      <div className="bg-white mb-3 border border-slate-200 rounded-lg">
        {/* 문항 메타 */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#3182F6]">Q{question.order}</span>
            <TypeBadge type={question.type} small />
          </div>
          <span className="text-sm font-semibold text-gray-700">{question.points}점</span>
        </div>
        {/* 문항 본문 */}
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-sm leading-relaxed text-slate-900">{question.text}</p>
          {question.choices && question.choices.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {question.choices.map((choice, i) => {
                const isCorrect = choice === question.correctAnswer
                return (
                  <div key={i} className={cn('flex items-baseline gap-2 text-[13px]', isCorrect ? 'text-[#1B64DA] font-semibold' : 'text-gray-500 font-normal')}>
                    <span className={cn('flex-shrink-0', isCorrect ? 'text-[#3182F6]' : 'text-gray-400')} style={{ minWidth: 16 }}>{i + 1}.</span>
                    <span>{choice}</span>
                  </div>
                )
              })}
            </div>
          )}
          {question.correctAnswer && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[#E8F3FF] text-[#3182F6]">정답</span>
              {question.type === 'true_false' ? (
                <div className="flex items-center gap-1.5">
                  {['참', '거짓'].map(opt => {
                    const isCorrect = opt === question.correctAnswer
                    return (
                      <span key={opt} className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', isCorrect ? 'bg-[#3182F6] text-white' : 'bg-slate-100 text-slate-400')}>
                        {opt}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <span className="text-xs text-slate-800">{question.correctAnswer}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 탭 + 엑셀 */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex border-b-2 border-slate-200">
          {[
            { key: 'responses', icon: <Users size={12} />, label: `응시 현황`, count: students.length },
            { key: 'stats', icon: <BarChart3 size={12} />, label: '통계' },
          ].map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap -mb-0.5 border-b-2',
                activeTab === key ? 'text-[#3182F6] border-[#3182F6]' : 'text-gray-400 border-transparent'
              )}
            >
              {icon}
              {label}
              {count != null && (
                <span className={cn('ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold', activeTab === key ? 'bg-[#E8F3FF] text-[#3182F6]' : 'bg-slate-100 text-gray-400')}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'responses' && (
          <button
            onClick={onExcel}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors shrink-0 border border-blue-200 text-[#3182F6] bg-[#E8F3FF] hover:bg-blue-100"
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

  const SortTh = ({ col, children, className = '' }) => {
    const isActive = sortBy === col
    return (
      <button
        onClick={() => handleSortClick(col)}
        className={cn('flex items-center gap-0.5 transition-colors text-sm font-semibold', isActive ? 'text-[#3182F6]' : 'text-gray-500', className)}
      >
        {children}
        <ArrowUpDown size={11} className={cn('flex-shrink-0', isActive ? 'text-[#3182F6]' : 'text-gray-300')} style={isActive && sortDir === 'desc' ? { transform: 'scaleY(-1)' } : undefined} />
      </button>
    )
  }

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col border border-slate-200 rounded-lg">
      {/* 툴바 */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="이름 또는 학번"
            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:outline-none"
          />
        </div>
        <DropdownSelect
          size="sm"
          value={pageSize}
          onChange={v => setPageSize(v === 'all' ? 'all' : Number(v))}
          options={PAGE_SIZE_OPTIONS}
          ghost
          style={{ width: 80 }}
        />
        <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-2">
          {saveStatus === 'saved' && (
            <span className="text-xs font-medium text-emerald-600">저장 완료</span>
          )}
          <button
            onClick={handleBulkSave}
            disabled={pendingCount === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#3182F6] text-white hover:bg-[#1B64DA]"
          >
            일괄 저장{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="px-3 py-2 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 inline-flex">
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
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  isActive ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500'
                )}
              >
                {dotColor && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block" style={{ background: dotColor }} />
                )}
                {label}
                <span className={cn('text-xs font-bold', isActive ? 'text-[#3182F6]' : 'text-gray-400')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center px-3 py-2 gap-2 border-b-2 border-slate-200 bg-slate-50">
        <div className="w-28 shrink-0"><SortTh col="name">이름</SortTh></div>
        <div className="w-24 shrink-0"><SortTh col="studentId">학번</SortTh></div>
        <div className="flex-1 text-sm font-semibold text-gray-500">제출 답안</div>
        {question.autoGrade && <div className="w-16 shrink-0 text-sm font-semibold text-gray-500">정답 여부</div>}
        <div className="w-40 shrink-0 flex justify-end"><SortTh col="score">점수</SortTh></div>
      </div>

      {/* 행 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400">검색 결과가 없습니다</div>
        ) : (
          visible.map(s => (
            <StudentRow key={s.id} student={s} question={question} quizId={quizId} onScoreChange={handleScoreChange} pendingScore={pendingScores[s.id]} />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
          <span className="text-xs text-gray-400">{page} / {totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 rounded text-xs disabled:opacity-30 border border-slate-200 text-gray-700">이전</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={cn(
                    'w-7 h-7 rounded text-xs flex items-center justify-center',
                    p === page ? 'bg-[#3182F6] text-white font-semibold' : 'border border-slate-200 text-gray-700'
                  )}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1 rounded text-xs disabled:opacity-30 border border-slate-200 text-gray-700">다음</button>
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
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 bg-slate-50">
        <div className="w-28 shrink-0">
          <p className="text-sm font-medium truncate text-gray-400">{student.name}</p>
        </div>
        <div className="w-24 shrink-0">
          <p className="text-sm truncate text-slate-300">{student.studentId}</p>
        </div>
        <p className="flex-1 text-sm text-gray-300">미제출</p>
        {question.autoGrade && <div className="w-16 shrink-0" />}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-end">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 text-gray-400 bg-slate-100">
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
            className={cn(
              'w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-200 text-center border text-slate-900',
              pendingScore !== undefined ? 'border-[#3182F6]' : 'border-slate-200'
            )}
          />
          <span className="text-sm shrink-0 text-gray-400">/ {question.points}</span>
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
    <div className="border-b border-slate-100">
      <div className={cn('flex items-center gap-2 px-3 py-3', isUngraded ? 'bg-amber-50/30' : '')}>
        {/* 이름 */}
        <div className="w-28 shrink-0">
          <p className="text-sm font-medium truncate text-gray-700">{student.name}</p>
        </div>

        {/* 학번 */}
        <div className="w-24 shrink-0">
          <p className="text-sm truncate text-gray-400">{student.studentId}</p>
        </div>

        {/* 답안 */}
        {['essay', 'short_answer', 'multiple_answers'].includes(question.type) ? (
          <button className="flex-1 min-w-0 text-left flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
            <p className="truncate flex-1 text-sm text-gray-700">{compactAnswer || '(답안 없음)'}</p>
            {expanded
              ? <ChevronUp size={13} className="text-gray-300 flex-shrink-0" />
              : <ChevronDown size={13} className="text-gray-300 flex-shrink-0" />
            }
          </button>
        ) : (
          <p className="flex-1 min-w-0 truncate text-sm text-gray-700">{compactAnswer || '(답안 없음)'}</p>
        )}

        {/* 정답 여부 */}
        {question.autoGrade && (
          <div className="w-16 shrink-0">
            {autoCorrect !== null && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', autoCorrect ? 'text-[#31B46E] bg-[#EAF8F1]' : 'text-[#F04452] bg-[#FEECEE]')}>
                {autoCorrect ? '정답' : '오답'}
              </span>
            )}
          </div>
        )}

        {/* 채점여부 + 점수 */}
        <div className="flex items-center gap-1.5 w-40 shrink-0 justify-end">
          {isUngraded && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 text-amber-600 bg-amber-50">
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
            className={cn(
              'w-14 bg-white text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-200 text-center border text-slate-900',
              pendingScore !== undefined ? 'border-[#3182F6]' : 'border-slate-200'
            )}
          />
          <span className="text-sm shrink-0 text-gray-400">/ {question.points}</span>
        </div>
      </div>

      {expanded && ['essay', 'short_answer', 'multiple_answers'].includes(question.type) && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <p className="leading-relaxed text-sm text-gray-700">{rawAnswer}</p>
            {autoCorrect !== null && !autoCorrect && question.correctAnswer && (
              <p className="mt-2 text-xs text-gray-400">정답: {question.correctAnswer}</p>
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
      className={cn(
        'w-full text-left p-2.5 rounded transition-all mb-1 border',
        selected
          ? 'border-[#3182F6] bg-[#E8F3FF]'
          : 'border-slate-200 bg-white hover:border-slate-400'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-slate-200 text-slate-500">
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', selected ? 'text-[#3182F6]' : 'text-slate-900')}>
            {student.name}
          </p>
          <p className="text-xs text-slate-400">{student.studentId} · {student.department}</p>
        </div>
        {student.score !== null ? (
          <span className="text-sm font-bold shrink-0 text-green-700">{student.score}점</span>
        ) : (
          <span className="text-xs shrink-0 text-red-700">미채점</span>
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
      <div className="bg-white p-4 mb-3 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-[#E8F3FF] text-[#3182F6]">
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
    <div className="bg-white p-4 border border-slate-200 rounded-lg">
      {/* 문항 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-bold text-slate-400">Q{question.order}</span>
            <TypeBadge type={question.type} small />
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{question.text}</p>
        </div>
        {/* 점수 / 배점 */}
        <div className="shrink-0 text-right">
          {question.autoGrade ? (
            <span className={cn('text-sm font-bold', autoCorrect ? 'text-[#31B46E]' : 'text-slate-700')}>
              {autoCorrect ? question.points : 0}
              <span className="text-xs font-normal text-slate-300"> / {question.points}</span>
            </span>
          ) : saved && score !== '' ? (
            <span className="text-sm font-bold text-slate-900">
              {score}
              <span className="text-xs font-normal text-slate-300"> / {question.points}</span>
            </span>
          ) : (
            <span className="text-xs text-red-700">미채점</span>
          )}
        </div>
      </div>

      {/* 답안 박스 — 자동채점 배경 틴트로 정오답 표시 */}
      <div
        className={cn(
          'px-3 py-2 text-xs leading-relaxed rounded border flex items-start justify-between gap-2',
          question.autoGrade && autoCorrect !== null
            ? autoCorrect
              ? 'bg-[#EAF8F1] border-[#C3E8D5] text-[#333D4B]'
              : 'bg-[#FEECEE] border-[#F9C6C9] text-[#333D4B]'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        )}
      >
        <span className="flex-1">{answer}</span>
        {question.autoGrade && autoCorrect !== null && (
          autoCorrect
            ? <CheckCircle2 size={13} className="shrink-0 mt-px text-[#31B46E]" />
            : <X size={13} className="shrink-0 mt-px text-[#F04452]" />
        )}
      </div>

      {/* 자동채점 하단 고정 영역 — 정오답 모두 동일 높이 유지 */}
      {question.autoGrade && autoCorrect !== null && (
        <div className="mt-1.5 pl-1 flex items-start gap-1 min-h-[16px]">
          {autoCorrect ? (
            <span className="text-xs text-slate-400">정답</span>
          ) : correctAnswer ? (
            <>
              <span className="text-xs shrink-0 text-slate-400">정답:</span>
              {isLongAnswer ? (
                <span className="text-xs text-slate-700">
                  {answerExpanded ? correctAnswer : `${correctAnswer.slice(0, 30)}…`}
                  <button
                    onClick={() => setAnswerExpanded(v => !v)}
                    className="ml-1 text-xs text-[#3182F6]"
                  >
                    {answerExpanded ? '접기' : '더보기'}
                  </button>
                </span>
              ) : (
                <span className="text-xs text-slate-700">{correctAnswer}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">오답</span>
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
            className="w-16 bg-white text-xs px-2 py-1.5 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 text-center"
          />
          <span className="text-xs text-slate-400">/ {question.points}</span>
          {saved && (
            <span className="text-xs flex items-center gap-1 ml-1 text-green-700">
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
            className="ml-auto text-xs text-white bg-[#3182F6] hover:bg-[#1B64DA] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors font-medium"
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
    <div className="flex-1 bg-white overflow-y-auto scrollbar-thin border border-slate-200 rounded-lg">
      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3 p-4">
        <StatCard label="문항 평균" value={avg} unit="점" accent />
        <StatCard label="최고" value={maxScore} unit="점" />
        <StatCard label="최저" value={minScore} unit="점" />
        <StatCard label="채점 완료" value={scoredStudents.length} unit={`/ ${students.length}명`} />
      </div>

      <div className="mx-4 h-px bg-slate-100" />

      {/* 점수 분포 */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-700">점수 분포</span>
          <span className="text-xs text-gray-400">만점 {question.points}점</span>
        </div>
        {scoredStudents.length === 0 ? (
          <div className="flex items-center justify-center h-28 rounded bg-slate-50 border border-dashed border-slate-200">
            <span className="text-xs text-slate-300">채점 완료된 학생이 없습니다</span>
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
          <div className="mx-4 h-px bg-slate-100" />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">정답률</span>
              <span className={cn('text-sm font-bold', correctPct >= 70 ? 'text-emerald-600' : correctPct >= 40 ? 'text-amber-600' : 'text-red-600')}>
                {correctPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mb-2 bg-slate-200">
              <div
                className={cn('h-full rounded-full transition-all', correctPct >= 70 ? 'bg-emerald-400' : correctPct >= 40 ? 'bg-amber-400' : 'bg-red-400')}
                style={{ width: `${correctPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
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
    <div className="bg-white p-3 text-center border border-slate-200 rounded-lg">
      <div className="flex items-baseline justify-center gap-0.5 flex-wrap">
        <span className={cn('text-xl font-bold', accent ? 'text-[#3182F6]' : 'text-slate-900')}>{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
      <div className="text-xs mt-1 text-slate-500">{label}</div>
    </div>
  )
}

function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type }
  return (
    <span className={`inline-block font-medium px-1.5 py-0.5 rounded ${small ? 'text-xs' : 'text-xs'} bg-slate-100 text-slate-500`}>
      {cfg.label}
    </span>
  )
}

function GradeStatus({ question }) {
  const complete = question.gradedCount >= question.totalCount
  if (complete) {
    return (
      <span className="text-xs px-2 py-0.5 rounded text-gray-600 bg-slate-100">채점 완료</span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded text-gray-600 bg-slate-100">미채점 {question.totalCount - question.gradedCount}명</span>
  )
}


function EmptyState({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-lg">
      <div className="text-center px-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-slate-100">
          <FileText size={20} className="text-slate-300" />
        </div>
        <p className="text-sm text-slate-300">{message}</p>
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
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold mb-2 text-slate-800">일괄 채점 가이드</p>
              <ol className="space-y-1 text-xs text-slate-500">
                <li>① 제공된 양식을 다운로드하여 점수를 입력해 주세요.</li>
                <li>② 파일을 저장한 뒤 업로드하면 완료됩니다.</li>
              </ol>
              <p className="text-xs mt-2 text-slate-400">양식에 오류가 1개라도 포함되어 있으면 업로드되지 않습니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 py-3 text-sm transition-colors rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              >
                <Download size={15} />
                양식 다운로드
              </button>
              <label
                className={cn(
                  'flex items-center justify-center gap-2 py-3 text-sm cursor-pointer transition-colors rounded',
                  step === 'uploading'
                    ? 'border border-blue-200 text-[#3182F6] bg-[#E8F3FF]'
                    : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                )}
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
            <div className="rounded border border-red-200">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-200 bg-red-100">
                <span className="text-xs font-semibold text-red-800">업로드 실패</span>
                <span className="text-xs truncate max-w-[200px] text-red-700" title={fileName}>{fileName}</span>
              </div>
              <div className="grid text-xs px-4 py-2 text-slate-400 border-b border-slate-100" style={{ gridTemplateColumns: '52px 1fr' }}>
                <span>위치</span>
                <span>오류 내용</span>
              </div>
              <div className="grid text-xs px-4 py-3 items-start" style={{ gridTemplateColumns: '52px 1fr' }}>
                <span className="font-medium text-slate-500">{rowLabel}</span>
                <span className="leading-relaxed text-slate-800">{rowContent}</span>
              </div>
            </div>
          )
        })()}

        {/* 미리보기 */}
        {step === 'preview' && (
          <div className="rounded border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-semibold text-slate-800">업로드 내용 확인</span>
              <span className="text-xs text-slate-400">{previewRows.length}명 · {fileName}</span>
            </div>
            {/* 표 헤더 */}
            <div className="grid text-xs px-4 py-2 text-slate-400 border-b border-slate-100" style={{ gridTemplateColumns: '1fr 1fr 48px' }}>
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
                    className="grid text-xs px-4 py-2 text-slate-800 border-b border-slate-50"
                    style={{ gridTemplateColumns: '1fr 1fr 48px' }}
                  >
                    <span className="text-center">{student?.name ?? '-'}</span>
                    <span className="text-center text-slate-500">{row.studentId}</span>
                    <span className="text-center font-medium text-[#3182F6]">{row.score}</span>
                  </div>
                )
              })}
            </div>
            {/* 적용 버튼 */}
            <div className="px-4 py-3 border-t border-slate-200">
              <button
                onClick={handleApply}
                className="w-full py-2.5 text-sm font-semibold rounded transition-colors bg-[#3182F6] hover:bg-[#1B64DA] text-white"
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
        <div className="p-3 text-sm rounded bg-slate-50 border border-slate-200 text-slate-500">
          <p>응시한 <span className="font-semibold text-slate-900">82명</span> 전원의 문제지와 제출 답안이 PDF로 생성됩니다.</p>
          <p className="text-xs mt-1 text-slate-400">감사·증빙 자료로 보관할 수 있습니다.</p>
        </div>

        {progress === 0 && (
          <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-medium py-3 rounded transition-colors">
            <FileDown size={15} />PDF 생성 시작
          </button>
        )}

        {progress > 0 && !done && (
          <div>
            <div className="flex justify-between text-xs mb-2 text-slate-500">
              <span>PDF 생성 중...</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 rounded overflow-hidden bg-slate-200">
              <div className="h-full bg-[#3182F6] rounded transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <div className="p-3 text-xs rounded flex items-center gap-2 bg-green-50 border border-green-200 text-green-700">
              <CheckCircle2 size={13} />PDF 생성 완료 (82개 답안지)
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium py-3 rounded transition-colors bg-green-700 hover:bg-green-800">
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
        <div className="p-3 text-sm rounded bg-red-50 border border-red-200 text-red-700">
          <p className="font-medium mb-1">재채점 시 주의사항</p>
          <p className="text-xs">정답 기준을 수정하면 해당 문항에 응시한 <span className="font-bold">82명 전원</span>의 점수가 즉시 재계산됩니다.</p>
          <p className="text-xs mt-1.5">자동채점 문항만 재산출되며, 수동채점(주관식·서술형) 점수는 변경되지 않습니다.</p>
          <p className="text-xs mt-1">점수 변경 시 해당 학생에게 LMS 메시지 알림이 발송됩니다.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700">변경할 정답 기준</label>
          <input
            type="text"
            defaultValue="외래키(Foreign Key)"
            className="w-full bg-white text-sm px-3 py-2 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="text-xs mt-1 text-slate-400">쉼표로 구분하면 복수 정답 처리됩니다</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-[#3182F6] border-slate-200" />
          <span className="text-sm text-slate-700">위 내용을 확인했으며, 전체 재채점을 진행합니다.</span>
        </label>

        <button
          disabled={!confirmed}
          className="w-full flex items-center justify-center gap-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded transition-colors"
        >
          <RefreshCw size={14} />재채점 실행
        </button>
      </div>
    </Modal>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
