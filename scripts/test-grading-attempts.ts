// Attempt 조회 — answers include 검증
const BASE = 'http://localhost:3000'

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  return { status: res.status, body: res.status === 204 ? null : await res.json() }
}

async function main() {
  const login = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 'prof@xn.test' }),
  })
  const auth = { Authorization: `Bearer ${login.body.token}` }

  const r = await api('/api/attempts?quizId=8', { headers: auth })
  console.log('status:', r.status)
  console.log('count:', Array.isArray(r.body) ? r.body.length : 'NOT_ARRAY')
  if (Array.isArray(r.body) && r.body[0]) {
    const s = r.body[0]
    console.log('keys:', Object.keys(s).join(','))
    console.log('user:', s.user ? Object.keys(s.user).join(',') : 'N/A')
    console.log('answers.length:', Array.isArray(s.answers) ? s.answers.length : 'N/A')
    if (Array.isArray(s.answers) && s.answers[0]) {
      console.log('answer[0]:', JSON.stringify(s.answers[0]))
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
