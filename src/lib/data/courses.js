/**
 * Courses 데이터 레이어
 *
 * mock 응답 구조: [{ id, name }]  (MOCK_COURSES)
 * api  응답 구조: [{ code, name, label, studentCount }]
 *
 * 프론트 기존 사용처는 `c.id` (소문자) + `c.name` (합친 문자열). 호환 위해 mock 구조로 표준화.
 */
import { api } from '@/lib/api'
import { shouldUseApi } from './_common'
import { MOCK_COURSES } from '@/data/mockData'

export async function listCourses() {
  if (shouldUseApi()) {
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

/**
 * LTI 교수자 과목 목록 — Canvas REST 경유
 * 현재 로그인한 교수자가 Canvas 에서 teacher enrollment 를 가진 모든 과목.
 * LTI 모드(xnq_lti_active)에서만 호출 가능.
 *
 * @param {object} [opts]
 * @param {string} [opts.excludeCourseCode] 제외할 xnquiz courseCode (예: "CANVAS_32225")
 * @returns {Promise<Array<{ canvasId, courseCode, name, label, hasXnCourse }>>}
 */
export async function listTeacherCourses(opts = {}) {
  const qs = opts.excludeCourseCode
    ? '?' + new URLSearchParams({ excludeCourseCode: opts.excludeCourseCode }).toString()
    : ''
  return await api('/api/lti/teacher-courses' + qs)
}
