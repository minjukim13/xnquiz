import { useEffect, useState } from 'react'
import { RoleContext, DEMO_STUDENTS } from './role'
import { devLogin, clearToken } from '@/lib/api'

const INSTRUCTOR_EMAIL = 'prof@xn.test'

export function RoleProvider({ children }) {
  const [role, setRole] = useState('instructor') // 'instructor' | 'student'
  const [currentStudent, setCurrentStudent] = useState(DEMO_STUDENTS[0])

  // 역할/학생 변경 시 dev-login 으로 토큰 자동 교체
  // Canvas SSO 연동 시 이 블록은 폐기되고 Canvas 컨텍스트가 토큰 공급
  useEffect(() => {
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
