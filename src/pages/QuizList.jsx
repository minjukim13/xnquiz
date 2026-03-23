import { Link } from 'react-router-dom'
import { Plus, Clock, CheckCircle2, AlertCircle, FileEdit, Users, HelpCircle, ChevronRight } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes } from '../data/mockData'

const STATUS_CONFIG = {
  open: { label: '진행중', icon: Clock, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  grading: { label: '채점중', icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  closed: { label: '종료', icon: CheckCircle2, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  draft: { label: '초안', icon: FileEdit, color: 'text-slate-500 bg-slate-800 border-slate-700' },
}

export default function QuizList() {
  const gradingQuizzes = mockQuizzes.filter(q => q.status === 'grading')
  const otherQuizzes = mockQuizzes.filter(q => q.status !== 'grading')

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">퀴즈 관리</h1>
            <p className="text-sm text-slate-400 mt-1">CS301 데이터베이스 · 2026년 1학기</p>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0">
            <Plus size={16} />
            <span className="hidden sm:block">새 퀴즈</span>
          </button>
        </div>

        {/* 채점 필요 섹션 */}
        {gradingQuizzes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-amber-400" />
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">채점 필요</h2>
            </div>
            <div className="grid gap-3">
              {gradingQuizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} highlight />)}
            </div>
          </section>
        )}

        {/* 전체 퀴즈 */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">전체 퀴즈</h2>
          <div className="grid gap-3">
            {otherQuizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)}
          </div>
        </section>
      </div>
    </Layout>
  )
}

function QuizCard({ quiz, highlight }) {
  const cfg = STATUS_CONFIG[quiz.status]
  const Icon = cfg.icon
  const gradeProgress = quiz.submitted > 0 ? Math.round((quiz.graded / quiz.submitted) * 100) : 0

  return (
    <div className={`rounded-xl border bg-[#1a1d27] p-4 sm:p-5 transition-all ${highlight ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* 상태 + 제목 */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
              <Icon size={11} />
              {cfg.label}
            </span>
            {!quiz.published && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">미발행</span>
            )}
          </div>
          <h3 className="font-medium text-white text-sm sm:text-base leading-snug mb-1 truncate">{quiz.title}</h3>
          <p className="text-xs text-slate-500">{quiz.course} · 마감 {quiz.dueDate}</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          {quiz.status === 'grading' && (
            <Link
              to={`/quiz/${quiz.id}/grade`}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              채점하기
              <ChevronRight size={12} />
            </Link>
          )}
          <Link
            to={`/quiz/${quiz.id}/edit`}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <FileEdit size={15} />
          </Link>
        </div>
      </div>

      {/* 통계 바 */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t border-slate-800 pt-4">
        <Stat label="수강생" value={quiz.totalStudents} icon={<Users size={13} />} />
        <Stat label="제출" value={`${quiz.submitted}명`} sub={`${Math.round((quiz.submitted / quiz.totalStudents) * 100)}%`} />
        <Stat label="채점 완료" value={`${quiz.graded}명`} sub={quiz.pendingGrade > 0 ? `미채점 ${quiz.pendingGrade}` : '완료'} accent={quiz.pendingGrade > 0} />
      </div>

      {/* 채점 진행바 */}
      {quiz.status === 'grading' && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>채점 진행률</span>
            <span>{gradeProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${gradeProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, icon, accent }) {
  return (
    <div>
      <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${accent ? 'text-amber-400' : 'text-white'}`}>
        {icon}
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className={`text-xs mt-0.5 ${accent ? 'text-amber-500' : 'text-slate-500'}`}>{sub}</div>}
    </div>
  )
}
