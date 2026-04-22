import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import { QuestionBankProvider } from './context/QuestionBankContext'

// LTI 진입 부트스트랩 — React 렌더 전에 해시에서 토큰 추출 후 localStorage 저장
// launch 엔드포인트가 `/{path}?lti=1#token=...&role=...&section=...` 로 redirect 하면 여기서 흡수
// section 에 따라 초기 경로가 이미 결정된 상태로 들어옴 (launch 가 /question-banks 또는 / 로 redirect)
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  if (params.get('lti') === '1' && window.location.hash.length > 1) {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const token = hashParams.get('token')
    const role = hashParams.get('role')
    const section = hashParams.get('section')
    if (token) {
      try {
        localStorage.setItem('xnq_token', token)
        localStorage.setItem('xnq_lti_active', '1')
        if (role) localStorage.setItem('xnq_lti_role', role)
        if (section) localStorage.setItem('xnq_lti_section', section)
      } catch { /* private mode / quota */ }
    }
    // URL 정리: ?lti=1 과 해시 제거, 경로는 그대로 유지
    window.history.replaceState({}, '', window.location.pathname)
  }
}

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
