// QuizEdit 저장 시 기존 응시 답안이 유지되는지 검증
//
// 전제:
//   - dev-server (또는 vercel dev) 가 http://localhost:3000 에서 /api/* 제공
//   - Vite 가 http://localhost:5173 에서 프론트 제공
//   - VITE_DATA_SOURCE=api
//
// 플로우:
//   setup (API)  : 퀴즈 + 문항 3 + s44 응시 → 답안 → 제출
//   UI           : 교수자 RoleToggle 클릭 → /quiz/:id/edit → "저장" 클릭
//   verify (API) : GET /api/attempts?quizId → s44 답안 3건 유지 & 점수 그대로
//   teardown     : 퀴즈 DELETE (응시·답안 cascade)

import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

const API = 'http://localhost:3000'

async function login(api: APIRequestContext, email: string): Promise<string> {
  const r = await api.post(`${API}/api/auth/dev-login`, { data: { email } })
  expect(r.ok(), `dev-login ${email}`).toBeTruthy()
  return (await r.json()).token
}

test('QuizEdit 저장 후 기존 응시 답안이 보존된다', async ({ page }) => {
  const api = await pwRequest.newContext()

  // ── setup ──────────────────────────────────────────────
  const profToken = await login(api, 'prof@xn.test')
  const pAuth = { Authorization: `Bearer ${profToken}` }

  const qzRes = await api.post(`${API}/api/quizzes`, {
    headers: pAuth,
    data: { title: 'E2E 답안 보존 검증', courseCode: 'CS301', status: 'open', visible: true },
  })
  expect(qzRes.status(), `퀴즈 생성`).toBe(201)
  const quiz = await qzRes.json()
  const quizId = quiz.id as string

  try {
    // 문항 3개
    const qs: Array<{ id: string }> = []
    for (const label of ['A', 'B', 'C']) {
      const r = await api.post(`${API}/api/quizzes/${quizId}/questions`, {
        headers: pAuth,
        data: {
          type: 'multiple_choice',
          text: `${label} 문항`,
          points: 10,
          choices: ['정답', '오답1', '오답2'],
          correctAnswer: '정답',
        },
      })
      expect(r.status(), `문항 ${label} 추가`).toBe(201)
      qs.push(await r.json())
    }

    // s44 응시 → 답안 → 제출 (A 정답, B 오답, C 정답 → 20점)
    const stuToken = await login(api, 's44@xn.test')
    const sAuth = { Authorization: `Bearer ${stuToken}` }
    const attRes = await api.post(`${API}/api/attempts`, { headers: sAuth, data: { quizId } })
    expect([200, 201], `응시 시작`).toContain(attRes.status())
    const attempt = await attRes.json()
    const attId = attempt.id

    await api.put(`${API}/api/attempts/${attId}/answers`, {
      headers: sAuth,
      data: {
        answers: [
          { questionId: qs[0].id, response: '정답' },
          { questionId: qs[1].id, response: '오답2' },
          { questionId: qs[2].id, response: '정답' },
        ],
      },
    })
    const subRes = await api.post(`${API}/api/attempts/${attId}/submit`, { headers: sAuth })
    expect(subRes.status(), `제출`).toBe(200)
    const submitted = await subRes.json()
    expect(submitted.totalScore, `자동채점 합계`).toBe(20)

    // ── UI ─────────────────────────────────────────────────
    // 페이지에 치명적 오류가 나면 즉시 기록
    page.on('pageerror', e => console.log('[pageerror]', e.message))
    page.on('console', m => {
      if (m.type() === 'error') console.log('[console error]', m.text())
    })

    // RoleProvider 가 마운트 시 dev-login 을 비동기로 호출하는 사이 다른 Context
    // (QuestionBankContext 등) 가 먼저 API 를 쳐서 401 을 맞는 레이스를 우회하기 위해,
    // 브라우저 컨텍스트 초기화 전에 JWT 를 localStorage 에 미리 주입한다.
    await page.addInitScript(token => {
      localStorage.setItem('xnq_token', token)
    }, profToken)

    await page.goto(`/quiz/${quizId}/edit`, { waitUntil: 'networkidle' })

    // 로드 확인 — 헤더 "퀴즈 편집" 가시 (Vite dev + StrictMode re-mount 감안해 15초)
    await expect(page.getByRole('heading', { name: '퀴즈 편집' })).toBeVisible({ timeout: 15_000 })

    // "저장" 버튼 클릭 (변경 없이도 PUT UPSERT 발동)
    const saveBtn = page.getByRole('button', { name: '저장', exact: true })
    await saveBtn.click()

    // 저장 성공 다이얼로그
    await expect(page.getByText('저장되었습니다')).toBeVisible({ timeout: 15_000 })

    // ── verify ─────────────────────────────────────────────
    const after = await api.get(`${API}/api/attempts?quizId=${quizId}`, { headers: pAuth })
    expect(after.status()).toBe(200)
    const attempts = await after.json()
    const stuAtt = attempts.find((a: { userId: string }) => a.userId === 's44')
    expect(stuAtt, 's44 응시 레코드 유지').toBeTruthy()
    expect(stuAtt.answers.length, '답안 3건 유지').toBe(3)

    const byQ: Record<string, { response: unknown; autoScore: number | null }> = {}
    for (const a of stuAtt.answers) byQ[a.questionId] = a

    expect(byQ[qs[0].id], 'A 답안 존재').toBeTruthy()
    expect(byQ[qs[0].id].response, 'A response 유지').toBe('정답')
    expect(byQ[qs[0].id].autoScore, 'A autoScore 10 유지').toBe(10)

    expect(byQ[qs[1].id].response, 'B response 유지').toBe('오답2')
    expect(byQ[qs[1].id].autoScore, 'B autoScore 0 유지').toBe(0)

    expect(byQ[qs[2].id].response, 'C response 유지').toBe('정답')
    expect(byQ[qs[2].id].autoScore, 'C autoScore 10 유지').toBe(10)

    expect(stuAtt.totalScore, 'Attempt totalScore 20 유지').toBe(20)
  } finally {
    await api.delete(`${API}/api/quizzes/${quizId}`, { headers: pAuth })
    await api.dispose()
  }
})
