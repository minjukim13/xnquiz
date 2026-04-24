import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import { QuestionBankProvider } from './context/QuestionBankContext'
import Layout from './components/Layout'
import { prefetchRoute } from './lib/prefetch'

// LTI 진입 부트스트랩 — React 렌더 전에 해시에서 토큰 추출 후 localStorage 저장
// launch 엔드포인트가 `/{path}?lti=1#token=...&role=...&section=...` 로 redirect 하면 여기서 흡수
// section 에 따라 초기 경로가 이미 결정된 상태로 들어옴
// (launch 가 /quiz/:id | /question-banks | / 중 하나로 redirect)
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  if (params.get('lti') === '1' && window.location.hash.length > 1) {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const token = hashParams.get('token')
    const role = hashParams.get('role')
    const section = hashParams.get('section')
    const courseCode = hashParams.get('courseCode')
    const week = hashParams.get('week')
    const session = hashParams.get('session')
    if (token) {
      try {
        localStorage.setItem('xnq_token', token)
        localStorage.setItem('xnq_lti_active', '1')
        if (role) localStorage.setItem('xnq_lti_role', role)
        if (section) localStorage.setItem('xnq_lti_section', section)
        if (courseCode) localStorage.setItem('xnq_lti_course_code', courseCode)
        // LearningX 가 주입한 주차/차시 — 신규 퀴즈 생성 시 프리필 용도
        // 매 launch 마다 값이 다를 수 있어 항상 덮어쓰기 (없으면 이전값 제거)
        if (week) localStorage.setItem('xnq_lti_week', week)
        else localStorage.removeItem('xnq_lti_week')
        if (session) localStorage.setItem('xnq_lti_session', session)
        else localStorage.removeItem('xnq_lti_session')
      } catch { /* private mode / quota */ }
    }
    // URL 정리: ?lti=1 과 해시 제거, 경로는 그대로 유지
    window.history.replaceState({}, '', window.location.pathname)
  }
}

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
      <BrowserRouter>
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
      </BrowserRouter>
      </QuestionBankProvider>
    </RoleProvider>
  )
}
