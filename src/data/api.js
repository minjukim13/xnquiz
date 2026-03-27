/**
 * api.js — 데이터 소스 분기 진입점
 *
 * VITE_DATA_SOURCE=mock   → mockData.js 반환 (현재 상태)
 * VITE_DATA_SOURCE=canvas → Canvas LMS REST API 호출 (연동 시 구현)
 *
 * ─── Canvas 연동 방식 ───────────────────────────────────────────
 * 자체 서버(Self-hosted) + LTI 1.3 / OAuth 2.0 (Authorization Code Flow)
 *
 * 흐름 요약:
 *   1. Canvas Admin이 Developer Key 등록 → client_id, client_secret 발급
 *   2. 사용자가 앱 접근 → Canvas OAuth 인증 페이지로 리다이렉트
 *      GET {CANVAS_BASE_URL}/login/oauth2/auth
 *        ?client_id=...&response_type=code&redirect_uri=...&scope=...
 *   3. Canvas가 authorization code를 redirect_uri로 전달
 *   4. 코드를 access_token으로 교환 (서버사이드에서 처리 — Vercel API Route 필요)
 *      POST {CANVAS_BASE_URL}/login/oauth2/token
 *   5. access_token으로 Canvas REST API 호출
 *
 * CORS 주의: 브라우저에서 Canvas API를 직접 호출하면 CORS 차단됨
 *   → Vercel API Route(서버리스 함수)를 프록시로 사용해야 함
 *   → /api/canvas/* 경로로 요청 → Vercel 서버가 Canvas에 중계
 *
 * 필요한 Canvas Admin 작업:
 *   - Developer Key 등록 (LTI Key 또는 API Key)
 *   - redirect_uri 화이트리스트 등록 (Vercel 배포 URL)
 *   - 허용 scope 설정 (quizzes, submissions, question_banks 등)
 * ──────────────────────────────────────────────────────────────
 */

const dataSource = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export const isMock = dataSource === 'mock'

// Canvas OAuth 설정 (연동 시 사용)
export const canvasConfig = {
  baseUrl:      import.meta.env.VITE_CANVAS_BASE_URL ?? '',
  clientId:     import.meta.env.VITE_CANVAS_CLIENT_ID ?? '',
  redirectUri:  import.meta.env.VITE_CANVAS_REDIRECT_URI ?? '',
  // client_secret은 절대 프론트엔드에 노출 금지 → Vercel API Route에서만 사용
}

/**
 * Canvas API 호출 공통 함수 (Vercel 프록시 경유)
 *
 * 브라우저 → /api/canvas/* (Vercel API Route) → Canvas 자체 서버
 *
 * @param {string} path - Canvas API endpoint (예: /api/v1/courses/:id/quizzes)
 * @param {RequestInit} options - fetch 옵션
 */
export async function canvasFetch(path, options = {}) {
  // 프록시 경유: /api/canvas + Canvas 경로
  const proxyPath = `/api/canvas${path}`

  const res = await fetch(proxyPath, {
    ...options,
    credentials: 'include', // 세션 쿠키 포함 (OAuth 토큰은 서버에서 관리)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // 세션 만료 → OAuth 재인증 흐름으로 리다이렉트
    const authUrl = `${canvasConfig.baseUrl}/login/oauth2/auth`
      + `?client_id=${canvasConfig.clientId}`
      + `&response_type=code`
      + `&redirect_uri=${encodeURIComponent(canvasConfig.redirectUri)}`
      + `&scope=url:GET|/api/v1/courses/:course_id/quizzes`
        + ` url:GET|/api/v1/courses/:course_id/quizzes/:id/submissions`
        + ` url:GET|/api/v1/courses/:course_id/question_banks`
    window.location.href = authUrl
    return
  }

  if (!res.ok) {
    throw new Error(`[Canvas API] ${res.status} ${res.statusText} — ${path}`)
  }

  return res.json()
}

// ───────────────────────────────────────────
// TODO: Canvas 연동 시 아래 함수들을 구현
// (isMock 분기로 mock/canvas 전환 가능)
// ───────────────────────────────────────────

// export async function fetchQuizzes(courseId) {
//   if (isMock) { const { mockQuizzes } = await import('./mockData.js'); return mockQuizzes }
//   return canvasFetch(`/api/v1/courses/${courseId}/quizzes`)
// }

// export async function fetchQuizSubmissions(courseId, quizId) {
//   if (isMock) { ... }
//   return canvasFetch(`/api/v1/courses/${courseId}/quizzes/${quizId}/submissions?include[]=user`)
// }

// export async function fetchQuestionBanks(courseId) {
//   if (isMock) { ... }
//   return canvasFetch(`/api/v1/courses/${courseId}/question_banks`)
// }

// export async function gradeSubmission(courseId, quizId, submissionId, payload) {
//   if (isMock) { ... }
//   return canvasFetch(
//     `/api/v1/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}`,
//     { method: 'PUT', body: JSON.stringify(payload) }
//   )
// }
