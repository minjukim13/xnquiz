import { createContext, useContext } from 'react'

export const DEMO_STUDENTS = [
  { id: 'demo1', name: '김지우', studentId: '20221501', department: '컴퓨터공학과' },
  { id: 'demo2', name: '박서연', studentId: '20221502', department: '소프트웨어학과' },
  { id: 'demo3', name: '이하준', studentId: '20221503', department: '데이터사이언스학과' },
]

export const RoleContext = createContext(null)

export function useRole() {
  return useContext(RoleContext)
}
