import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, AlertCircle, Download, FileDown,
  ChevronDown, ChevronUp, BarChart3, Users,
  FileText, Search, FileEdit, UserCheck, Printer
} from 'lucide-react'
import Layout from '../../components/Layout'
import { getQuizStudents, mockQuizzes, getQuizQuestions, getStudentAnswer } from '../../data/mockData'
import { downloadAnswerSheetsXlsx } from '../../utils/excelUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import ConditionalRetakeModal from '../../components/ConditionalRetakeModal'
import StatusBadge from '../../components/StatusBadge'
import { printQuizQuestions, printBulkAnswerSheets } from '../../utils/pdfUtils'
import { DropdownSelect } from '../../components/DropdownSelect'
import { getLocalGrades, SORT_OPTIONS } from './utils'
import QuestionItem from './QuestionItem'
import QuestionDetailPanel from './QuestionDetailPanel'
import StudentListItem from './StudentListItem'
import StudentDetailPanel from './StudentDetailPanel'
import ExcelModal from './ExcelModal'
import EmptyState from './EmptyState'


export default function GradingDashboard() {
  const { id } = useParams()
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
  const [showRetakeModal, setShowRetakeModal] = useState(false)
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

  // PDF 생성 진행 상태
  const [pdfGenerating, setPdfGenerating] = useState(null)

  const handlePdfDownload = useCallback(async (type, fn) => {
    setPdfGenerating(type)
    try {
      await fn()
      showToast(`${type} PDF 다운로드 완료`)
    } catch (err) {
      console.error('PDF 생성 실패:', err)
      showToast('PDF 생성 중 오류가 발생했습니다')
    } finally {
      setPdfGenerating(null)
    }
  }, [showToast])

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

  // 학생 중심 - 전체 학생 목록 (미제출 포함)
  const allStudents = useMemo(() => {
    return quizStudents.filter(s => {
      if (studentSearch !== '' && !s.name.includes(studentSearch) && !s.studentId.includes(studentSearch)) return false
      return true
    })
  }, [studentSearch, quizStudents])

  const submittedStudents = allStudents.filter(s => s.submitted)
  const unsubmittedStudents = allStudents.filter(s => !s.submitted)
  const gradedStudentList = submittedStudents.filter(s => s.score !== null)
  const ungradedStudentList = submittedStudents.filter(s => s.score === null)

  const handleSelectQ = (q) => {
    setSelectedQ(q)
    setMobileView('detail')
    setSearchStudent('')
  }

  const handleSelectStudent = (s) => {
    setSelectedStudent(s)
    setMobileView('detail')
  }

  // 학생 중심 탭: 첫 번째 제출 학생 자동 선택
  useEffect(() => {
    if (gradingMode === 'student' && !selectedStudent) {
      const first = submittedStudents[0] || allStudents[0]
      if (first) setSelectedStudent(first)
    }
  }, [gradingMode, submittedStudents, allStudents]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 유효하지 않은 quiz id ──
  if (!QUIZ_INFO) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-700" />
          <p className="text-sm font-medium mb-1 text-slate-900">퀴즈를 찾을 수 없습니다</p>
          <Link to="/" className="text-xs text-primary hover:underline">퀴즈 목록으로 돌아가기</Link>
        </div>
      </Layout>
    )
  }

  // ── draft 퀴즈 ──
  if (QUIZ_INFO.status === 'draft') {
    return (
      <Layout breadcrumbs={[
        { label: '퀴즈 관리', href: '/' },
        { label: QUIZ_INFO.title },
        { label: '채점 대시보드' },
      ]}>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-accent">
            <FileEdit size={24} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">아직 응시가 시작되지 않았습니다</h3>
          <p className="text-sm mb-6 text-gray-500">
            이 퀴즈는 임시저장 상태입니다. 퀴즈를 공개하면 학생이 응시할 수 있습니다.
          </p>
          <Button asChild>
            <Link to={`/quiz/${QUIZ_INFO.id}/edit`}>
              <FileEdit size={14} />
              퀴즈 편집하기
            </Link>
          </Button>
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
      <div className="pt-4 pb-6">

        {/* ── 퀴즈 정보 카드 ── */}
        <div className="mb-5 overflow-hidden bg-card rounded-2xl shadow-md">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-accent text-primary">
                    {QUIZ_INFO.week}주차 {QUIZ_INFO.session}차시
                  </span>
                  <StatusBadge status={QUIZ_INFO.status} className="px-2.5 py-1 rounded-full font-semibold" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground mb-1.5">{QUIZ_INFO.title}</h2>
                <p className="text-sm text-muted-foreground mb-2">{QUIZ_INFO.startDate} ~ {QUIZ_INFO.dueDate}</p>
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
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-primary">
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

              <div className="flex items-stretch shrink-0 overflow-hidden rounded-[14px] bg-background">
                <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[90px]">
                  <p className="text-xs mb-2 text-muted-foreground">제출률</p>
                  <p className="text-2xl leading-none font-extrabold text-primary">{submitRate}%</p>
                </div>
                <div className="w-px bg-border" />
                <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[110px]">
                  <p className="text-xs mb-2 text-muted-foreground">제출 인원</p>
                  <p className="text-2xl leading-none font-extrabold text-foreground">
                    {QUIZ_INFO.submitted}<span className="text-sm ml-1 font-normal text-muted-foreground">/ {QUIZ_INFO.totalStudents}명</span>
                  </p>
                </div>
                <div className="w-px bg-border" />
                <div className="flex flex-col justify-center px-5 py-4 text-center min-w-[110px]">
                  <p className="text-xs mb-2 text-muted-foreground">채점 완료</p>
                  <p className="text-2xl leading-none font-extrabold text-foreground">
                    {QUIZ_INFO.graded}<span className="text-sm ml-1 font-normal text-muted-foreground">/ {QUIZ_INFO.submitted}명</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 채점 진행률 */}
            <div className="mt-4 pt-4 border-t border-secondary">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">채점 진행률</span>
                <span className="font-bold text-primary">{gradeProgress}%</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden bg-border">
                <div
                  className="h-full rounded-full transition-all bg-primary"
                  style={{ width: `${gradeProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 액션 바 ── */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center p-0.5 gap-0.5 rounded-lg bg-border">
            {[
              { mode: 'question', icon: FileText, label: '문항 중심' },
              { mode: 'student',  icon: Users,    label: '학생 중심' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => { setGradingMode(mode); setMobileView('questions') }}
                className={cn(
                  'flex items-center gap-1.5 text-sm px-4 py-2 rounded-md transition-all',
                  gradingMode === mode
                    ? 'bg-white text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-secondary-foreground'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" onClick={() => setShowRetakeModal(true)}>
              <UserCheck size={14} />
              <span className="hidden sm:block">조건부 재응시</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download size={14} />
                  <span className="hidden sm:block">내보내기</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 border-0 rounded-xl shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground">문제지</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handlePdfDownload('문제지', () => printQuizQuestions(QUIZ_INFO, quizQuestions))}
                  disabled={!!pdfGenerating}
                >
                  <Printer size={14} className="text-muted-foreground" />
                  문제지 PDF 다운로드
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">답안지</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => downloadAnswerSheetsXlsx(QUIZ_INFO, quizStudents.filter(s => s.submitted), quizQuestions, { getStudentAnswer })}
                >
                  <FileDown size={14} className="text-muted-foreground" />
                  답안지 Excel 다운로드
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePdfDownload('답안지', () => {
                    const submitted = quizStudents.filter(s => s.submitted)
                    return printBulkAnswerSheets(QUIZ_INFO, quizQuestions, submitted, (student, qId) => {
                      return student.selections?.[qId] ?? getStudentAnswer(parseInt(student.id.replace(/\D/g, '')), qId)
                    })
                  })}
                  disabled={!!pdfGenerating}
                >
                  <Printer size={14} className="text-muted-foreground" />
                  답안지 PDF 일괄 다운로드
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Button asChild>
              <Link to={`/quiz/${QUIZ_INFO.id}/stats`}>
                <BarChart3 size={14} />
                <span className="hidden sm:block">퀴즈 통계</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* ── 모바일 탭 전환 ── */}
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

        {/* ── Split-pane ── */}
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
                      <Button
                        variant="ghost"
                        size="xs"
                        className="w-full justify-between px-1 text-[11px] text-gray-600 hover:text-gray-900"
                        onClick={() => setCollapsedGraded(!collapsedGraded)}
                      >
                        <span>채점 완료 ({gradedQuestions.length})</span>
                        {collapsedGraded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
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
                    questionsModifiedAt={questionsModifiedAt}
                    showToast={showToast}
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
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 bg-white flex flex-col gap-2">
                  {ungradedStudentList.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-secondary-foreground">미채점</span>
                        <span className="text-xs text-caption">{ungradedStudentList.length}명</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div>
                        {ungradedStudentList.map(s => (
                          <StudentListItem key={s.id} student={s} selected={selectedStudent?.id === s.id} onClick={() => handleSelectStudent(s)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {gradedStudentList.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-secondary-foreground">채점 완료</span>
                        <span className="text-xs text-caption">{gradedStudentList.length}명</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div>
                        {gradedStudentList.map(s => (
                          <StudentListItem key={s.id} student={s} selected={selectedStudent?.id === s.id} onClick={() => handleSelectStudent(s)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {unsubmittedStudents.length > 0 && (
                    <div>
                      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">미제출</span>
                        <span className="text-xs text-caption">{unsubmittedStudents.length}명</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div>
                        {unsubmittedStudents.map(s => (
                          <StudentListItem key={s.id} student={s} selected={selectedStudent?.id === s.id} onClick={() => handleSelectStudent(s)} />
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

      {/* ── 모달 ── */}
      {showExcelModal && (
        <ExcelModal
          question={selectedQ}
          students={quizStudents}
          quizId={id}
          onClose={() => setShowExcelModal(false)}
          onApplied={(rows) => { setShowExcelModal(false); setExcelRows(rows) }}
        />
      )}

      <ConditionalRetakeModal
        open={showRetakeModal}
        onOpenChange={setShowRetakeModal}
        quizId={id}
        quizInfo={QUIZ_INFO}
        students={quizStudents}
        onComplete={(count, attempts) => showToast(`${count}명에게 재응시 ${attempts}회를 부여했습니다.`)}
      />

      {/* ── 토스트 ── */}
      {pdfGenerating && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 text-sm rounded-xl shadow-lg bg-foreground text-white">
          <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" className="stroke-secondary-foreground" strokeWidth="2" />
            <path d="M14.5 8a6.5 6.5 0 00-6.5-6.5" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-medium">{pdfGenerating} PDF 생성 진행중</span>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 text-sm rounded-xl shadow-lg bg-foreground text-white">
          <CheckCircle2 size={15} className="shrink-0 text-blue-300" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </Layout>
  )
}
