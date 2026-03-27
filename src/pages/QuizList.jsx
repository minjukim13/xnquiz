import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Clock, FileText, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes } from '../data/mockData'
import { useRole } from '../context/RoleContext'
import { getStudentAttempts } from '../data/mockData'

// 상태 표시 우선순위: draft(작성중) > open(진행중) > closed(종료)
const STATUS_SORT = { draft: 0, open: 1, closed: 2 }

const STATUS_CONFIG = {
  open:    { label: '진행중', badge: 'text-[#018600]',  bgStyle: { background: '#E5FCE3' } },
  grading: { label: '채점중', badge: 'text-[#B43200]',  bgStyle: { background: '#FFF6F2' } },
  closed:  { label: '종료',   badge: 'text-[#616161]',  bgStyle: { background: '#F5F5F5' } },
  draft:   { label: '초안',   badge: 'text-indigo-600', bgStyle: { background: '#EEF2FF' } },
}

export default function QuizList() {
  const { role } = useRole()
  return role === 'student' ? <StudentQuizList /> : <InstructorQuizList />
}

// ─────────────────────────────── 교수자 뷰 ───────────────────────────────
function InstructorQuizList() {
  const [quizzes, setQuizzes] = useState(() => [...mockQuizzes])

  const handlePublishQuiz = (quizId) => {
    // draft → open 전환
    const idx = quizzes.findIndex(q => q.id === quizId)
    if (idx === -1) return
    const updated = [...quizzes]
    updated[idx] = { ...updated[idx], status: 'open' }
    mockQuizzes[mockQuizzes.findIndex(q => q.id === quizId)] = updated[idx]
    setQuizzes(updated)
  }

  const gradingQuizzes = quizzes.filter(q => q.status === 'grading')
  const otherQuizzes   = quizzes
    .filter(q => q.status !== 'grading')
    .sort((a, b) => (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99))

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 xl:px-16 py-10">

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: '#9E9E9E' }}>CS301 데이터베이스 · 2026년 1학기</p>
            <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>퀴즈 관리</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/quiz/new" className="btn-primary">
              <Plus size={14} />
              새 퀴즈
            </Link>
          </div>
        </div>

        {gradingQuizzes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold" style={{ color: '#B43200' }}>채점 필요 {gradingQuizzes.length}건</p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {gradingQuizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} onPublishQuiz={handlePublishQuiz} />
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="text-xs font-semibold mb-3" style={{ color: '#9E9E9E' }}>
            전체 퀴즈 ({otherQuizzes.length})
          </p>
          <div className="grid gap-3 xl:grid-cols-2">
            {otherQuizzes.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} onPublishQuiz={handlePublishQuiz} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

function QuizCard({ quiz, onPublishQuiz }) {
  const cfg = STATUS_CONFIG[quiz.status]
  const [confirmPublish, setConfirmPublish] = useState(false)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}
              style={cfg.bgStyle}
            >
              {cfg.label}
            </span>
            <span className="text-xs" style={{ color: '#9E9E9E' }}>{quiz.week}주차 {quiz.session}차시</span>
            {quiz.status === 'draft' && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ color: '#9E9E9E', background: '#F5F5F5' }}>미발행</span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug mb-1 truncate" style={{ color: '#222222' }}>{quiz.title}</h3>
          <p className="text-xs" style={{ color: '#9E9E9E' }}>{quiz.startDate} ~ {quiz.dueDate}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {quiz.status === 'grading' && (
            <Link
              to={`/quiz/${quiz.id}/grade`}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded transition-colors"
            >
              채점하기
            </Link>
          )}
          {quiz.status === 'closed' ? (
            <Link
              to={`/quiz/${quiz.id}/stats`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3.5 py-2 rounded transition-colors"
              style={{ border: '1px solid #c7d2fe' }}
            >
              결과 보기
            </Link>
          ) : (
            <>
              {/* draft 퀴즈 발행 버튼 */}
              {quiz.status === 'draft' && !confirmPublish && (
                <button
                  onClick={() => setConfirmPublish(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded transition-colors"
                  style={{ color: '#018600', border: '1px solid #b7f0b3' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E5FCE3' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Send size={12} />
                  발행
                </button>
              )}
              {quiz.status === 'draft' && confirmPublish && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#616161' }}>발행할까요?</span>
                  <button
                    onClick={() => { onPublishQuiz(quiz.id); setConfirmPublish(false) }}
                    className="text-xs font-semibold text-white px-2.5 py-1.5 rounded transition-colors"
                    style={{ background: '#018600' }}
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setConfirmPublish(false)}
                    className="text-xs px-2 py-1.5 rounded"
                    style={{ color: '#616161', border: '1px solid #E0E0E0' }}
                  >
                    취소
                  </button>
                </div>
              )}
              {quiz.status !== 'draft' && (
                <Link
                  to={`/quiz/${quiz.id}/stats`}
                  className="text-xs font-medium px-3 py-2 rounded transition-colors"
                  style={{ color: '#616161' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  통계
                </Link>
              )}
              <Link
                to={`/quiz/${quiz.id}/edit`}
                className="text-xs font-medium px-3 py-2 rounded transition-colors"
                style={{ color: '#616161' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                편집
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-3.5" style={{ background: '#FAFAFA', borderTop: '1px solid #EEEEEE' }}>
        {quiz.status === 'closed'
          ? <ClosedSummary quiz={quiz} />
          : <ActiveStats quiz={quiz} />
        }
      </div>
    </div>
  )
}

function ClosedSummary({ quiz }) {
  const submitRate  = Math.round((quiz.submitted / quiz.totalStudents) * 100)
  const unsubmitted = quiz.totalStudents - quiz.submitted

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {quiz.avgScore != null && (
        <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-bold" style={{ color: '#222222' }}>{quiz.avgScore}</span>
          <span className="text-xs" style={{ color: '#9E9E9E' }}>/ {quiz.totalPoints}점 평균</span>
        </div>
      )}
      <div className="w-px h-4 shrink-0" style={{ background: '#EEEEEE' }} />
      <StatChip label="응시율" value={`${submitRate}%`} sub={`${quiz.submitted}명`} />
      <StatChip label="채점 완료" value={`${quiz.graded}명`} />
      {unsubmitted > 0 && <StatChip label="미제출" value={`${unsubmitted}명`} muted />}
    </div>
  )
}

function ActiveStats({ quiz }) {
  // localStorage에서 신규 응시 데이터 반영
  const newAttempts = getStudentAttempts(quiz.id)
  const submitted = quiz.submitted + newAttempts.length
  const graded = quiz.graded + newAttempts.length // 자동채점이므로 즉시 채점 완료

  const gradeProgress = submitted > 0 ? Math.round((graded / submitted) * 100) : 0
  const submitRate    = Math.round((submitted / quiz.totalStudents) * 100)
  const unsubmitted   = Math.max(0, quiz.totalStudents - submitted)

  return (
    <>
      <div className="grid grid-cols-4">
        {[
          { label: '제출',      value: submitted,    sub: `${submitRate}%`,  styleColor: '#222222' },
          { label: '미제출',    value: unsubmitted,   sub: null,             styleColor: unsubmitted > 0 && quiz.status !== 'closed' ? '#B43200' : '#222222' },
          { label: '채점 완료', value: graded,        sub: null,             styleColor: '#018600' },
          { label: '미채점',    value: quiz.pendingGrade, sub: null,         styleColor: quiz.pendingGrade > 0 ? '#B43200' : '#222222' },
        ].map((item, idx) => (
          <div key={item.label} className="text-center px-2 first:pl-0 last:pr-0" style={idx < 3 ? { borderRight: '1px solid #EEEEEE' } : {}}>
            <p className="text-[17px] font-bold leading-none" style={{ color: item.styleColor }}>
              {item.value}
              {item.sub && (
                <span className="text-[11px] font-medium ml-1" style={{ color: '#9E9E9E' }}>{item.sub}</span>
              )}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#9E9E9E' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {quiz.status === 'grading' && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs" style={{ color: '#9E9E9E' }}>채점 진행률</span>
            <span className="text-xs font-semibold" style={{ color: '#424242' }}>{gradeProgress}%</span>
          </div>
          <div className="h-[4px] rounded overflow-hidden" style={{ background: '#EEEEEE' }}>
            <div
              className="h-full rounded transition-all bg-indigo-500"
              style={{ width: `${gradeProgress}%` }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function StatChip({ label, value, sub, muted }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-semibold" style={{ color: muted ? '#BDBDBD' : '#424242' }}>{value}</span>
      {sub && <span className="text-xs font-medium" style={{ color: '#9E9E9E' }}>{sub}</span>}
      <span className="text-xs" style={{ color: '#9E9E9E' }}>{label}</span>
    </div>
  )
}

// ─────────────────────────────── 학생 뷰 ───────────────────────────────
function StudentQuizList() {
  const { currentStudent } = useRole()
  const openQuizzes    = mockQuizzes.filter(q => q.status === 'open')
  const gradingQuizzes = mockQuizzes.filter(q => q.status === 'grading')
  const closedQuizzes  = mockQuizzes.filter(q => q.status === 'closed')
  const hasAny = openQuizzes.length + gradingQuizzes.length + closedQuizzes.length > 0

  return (
    <Layout>
      <div className="max-w-[760px] mx-auto px-6 sm:px-10 py-10">
        <div className="mb-8">
          <p className="text-xs font-medium mb-1" style={{ color: '#9E9E9E' }}>CS301 데이터베이스 · 2026년 1학기</p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#222222' }}>내 퀴즈</h1>
          <p className="text-sm" style={{ color: '#616161' }}>안녕하세요, {currentStudent.name}님</p>
        </div>

        {/* 응시 가능한 퀴즈 */}
        {openQuizzes.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold mb-3" style={{ color: '#018600' }}>응시 가능 ({openQuizzes.length})</p>
            <div className="space-y-3">
              {openQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {/* 채점 중인 퀴즈 */}
        {gradingQuizzes.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold mb-3" style={{ color: '#B43200' }}>채점 중 ({gradingQuizzes.length})</p>
            <div className="space-y-3">
              {gradingQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {/* 종료된 퀴즈 */}
        {closedQuizzes.length > 0 && (
          <section>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9E9E9E' }}>종료 ({closedQuizzes.length})</p>
            <div className="space-y-3">
              {closedQuizzes.map(quiz => (
                <StudentQuizCard key={quiz.id} quiz={quiz} studentId={currentStudent.id} />
              ))}
            </div>
          </section>
        )}

        {!hasAny && (
          <div className="text-center py-16" style={{ color: '#9E9E9E' }}>
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">현재 응시 가능한 퀴즈가 없습니다.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StudentQuizCard({ quiz, studentId }) {
  const attempts = getStudentAttempts(quiz.id)
  const myAttempt = attempts.find(a => a.studentId === studentId)
  const isOpen    = quiz.status === 'open'
  const isGrading = quiz.status === 'grading'
  const isClosed  = quiz.status === 'closed'

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* 배지 */}
              {isOpen && !myAttempt && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#E5FCE3', color: '#018600' }}>응시 가능</span>
              )}
              {isOpen && myAttempt && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: '#EEF2FF', color: '#4f46e5' }}>
                  <CheckCircle2 size={11} />제출 완료
                </span>
              )}
              {isGrading && myAttempt && myAttempt.manualPending > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#FFF6F2', color: '#B43200' }}>채점 중</span>
              )}
              {isGrading && myAttempt && !myAttempt.manualPending && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: '#EEF2FF', color: '#4f46e5' }}>
                  <CheckCircle2 size={11} />채점 완료
                </span>
              )}
              {isGrading && !myAttempt && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>미제출 마감</span>
              )}
              {isClosed && myAttempt && myAttempt.manualPending > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#FFF6F2', color: '#B43200' }}>채점 중</span>
              )}
              {isClosed && myAttempt && !myAttempt.manualPending && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: '#EEF2FF', color: '#4f46e5' }}>
                  <CheckCircle2 size={11} />채점 완료
                </span>
              )}
              {isClosed && !myAttempt && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>종료</span>
              )}
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{quiz.week}주차 {quiz.session}차시</span>
            </div>
            <h3 className="text-[15px] font-semibold mb-1 truncate" style={{ color: '#222222' }}>{quiz.title}</h3>
            <div className="flex items-center gap-3 text-xs" style={{ color: '#9E9E9E' }}>
              <span className="flex items-center gap-1"><Clock size={11} />{quiz.timeLimit ?? 30}분</span>
              <span>{quiz.questions}문항 · {quiz.totalPoints}점</span>
              <span>마감 {quiz.dueDate}</span>
            </div>
          </div>

          <div className="shrink-0">
            {isOpen && !myAttempt && (
              <Link
                to={`/quiz/${quiz.id}/attempt`}
                className="text-xs font-semibold text-white px-4 py-2 rounded transition-colors"
                style={{ background: '#4f46e5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
              >
                응시하기
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 제출 결과 미리보기 */}
      {myAttempt && (
        <div className="px-5 py-3" style={{ background: '#F5F7FF', borderTop: '1px solid #E8EBFF' }}>
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: '#4f46e5', fontWeight: 600 }}>
              {myAttempt.totalAutoScore}점 / {myAttempt.totalPossibleAuto}점 (자동채점)
            </span>
            {myAttempt.manualPending > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                <AlertCircle size={11} />
                수동채점 {myAttempt.manualPending}문항 대기 중
              </span>
            )}
            <span style={{ color: '#9E9E9E' }}>제출 {myAttempt.submittedAt}</span>
          </div>
        </div>
      )}
    </div>
  )
}
