// 응시 API 플로우 — Node fetch 기반 재검증 (한글 body UTF-8 안전)
// 실행: npx tsx scripts/test-attempt-flow.ts

const BASE = 'http://localhost:3000'

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok && res.status !== 409) {
    const body = await res.text()
    throw new Error(`${res.status} ${path}: ${body}`)
  }
  return { status: res.status, body: res.status === 204 ? null : await res.json() }
}

async function main() {
  // 학생 토큰 (s44 — 기존 미제출 상태)
  const login = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 's44@xn.test' }),
  })
  const stoken = login.body.token
  const sauth = { Authorization: `Bearer ${stoken}` }

  console.log('[1] POST /attempts (quizId=1)')
  const attRes = await api('/api/attempts', {
    method: 'POST', headers: sauth, body: JSON.stringify({ quizId: '1' }),
  })
  const attId = attRes.body.id
  console.log('  id=', attId, 'attemptNum=', attRes.body.attemptNumber)

  console.log('[2] PUT /attempts/[id]/answers — Q1, Q2(한글), Q6')
  const putRes = await api(`/api/attempts/${attId}/answers`, {
    method: 'PUT',
    headers: sauth,
    body: JSON.stringify({
      answers: [
        { questionId: 'q1', response: 'SELECT' },
        { questionId: 'q2', response: '데이터 중복 최소화' }, // 한글 정답
        { questionId: 'q6', response: '거짓' },                // 한글 정답
      ],
    }),
  })
  console.log('  saved=', putRes.body.saved)

  console.log('[3] POST /attempts/[id]/submit')
  const subRes = await api(`/api/attempts/${attId}/submit`, {
    method: 'POST', headers: sauth,
  })
  console.log('  autoScore=', subRes.body.autoScore, 'totalScore=', subRes.body.totalScore, 'graded=', subRes.body.graded)

  console.log('[4] Q별 점수')
  const answers: Array<{ questionId: string; autoScore: number | null }> = subRes.body.answers
  answers
    .filter(a => ['q1','q2','q6'].includes(a.questionId))
    .forEach(a => console.log(`  ${a.questionId}: autoScore=${a.autoScore}`))

  console.log('[5] POST submit 재시도 (409 예상)')
  const retry = await api(`/api/attempts/${attId}/submit`, { method: 'POST', headers: sauth })
  console.log('  status=', retry.status)
}

main().catch(e => { console.error(e); process.exit(1) })
