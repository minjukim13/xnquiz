import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const QuizList = lazy(() => import('./pages/QuizList'))
const QuizEdit = lazy(() => import('./pages/QuizEdit'))
const QuizCreate = lazy(() => import('./pages/QuizCreate'))
const GradingDashboard = lazy(() => import('./pages/GradingDashboard'))
const QuizStats = lazy(() => import('./pages/QuizStats'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<QuizList />} />
          <Route path="/quiz/new" element={<QuizCreate />} />
          <Route path="/quiz/:id/edit" element={<QuizEdit />} />
          <Route path="/quiz/:id/grade" element={<GradingDashboard />} />
          <Route path="/quiz/:id/stats" element={<QuizStats />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
