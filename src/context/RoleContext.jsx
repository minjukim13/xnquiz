import { useState } from 'react'
import { RoleContext, DEMO_STUDENTS } from './role'

export function RoleProvider({ children }) {
  const [role, setRole] = useState('instructor') // 'instructor' | 'student'
  const [currentStudent, setCurrentStudent] = useState(DEMO_STUDENTS[0])
  return (
    <RoleContext.Provider value={{ role, setRole, currentStudent, setCurrentStudent }}>
      {children}
    </RoleContext.Provider>
  )
}
