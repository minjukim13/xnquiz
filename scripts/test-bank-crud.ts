// 문제은행 CRUD API — 신규 엔드포인트(DELETE /banks/[id], PATCH/DELETE /bank-questions/[id]) 검증
// 실행: npx tsx scripts/test-bank-crud.ts

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
  console.log('[0] prof 로그인')
  const login = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 'prof@xn.test' }),
  })
  const auth = { Authorization: `Bearer ${login.body.token}` }

  console.log('[1] POST /api/banks — 신규 은행 생성')
  const b = await api('/api/banks', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ name: '테스트은행', courseCode: 'CS301', difficulty: 'medium' }),
  })
  const bankId = b.body.id
  console.log('  id=', bankId)

  console.log('[2] POST /api/banks/[id]/questions — 문항 1개 추가')
  const q = await api(`/api/banks/${bankId}/questions`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({
      type: 'multiple_choice', text: '테스트 문항', points: 5,
      options: { choices: ['A', 'B'] }, correctAnswer: { choice: 0 },
    }),
  })
  const qId = q.body.id
  console.log('  id=', qId)

  console.log('[3] PATCH /api/bank-questions/[id] — 문항 수정')
  const p = await api(`/api/bank-questions/${qId}`, {
    method: 'PATCH', headers: auth,
    body: JSON.stringify({ text: '수정된 문항', points: 10, difficulty: 'high' }),
  })
  console.log('  text=', p.body.text, 'points=', p.body.points, 'difficulty=', p.body.difficulty)

  console.log('[4] DELETE /api/bank-questions/[id] — 문항 삭제')
  const d1 = await api(`/api/bank-questions/${qId}`, { method: 'DELETE', headers: auth })
  console.log('  status=', d1.status)

  console.log('[5] GET /api/banks/[id]/questions — 삭제 확인 (0개)')
  const qs = await api(`/api/banks/${bankId}/questions`, { headers: auth })
  console.log('  count=', qs.body.length)

  console.log('[6] PATCH /api/banks/[id] — 은행 수정')
  const bp = await api(`/api/banks/${bankId}`, {
    method: 'PATCH', headers: auth,
    body: JSON.stringify({ name: '수정된 은행', difficulty: 'low' }),
  })
  console.log('  name=', bp.body.name, 'difficulty=', bp.body.difficulty)

  console.log('[7] DELETE /api/banks/[id] — 은행 삭제')
  const d2 = await api(`/api/banks/${bankId}`, { method: 'DELETE', headers: auth })
  console.log('  status=', d2.status)

  console.log('[8] GET /api/banks/[id] — 삭제 확인 (404)')
  const check = await fetch(`${BASE}/api/banks/${bankId}`, { headers: auth as any })
  console.log('  status=', check.status)

  console.log('\n✓ 은행 CRUD 전체 통과')
}

main().catch(e => { console.error(e); process.exit(1) })
