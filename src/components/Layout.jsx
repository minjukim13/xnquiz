import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useRole } from '../context/role'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function Layout() {
  const { role, currentStudent } = useRole()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {role === 'student' && (
        <div className="flex items-center gap-2 mx-4 sm:mx-6 lg:mx-10 mt-4 px-4 py-2.5 rounded-lg text-xs bg-accent">
          <GraduationCap size={11} className="text-primary" />
          <span className="text-primary font-medium">학생 모드</span>
          <span className="text-primary">- {currentStudent.name} ({currentStudent.studentId})</span>
        </div>
      )}

      <main className="px-4 sm:px-6 lg:px-10 py-6">
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
