import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import { QuestionBankProvider } from './context/QuestionBankContext'

const QuizList = lazy(() => import('./pages/QuizList'))
const QuizEdit = lazy(() => import('./pages/QuizEdit'))
const QuizCreate = lazy(() => import('./pages/QuizCreate'))
const GradingDashboard = lazy(() => import('./pages/GradingDashboard'))
const QuizStats = lazy(() => import('./pages/QuizStats'))
const QuestionBankList = lazy(() => import('./pages/QuestionBankList'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const QuizAttempt = lazy(() => import('./pages/QuizAttempt'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <RoleProvider>
      <QuestionBankProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<QuizList />} />
            <Route path="/quiz/new" element={<QuizCreate />} />
            <Route path="/quiz/:id/edit" element={<QuizEdit />} />
            <Route path="/quiz/:id/grade" element={<GradingDashboard />} />
            <Route path="/quiz/:id/stats" element={<QuizStats />} />
            <Route path="/quiz/:id/attempt" element={<QuizAttempt />} />
            <Route path="/question-banks" element={<QuestionBankList />} />
            <Route path="/question-banks/:bankId" element={<QuestionBank />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </QuestionBankProvider>
    </RoleProvider>
  )
}
