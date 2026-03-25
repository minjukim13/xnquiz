import { Link } from 'react-router-dom'
import { Plus, BookOpen } from 'lucide-react'
import Layout from '../components/Layout'
import { mockQuizzes } from '../data/mockData'

const STATUS_CONFIG = {
  open:    { label: '진행중', dot: 'bg-emerald-500' },
  grading: { label: '채점중', dot: 'bg-amber-500'   },
  closed:  { label: '종료',   dot: 'bg-gray-400'    },
  draft:   { label: '초안',   dot: 'bg-gray-300'    },
}

export default function QuizList() {
  const gradingQuizzes = mockQuizzes.filter(q => q.status === 'grading')
  const otherQuizzes   = mockQuizzes.filter(q => q.status !== 'grading')

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-medium text-indigo-600 mb-1 tracking-wide">CS301 데이터베이스 · 2026년 1학기</p>
            <h1 className="text-2xl font-bold text-gray-900">퀴즈 관리</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/question-bank" className="btn-secondary">
              <BookOpen size={14} />
              <span className="hidden sm:block">문제은행</span>
            </Link>
            <Link to="/quiz/new" className="btn-primary">
              <Plus size={14} />
              <span className="hidden sm:block">새 퀴즈</span>
            </Link>
          </div>
        </div>

        {gradingQuizzes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-amber-600">채점 필요 {gradingQuizzes.length}건</p>
            </div>
            <div className="grid gap-3">
              {gradingQuizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} urgent />
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="text-xs font-semibold text-gray-400 mb-3">전체 퀴즈 ({otherQuizzes.length})</p>
          <div className="grid gap-3">
            {otherQuizzes.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

function QuizCard({ quiz, urgent }) {
  const cfg          = STATUS_CONFIG[quiz.status]
  const gradeProgress = quiz.submitted > 0 ? Math.round((quiz.graded / quiz.submitted) * 100) : 0
  const submitRate    = Math.round((quiz.submitted / quiz.totalStudents) * 100)
  const unsubmitted   = quiz.totalStudents - quiz.submitted

  return (
    <div className={`card p-5 ${urgent ? 'border-amber-200 hover:border-amber-300' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
              {cfg.label}
            </span>
            <span className="w-px h-3 bg-gray-200 shrink-0" />
            <span className="text-xs text-gray-400">{quiz.week}주차 {quiz.session}차시</span>
            {!quiz.published && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">미발행</span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-1 truncate">{quiz.title}</h3>
          <p className="text-xs text-gray-400">{quiz.startDate} ~ {quiz.dueDate}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {quiz.status === 'grading' && (
            <Link
              to={`/quiz/${quiz.id}/grade`}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition-colors"
              style={{ boxShadow: '0 1px 2px rgba(99,102,241,0.3)' }}
            >
              채점하기
            </Link>
          )}
          <Link
            to={`/quiz/${quiz.id}/stats`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors"
          >
            통계
          </Link>
          <Link
            to={`/quiz/${quiz.id}/edit`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors"
          >
            편집
          </Link>
        </div>
      </div>

      {/* 통계 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          {[
            { label: '제출',      value: quiz.submitted,    sub: `${submitRate}%`,       color: 'text-gray-900' },
            { label: '미제출',    value: unsubmitted,        sub: null,                   color: unsubmitted > 0 ? 'text-amber-500' : 'text-gray-900' },
            { label: '채점 완료', value: quiz.graded,        sub: null,                   color: 'text-emerald-600' },
            { label: '미채점',    value: quiz.pendingGrade,  sub: null,                   color: quiz.pendingGrade > 0 ? 'text-amber-500' : 'text-gray-900' },
          ].map(item => (
            <div key={item.label} className="text-center px-2 first:pl-0 last:pr-0">
              <p className={`text-[18px] font-bold leading-none ${item.color}`}>{item.value}</p>
              {item.sub && <p className="text-[11px] text-indigo-500 font-medium mt-0.5">{item.sub}</p>}
              <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {quiz.status === 'grading' && (
          <div className="mt-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-400">채점 진행률</span>
              <span className="text-xs font-semibold text-gray-600">{gradeProgress}%</span>
            </div>
            <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${gradeProgress}%`, background: 'linear-gradient(90deg, #818CF8, #6366F1)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
