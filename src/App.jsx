import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import QuizList from './pages/QuizList'
import QuizEdit from './pages/QuizEdit'
import GradingDashboard from './pages/GradingDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizList />} />
        <Route path="/quiz/:id/edit" element={<QuizEdit />} />
        <Route path="/quiz/:id/grade" element={<GradingDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
