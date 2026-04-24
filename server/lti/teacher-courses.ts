// GET /api/lti/teacher-courses
// LTI 교수자가 Canvas 에서 teacher enrollment 를 가진 모든 과목을 조회.
//
// 인증 흐름:
//   - 요청자 세션(JWT) → userId → LtiUserMap → ltiSub + platform.issuer
//   - Canvas REST admin PAT(CANVAS_API_TOKEN) 으로
//     GET {issuer}/api/v1/users/sis_lti_user_id:{ltiSub}/courses?enrollment_type=teacher
//
// 반환 항목마다 xnquiz 의 Course 존재 여부(hasXnCourse) + xnquiz courseCode 포함.
// 클라이언트는 이 courseCode 로 GET /api/quizzes?courseCode=... 를 호출해
// 타 과목 퀴즈 목록을 받는다.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../lib/prisma.js'
import { getAuthFromRequest } from '../../lib/auth.js'

type CanvasCourse = {
  id: number
  name: string
  course_code?: string
  workflow_state?: string
}

function trimBase(u: string): string {
  return u.replace(/\/+$/, '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ error: '인증이 필요합니다' })
  if (auth.role === 'STUDENT') {
    return res.status(403).json({ error: '교수자만 사용 가능합니다' })
  }

  const apiToken = process.env.CANVAS_API_TOKEN
  if (!apiToken) {
    return res.status(500).json({ error: 'CANVAS_API_TOKEN 이 설정되지 않았습니다' })
  }

  try {
    // LtiUserMap 은 유저당 platform 별로 존재. lastLaunchAt 최신 기준 1건 사용.
    const mapping = await prisma.ltiUserMap.findFirst({
      where: { userId: auth.userId },
      orderBy: { lastLaunchAt: 'desc' },
      include: { platform: true },
    })
    if (!mapping) {
      return res.status(400).json({
        error: 'LTI 매핑 정보가 없습니다. Canvas 에서 LTI 로 한 번 이상 접속해야 합니다.',
      })
    }

    const baseUrl = trimBase(mapping.platform.issuer)
    const url =
      `${baseUrl}/api/v1/users/sis_lti_user_id:${encodeURIComponent(mapping.ltiSub)}` +
      `/courses?enrollment_type=teacher&state[]=available&per_page=100`

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('[lti:teacher-courses] Canvas REST failed', resp.status, text)
      return res.status(502).json({
        error: `Canvas API 호출 실패 (${resp.status})`,
        detail: text.slice(0, 500),
      })
    }
    const canvasCourses = (await resp.json()) as CanvasCourse[]

    // 현재 LTI context 과목 제외 (클라에서 courseCode 로 넘김)
    const excludeCode = typeof req.query.excludeCourseCode === 'string'
      ? req.query.excludeCourseCode.toUpperCase()
      : null

    const codes = canvasCourses.map(c => `CANVAS_${c.id}`.toUpperCase())
    const existingCourses = await prisma.course.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const existingSet = new Set(existingCourses.map(c => c.code))

    const result = canvasCourses
      .map(c => {
        const courseCode = `CANVAS_${c.id}`.toUpperCase()
        return {
          canvasId: c.id,
          canvasCourseCode: c.course_code ?? null,
          courseCode,
          name: c.name,
          label: c.name,
          hasXnCourse: existingSet.has(courseCode),
        }
      })
      .filter(c => (excludeCode ? c.courseCode !== excludeCode : true))

    return res.status(200).json(result)
  } catch (err) {
    console.error('[lti:teacher-courses] error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
