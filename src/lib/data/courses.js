/**
 * Courses 데이터 레이어
 *
 * mock 응답 구조: [{ id, name }]  (MOCK_COURSES)
 * api  응답 구조: [{ code, name, label, studentCount }]
 *
 * 프론트 기존 사용처는 `c.id` (소문자) + `c.name` (합친 문자열). 호환 위해 mock 구조로 표준화.
 */
import { api } from '@/lib/api'
import { MOCK_COURSES } from '@/data/mockData'

const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export async function listCourses() {
  if (MODE === 'api') {
    const rows = await api('/api/courses')
    // API 응답 → mock 형태(`id`, `name`) 로 매핑
    // id = 소문자 code ("cs301"), name = "CS301 데이터베이스" 레이블
    return rows.map(r => ({
      id: r.code.toLowerCase(),
      code: r.code,
      name: r.label,              // "CS301 데이터베이스"
      shortName: r.name,          // "데이터베이스"
      studentCount: r.studentCount,
    }))
  }
  return [...MOCK_COURSES]
}
