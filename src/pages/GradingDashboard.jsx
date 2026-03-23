import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowUpDown, CheckCircle2, AlertCircle, Download, Upload, FileDown,
  ChevronDown, ChevronUp, X, BarChart3, Users, MessageSquare, RefreshCw,
  FileText, Search, Filter, Send, Bell
} from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuestions, mockStudents, QUIZ_TYPES } from '../data/mockData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SORT_OPTIONS = [
  { value: 'ungraded_first', label: '미채점 문항 우선' },
  { value: 'question_order', label: '문항 번호순' },
]

export default function GradingDashboard() {
  const { id } = useParams()
  const [selectedQ, setSelectedQ] = useState(null)
  const [sortBy, setSortBy] = useState('ungraded_first')
  const [collapsedGraded, setCollapsedGraded] = useState(true)
  const [activeTab, setActiveTab] = useState('responses') // 'responses' | 'stats'
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showRegradeModal, setShowRegradeModal] = useState(false)
  const [searchStudent, setSearchStudent] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [mobileView, setMobileView] = useState('questions') // 'questions' | 'detail'

  // 문항 정렬
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

  // 선택된 문항의 학생 응답
  const questionStudents = useMemo(() => {
    if (!selectedQ) return []
    return mockStudents.filter(s => s.submitted).filter(s =>
      searchStudent === '' ||
      s.name.includes(searchStudent) ||
      s.studentId.includes(searchStudent)
    )
  }, [selectedQ, searchStudent])

  const handleSelectAll = (checked) => {
    setSelectedStudents(checked ? questionStudents.map(s => s.id) : [])
  }

  const handleSelectQ = (q) => {
    setSelectedQ(q)
    setMobileView('detail')
    setSearchStudent('')
    setSelectedStudents([])
  }

  return (
    <Layout breadcrumbs={[
      { label: '퀴즈 관리', href: '/' },
      { label: '중간고사 - 데이터베이스 설계 및 SQL' },
      { label: '채점 대시보드' },
    ]}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-white">채점 대시보드</h1>
            <p className="text-xs text-slate-400 mt-0.5">주관식 문항 {manualQuestions.length}개 · 미채점 {ungradedQuestions.length}개</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRegradeModal(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:block">재채점</span>
            </button>
            <button
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg transition-colors"
            >
              <FileDown size={13} />
              <span>답안지 일괄 출력</span>
            </button>
          </div>
        </div>

        {/* 모바일 탭 전환 */}
        <div className="flex sm:hidden mb-4 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setMobileView('questions')}
            className={`flex-1 text-xs py-2 rounded-md transition-colors ${mobileView === 'questions' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            문항 목록
          </button>
          <button
            onClick={() => setMobileView('detail')}
            className={`flex-1 text-xs py-2 rounded-md transition-colors ${mobileView === 'detail' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            {selectedQ ? `Q${selectedQ.order} 상세` : '문항 선택'}
          </button>
        </div>

        {/* Split-pane */}
        <div className="flex gap-4 min-h-[calc(100vh-220px)]">

          {/* 좌측: 문항 목록 */}
          <aside className={`${mobileView === 'questions' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0`}>
            {/* 정렬 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">문항 목록</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="appearance-none text-xs bg-slate-800 border border-slate-700 text-slate-300 pl-2.5 pr-7 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:border-indigo-500"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ArrowUpDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
              {/* 미채점 문항 */}
              {ungradedQuestions.map(q => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  selected={selectedQ?.id === q.id}
                  onClick={() => handleSelectQ(q)}
                />
              ))}

              {/* 채점 완료 문항 (접기/펼치기) */}
              {gradedQuestions.length > 0 && (
                <div>
                  <button
                    onClick={() => setCollapsedGraded(!collapsedGraded)}
                    className="flex items-center justify-between w-full text-xs text-slate-500 py-2 px-2 hover:text-slate-400 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      채점 완료 ({gradedQuestions.length})
                    </span>
                    {collapsedGraded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                  {!collapsedGraded && gradedQuestions.map(q => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      selected={selectedQ?.id === q.id}
                      onClick={() => handleSelectQ(q)}
                      dimmed
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* 우측: 상세 패널 */}
          <div className={`${mobileView === 'detail' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col min-w-0`}>
            {!selectedQ ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col h-full">
                {/* 문항 정보 */}
                <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-4 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">Q{selectedQ.order}</span>
                        <TypeBadge type={selectedQ.type} />
                        <span className="text-xs text-slate-500">{selectedQ.points}점</span>
                        <GradeStatus question={selectedQ} />
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{selectedQ.text}</p>
                      {selectedQ.correctAnswer && (
                        <div className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                          모범 답안: {selectedQ.correctAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 탭 + 액션 */}
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex bg-slate-800/50 rounded-lg p-0.5">
                    <TabBtn active={activeTab === 'responses'} onClick={() => setActiveTab('responses')}>
                      <Users size={12} />응시 현황 ({selectedQ.totalCount})
                    </TabBtn>
                    <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
                      <BarChart3 size={12} />통계
                    </TabBtn>
                  </div>

                  {activeTab === 'responses' && (
                    <div className="flex items-center gap-2">
                      {selectedStudents.length > 0 && (
                        <button
                          onClick={() => setShowMessageModal(true)}
                          className="flex items-center gap-1.5 text-xs text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Send size={12} />
                          메시지 ({selectedStudents.length})
                        </button>
                      )}
                      <button
                        onClick={() => setShowExcelModal(true)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download size={12} />
                        엑셀 일괄 채점
                      </button>
                    </div>
                  )}
                </div>

                {/* 탭 컨텐츠 */}
                {activeTab === 'responses' ? (
                  <ResponsesTab
                    question={selectedQ}
                    students={questionStudents}
                    search={searchStudent}
                    onSearch={setSearchStudent}
                    selected={selectedStudents}
                    onSelect={setSelectedStudents}
                    onSelectAll={handleSelectAll}
                  />
                ) : (
                  <StatsTab question={selectedQ} students={mockStudents} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {showExcelModal && <ExcelModal question={selectedQ} onClose={() => setShowExcelModal(false)} />}
      {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}
      {showRegradeModal && <RegradeModal onClose={() => setShowRegradeModal(false)} />}
      {showMessageModal && (
        <MessageModal
          count={selectedStudents.length}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </Layout>
  )
}

// ── 문항 아이템 ──────────────────────────────
function QuestionItem({ question, selected, onClick, dimmed }) {
  const isComplete = question.gradedCount >= question.totalCount
  const progress = Math.round((question.gradedCount / question.totalCount) * 100)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected
          ? 'border-indigo-500/50 bg-indigo-500/10'
          : dimmed
          ? 'border-slate-800/50 bg-[#1a1d27]/50 hover:border-slate-700'
          : 'border-slate-800 bg-[#1a1d27] hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${selected ? 'text-indigo-400' : 'text-slate-400'}`}>
              Q{question.order}
            </span>
            <TypeBadge type={question.type} small />
            {isComplete && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 size={10} />완료
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed line-clamp-2 ${dimmed ? 'text-slate-500' : 'text-slate-300'}`}>
            {question.text}
          </p>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{question.points}점</span>
      </div>

      {!isComplete && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{question.gradedCount}/{question.totalCount}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

// ── 응시 현황 탭 ─────────────────────────────
function ResponsesTab({ question, students, search, onSearch, selected, onSelect, onSelectAll }) {
  const gradedStudents = students.filter(s => s.score !== null)
  const ungradedStudents = students.filter(s => s.score === null)
  const allSelected = students.length > 0 && selected.length === students.length

  return (
    <div className="flex-1 bg-[#1a1d27] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* 검색 + 전체선택 */}
      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={e => onSelectAll(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30"
          />
        </label>
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="학생 이름 또는 학번 검색"
            className="w-full bg-slate-800/50 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 shrink-0">{students.length}명</span>
      </div>

      {/* 학생 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* 미채점 */}
        {ungradedStudents.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/5 border-b border-slate-800 flex items-center gap-1.5">
              <AlertCircle size={11} />
              미채점 ({ungradedStudents.length}명)
            </div>
            {ungradedStudents.map(s => (
              <StudentRow key={s.id} student={s} selected={selected.includes(s.id)}
                onSelect={(checked) => onSelect(prev => checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
              />
            ))}
          </div>
        )}

        {/* 채점 완료 */}
        {gradedStudents.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/5 border-b border-slate-800 flex items-center gap-1.5">
              <CheckCircle2 size={11} />
              채점 완료 ({gradedStudents.length}명)
            </div>
            {gradedStudents.map(s => (
              <StudentRow key={s.id} student={s} selected={selected.includes(s.id)}
                onSelect={(checked) => onSelect(prev => checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentRow({ student, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const isGraded = student.score !== null

  return (
    <div className={`border-b border-slate-800/50 ${selected ? 'bg-indigo-500/5' : 'hover:bg-slate-800/30'} transition-colors`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(e.target.checked)}
          className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 shrink-0"
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 shrink-0">
                {student.name[0]}
              </div>
              <div className="min-w-0">
                <span className="text-sm text-slate-200 font-medium">{student.name}</span>
                <span className="text-xs text-slate-500 ml-1.5">{student.studentId}</span>
              </div>
              <span className="text-xs text-slate-500 hidden sm:block">{student.department}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isGraded ? (
                <span className="text-sm font-bold text-emerald-400">{student.score}점</span>
              ) : (
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">미채점</span>
              )}
              {expanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 ml-9">
          <div className="bg-slate-800/50 rounded-lg p-3 text-xs">
            <div className="text-slate-400 mb-1.5 font-medium">제출 답안</div>
            <p className="text-slate-300 leading-relaxed">{student.response}</p>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
              <span className="text-slate-500">제출: {student.endTime || '-'}</span>
              {!isGraded && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="점수"
                    className="w-16 bg-slate-700 border border-slate-600 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-indigo-500 text-center"
                  />
                  <button className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded transition-colors">
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

// ── 통계 탭 ──────────────────────────────────
function StatsTab({ question, students }) {
  const gradedStudents = students.filter(s => s.score !== null)
  const scores = gradedStudents.map(s => s.score)
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
  const max = scores.length ? Math.max(...scores) : '-'
  const min = scores.length ? Math.min(...scores) : '-'

  // 점수 분포 (구간별)
  const distribution = Array.from({ length: Math.ceil(question.points / 2) }, (_, i) => {
    const low = i * 2
    const high = Math.min(low + 2, question.points)
    return {
      range: `${low}-${high}`,
      count: scores.filter(s => s >= low && s < high + (i === Math.ceil(question.points / 2) - 1 ? 1 : 0)).length,
    }
  })

  return (
    <div className="flex-1 bg-[#1a1d27] border border-slate-800 rounded-xl p-4 overflow-y-auto scrollbar-thin">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="평균 점수" value={avg} unit="점" accent />
        <StatCard label="최고 점수" value={max} unit="점" />
        <StatCard label="채점 완료" value={gradedStudents.length} unit={`/ ${students.length}명`} />
      </div>

      {/* 분포 차트 */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 mb-3">점수 분포</h3>
        {gradedStudents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">채점 완료된 학생이 없습니다</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e2130', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((_, i) => (
                  <Cell key={i} fill={i === Math.floor(distribution.length / 2) ? '#6366f1' : '#334155'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-indigo-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{unit}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────
function TypeBadge({ type, small }) {
  const cfg = QUIZ_TYPES[type] || { label: type, color: 'bg-slate-500/20 text-slate-400' }
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium ${cfg.color} ${small ? 'text-[10px]' : ''}`}>
      {cfg.label}
    </span>
  )
}

function GradeStatus({ question }) {
  const complete = question.gradedCount >= question.totalCount
  if (complete) {
    return (
      <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
        <CheckCircle2 size={10} />채점 완료
      </span>
    )
  }
  return (
    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
      <AlertCircle size={10} />미채점 {question.totalCount - question.gradedCount}명
    </span>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
        active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1a1d27] border border-slate-800 rounded-xl">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <FileText size={20} className="text-slate-600" />
        </div>
        <p className="text-sm text-slate-400">문항을 선택하면 응시 현황과 통계를 볼 수 있습니다</p>
      </div>
    </div>
  )
}

// ── 모달: 엑셀 채점 ───────────────────────────
function ExcelModal({ question, onClose }) {
  const [step, setStep] = useState('idle') // idle | downloading | uploading | error | success
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = () => {
    setStep('downloading')
    setTimeout(() => setStep('idle'), 1500)
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('uploading')
    setTimeout(() => {
      // 시뮬레이션: 10% 확률로 오류
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
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
          <p className="font-medium text-slate-300 mb-1">Q{question?.order}. {question?.type === 'essay' ? '서술형' : '단답형'} 일괄 채점</p>
          <p>① 엑셀 파일을 다운로드합니다</p>
          <p>② 점수 열에 각 학생의 점수를 입력합니다 (0 ~ {question?.points}점)</p>
          <p>③ 저장 후 파일을 업로드합니다</p>
          <p className="text-amber-400 mt-2">오류가 1개라도 있으면 전체 업로드가 취소됩니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className={`flex items-center justify-center gap-2 border rounded-lg py-3 text-sm transition-colors ${
              step === 'downloading'
                ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Download size={15} />
            {step === 'downloading' ? '다운로드 중...' : '엑셀 다운로드'}
          </button>

          <label className={`flex items-center justify-center gap-2 border rounded-lg py-3 text-sm cursor-pointer transition-colors ${
            step === 'uploading'
              ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}>
            <Upload size={15} />
            {step === 'uploading' ? '업로드 중...' : '파일 업로드'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {step === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
            <div className="font-medium mb-1 flex items-center gap-1.5"><AlertCircle size={13} />업로드 실패</div>
            <p>{errorMsg}</p>
            <button className="mt-2 text-red-300 hover:text-red-200 underline" onClick={() => setStep('idle')}>
              다시 시도
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-400">
            <div className="font-medium flex items-center gap-1.5"><CheckCircle2 size={13} />채점 완료</div>
            <p className="mt-1">82명의 점수가 성공적으로 반영되었습니다.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── 모달: PDF 출력 ────────────────────────────
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
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
          <p>응시한 <span className="text-white font-medium">82명</span> 전원의 문제지 + 제출 답안이 하나의 PDF로 생성됩니다.</p>
          <p className="mt-1">감사·증빙 자료로 보관할 수 있습니다.</p>
        </div>

        {progress === 0 && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-3 rounded-lg transition-colors"
          >
            <FileDown size={15} />
            PDF 생성 시작
          </button>
        )}

        {progress > 0 && !done && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>PDF 생성 중...</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">82개 답안지를 병합하고 있습니다...</p>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={13} />
              PDF 생성 완료 (82개 답안지, 총 247페이지)
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-3 rounded-lg transition-colors">
              <Download size={15} />
              다운로드
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── 모달: 재채점 ──────────────────────────────
function RegradeModal({ onClose }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Modal onClose={onClose} title="재채점">
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
          <p className="font-medium mb-1">재채점 시 주의사항</p>
          <p>정답 기준을 수정하면 해당 문항에 응시한 <span className="font-bold">82명 전원</span>의 점수가 즉시 재계산됩니다.</p>
          <p className="mt-1">점수 변경 시 학생에게 LMS 메시지 알림이 발송됩니다.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">변경할 정답 기준</label>
          <input
            type="text"
            defaultValue="외래키(Foreign Key)"
            className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-1">쉼표로 구분하면 복수 정답 처리됩니다 (예: 외래키, FK, Foreign Key)</p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30" />
          <span className="text-xs text-slate-300">위 내용을 확인했으며, 전체 재채점을 진행합니다.</span>
        </label>

        <button
          disabled={!confirmed}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          재채점 실행
        </button>
      </div>
    </Modal>
  )
}

// ── 모달: 메시지 발송 ─────────────────────────
function MessageModal({ count, onClose }) {
  const [sent, setSent] = useState(false)
  return (
    <Modal onClose={onClose} title={`메시지 발송 (${count}명)`}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">메시지 내용</label>
          <textarea
            rows={4}
            placeholder="학생들에게 전달할 내용을 입력하세요..."
            className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2">
            <Bell size={12} />
            {count}명에게 LMS 메시지가 발송되었습니다.
          </div>
        ) : (
          <button
            onClick={() => setSent(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <Send size={14} />
            발송하기
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── 공통 모달 래퍼 ────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a1d27] border border-slate-700 rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
