import { useEffect, useState } from 'react'
import { RoleContext, DEMO_STUDENTS } from './role'
import { devLogin, clearToken } from '@/lib/api'

const INSTRUCTOR_EMAIL = 'prof@xn.test'

function isLtiActive() {
  try { return localStorage.getItem('xnq_lti_active') === '1' } catch { return false }
}

function initialRoleFromLti() {
  try {
    const r = localStorage.getItem('xnq_lti_role')
    if (r === 'STUDENT') return 'student'
    if (r === 'PROFESSOR' || r === 'ADMIN') return 'instructor'
  } catch { /* noop */ }
  return 'instructor'
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => (isLtiActive() ? initialRoleFromLti() : 'instructor'))
  const [currentStudent, setCurrentStudent] = useState(DEMO_STUDENTS[0])

  // 역할/학생 변경 시 dev-login 으로 토큰 자동 교체
  // LTI 모드에서는 launch 가 이미 토큰을 발급했으므로 이 블록 건너뜀
  useEffect(() => {
    if (isLtiActive()) return

    const email = role === 'instructor' ? INSTRUCTOR_EMAIL : currentStudent.email
    devLogin(email).catch((err) => {
      console.warn('[dev-login] 실패 —', err?.message || err)
      clearToken()
    })
  }, [role, currentStudent.email])

  return (
    <RoleContext.Provider value={{ role, setRole, currentStudent, setCurrentStudent }}>
      {children}
    </RoleContext.Provider>
  )
}
