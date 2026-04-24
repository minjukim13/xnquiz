// GET /api/lti/teacher-courses
// LTI 교수자가 Canvas 에서 teacher enrollment 를 가진 모든 과목을 조회.
//
// 인증 흐름:
//   - 요청자 세션(JWT) → userId → User.studentId(Canvas login_id) 또는 email local-part
//   - Canvas REST admin PAT(CANVAS_API_TOKEN) 으로
//     GET {issuer}/api/v1/users/sis_login_id:{loginId}/courses?enrollment_type=teacher
//
// sis_lti_user_id: 쿼리는 이 Canvas 인스턴스에 SIS LTI 매핑이 없어 404.
// sis_login_id: 는 동작 확인됨 (200).
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
      include: { platform: true, user: true },
    })
    if (!mapping) {
      return res.status(400).json({
        error: 'LTI 매핑 정보가 없습니다. Canvas 에서 LTI 로 한 번 이상 접속해야 합니다.',
      })
    }

    // Canvas login_id 우선순위: User.studentId (launch.ts 에서 custom.canvas_user_login_id 로 저장) >
    //   실제 email 의 local-part. LTI fallback email(lti-{sub}@xn.lti) 은 Canvas 조회 불가라 명시 에러.
    const email = mapping.user.email
    const isFallbackEmail = email.endsWith('@xn.lti')
    const loginId = mapping.user.studentId
      || (isFallbackEmail ? null : email.split('@')[0])
    if (!loginId) {
      return res.status(400).json({
        error: 'Canvas login_id 를 찾지 못했습니다. Dev Key 에 canvas_user_login_id=$Canvas.user.loginId 가 등록되어 있어야 합니다.',
      })
    }

    const baseUrl = trimBase(mapping.platform.issuer)
    const url =
      `${baseUrl}/api/v1/users/sis_login_id:${encodeURIComponent(loginId)}` +
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

    // xnquiz DB 의 Course.ltiCanvasCourseId 로 Canvas 숫자 id 매칭.
    // Dev Key privacy 설정 때문에 LTI context.id 가 해시로 올 수 있어
    // `CANVAS_{numeric_id}` 단순 규칙으로는 매칭 안 됨.
    const canvasIds = canvasCourses.map(c => c.id)
    const existingCourses = await prisma.course.findMany({
      where: { ltiCanvasCourseId: { in: canvasIds } },
      select: { code: true, ltiCanvasCourseId: true },
    })
    const codeByCanvasId = new Map<number, string>()
    for (const c of existingCourses) {
      if (c.ltiCanvasCourseId != null) codeByCanvasId.set(c.ltiCanvasCourseId, c.code)
    }

    const result = canvasCourses
      .map(c => {
        // xnquiz 에 launch 된 적 있으면 실제 courseCode, 없으면 숫자 기반 placeholder
        // (placeholder 는 /api/quizzes 조회 시 빈 배열 반환 → UI "공개된 퀴즈 없음")
        const courseCode = codeByCanvasId.get(c.id) ?? `CANVAS_${c.id}`
        return {
          canvasId: c.id,
          canvasCourseCode: c.course_code ?? null,
          courseCode,
          name: c.name,
          label: c.name,
          hasXnCourse: codeByCanvasId.has(c.id),
        }
      })
      .filter(c => (excludeCode ? c.courseCode !== excludeCode : true))

    return res.status(200).json(result)
  } catch (err) {
    console.error('[lti:teacher-courses] error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
