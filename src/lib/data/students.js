/**
 * Students 데이터 레이어 (교수자 전용)
 */
import { api } from '@/lib/api'

const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export async function listStudents(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    return await api('/api/students' + (qs ? '?' + qs : ''))
  }
  // mock: getQuizStudents 는 퀴즈별이라 전체 학생 목록이 없음 → mockStudents 재활용
  const { mockStudents } = await import('@/data/mockData')
  return mockStudents.map(s => ({
    id: s.id,
    name: s.name,
    email: null,
    studentId: s.studentId,
    department: s.department,
    year: null,
  }))
}
