import { createContext, useContext, useState } from 'react'

export const DEMO_STUDENTS = [
  { id: 'demo1', name: '학생 M', studentId: '20221501', department: '컴퓨터공학과' },
  { id: 'demo2', name: '학생 N', studentId: '20221502', department: '소프트웨어학과' },
  { id: 'demo3', name: '학생 O', studentId: '20221503', department: '데이터사이언스학과' },
]

const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const [role, setRole] = useState('instructor') // 'instructor' | 'student'
  const [currentStudent, setCurrentStudent] = useState(DEMO_STUDENTS[0])
  return (
    <RoleContext.Provider value={{ role, setRole, currentStudent, setCurrentStudent }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
