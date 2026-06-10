import { lazy } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import { QuestionBankProvider } from './context/QuestionBankContext'
import Layout from './components/Layout'
import { prefetchRoute } from './lib/prefetch'

const Router = import.meta.env.VITE_HANDOFF === 'true' ? HashRouter : BrowserRouter

// nav 프리페치와 lazy 가 같은 import() 를 공유 → 중복 다운로드 없음
const QuizList = lazy(prefetchRoute.quizList)
const QuizDetail = lazy(() => import('./pages/QuizDetail'))
const QuizEdit = lazy(() => import('./pages/QuizEdit'))
const QuizCreate = lazy(() => import('./pages/QuizCreate'))
const GradingDashboard = lazy(() => import('./pages/GradingDashboard'))
const QuizStats = lazy(() => import('./pages/QuizStats'))
const QuestionBankList = lazy(prefetchRoute.questionBankList)
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const QuizAttempt = lazy(() => import('./pages/QuizAttempt'))

export default function App() {
  return (
    <RoleProvider>
      <QuestionBankProvider>
      <Router>
        <Routes>
          {/* Layout Route — 사이드바를 라우트 전환 사이에 유지 (Suspense 는 Layout 내부 main 영역에) */}
          <Route element={<Layout />}>
            <Route path="/" element={<QuizList />} />
            <Route path="/quiz/new" element={<QuizCreate />} />
            <Route path="/quiz/:id" element={<QuizDetail />} />
            <Route path="/quiz/:id/edit" element={<QuizEdit />} />
            <Route path="/quiz/:id/grade" element={<GradingDashboard />} />
            <Route path="/quiz/:id/stats" element={<QuizStats />} />
            <Route path="/quiz/:id/attempt" element={<QuizAttempt />} />
            <Route path="/question-banks" element={<QuestionBankList />} />
            <Route path="/question-banks/:bankId" element={<QuestionBank />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
      </QuestionBankProvider>
    </RoleProvider>
  )
}
