import { createContext, useContext } from 'react'

// 학생 모드용 데모 학생 3명
// DB 시드(prisma/seed.ts) 의 s1 ~ s3 계정과 일치
export const DEMO_STUDENTS = [
  { id: 's1', name: '김민준', studentId: '2021001', department: '컴퓨터공학과',   email: 's01@xn.test' },
  { id: 's2', name: '이서연', studentId: '2022002', department: '소프트웨어학과', email: 's02@xn.test' },
  { id: 's3', name: '박지호', studentId: '2023003', department: '정보통신공학과', email: 's03@xn.test' },
]

export const RoleContext = createContext(null)

export function useRole() {
  return useContext(RoleContext)
}
