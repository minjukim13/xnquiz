// 전체 회귀 — 퀴즈 CRUD, 문항 CRUD, 조회 경로, 역할 전환
// 실행: npx tsx scripts/test-regression-full.ts

const BASE = 'http://localhost:3000'

type ApiResult<T = any> = { status: number; body: T }

async function api<T = any>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const ok = res.ok || [409, 400, 401, 403, 404].includes(res.status)
  if (!ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${path}: ${body}`)
  }
  return { status: res.status, body: res.status === 204 ? null as any : await res.json() }
}

function section(title: string) { console.log(`\n━━ ${title}`) }
function pass(msg: string) { console.log(`  ✓ ${msg}`) }
function fail(msg: string) { console.log(`  ✗ ${msg}`); process.exitCode = 1 }
function assert(cond: any, msg: string) { cond ? pass(msg) : fail(msg) }

async function main() {
  section('[0] 교수자 로그인 (dev-login)')
  const pLogin = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 'prof@xn.test' }),
  })
  assert(pLogin.status === 200 && pLogin.body.token, 'prof 토큰 발급')
  const pauth = { Authorization: `Bearer ${pLogin.body.token}` }

  section('[1] 조회 경로 — quizzes / courses / banks / students')
  const qs = await api('/api/quizzes', { headers: pauth })
  assert(qs.status === 200 && Array.isArray(qs.body), `quizzes list (${qs.body.length}건)`)

  const courses = await api('/api/courses', { headers: pauth })
  assert(courses.status === 200 && courses.body.length > 0, `courses list (${courses.body.length}건)`)

  const banks = await api('/api/banks', { headers: pauth })
  assert(banks.status === 200, `banks list (${banks.body.length}건)`)

  const students = await api('/api/students', { headers: pauth })
  assert(students.status === 200 && students.body.length === 45, `students list (${students.body.length}/45)`)

  section('[2] 퀴즈 생성 (POST /api/quizzes)')
  const createRes = await api('/api/quizzes', {
    method: 'POST', headers: pauth,
    body: JSON.stringify({
      title: '회귀테스트 퀴즈',
      courseCode: 'CS301',
      status: 'draft',
      visible: true,
      allowAttempts: 2,
      timeLimit: 30,
      scorePolicy: 'highest',
    }),
  })
  assert(createRes.status === 201 || createRes.status === 200, `퀴즈 생성 (${createRes.status})`)
  const newQuizId = createRes.body.id
  console.log('  id=', newQuizId)

  section('[3] 퀴즈 수정 (PATCH /api/quizzes/[id])')
  const patchRes = await api(`/api/quizzes/${newQuizId}`, {
    method: 'PATCH', headers: pauth,
    body: JSON.stringify({ title: '회귀테스트 퀴즈 (수정)', timeLimit: 60 }),
  })
  assert(patchRes.body.title === '회귀테스트 퀴즈 (수정)', '제목 수정 반영')
  assert(patchRes.body.timeLimit === 60, 'timeLimit 60 반영')

  section('[4] 문항 추가 (POST /api/quizzes/[id]/questions) — 4유형')
  const types = [
    { type: 'multiple_choice', text: 'MC 문항', points: 5, options: { choices: ['A','B','C'] }, correctAnswer: { choice: 0 } },
    { type: 'true_false', text: 'TF 문항', points: 5, correctAnswer: { value: true } },
    { type: 'short_answer', text: 'SA 문항', points: 5, correctAnswer: { text: '정답' } },
    { type: 'essay', text: 'Essay 문항', points: 10 },
  ]
  const createdQs: any[] = []
  for (const q of types) {
    const r = await api(`/api/quizzes/${newQuizId}/questions`, {
      method: 'POST', headers: pauth, body: JSON.stringify(q),
    })
    assert(r.status === 201 || r.status === 200, `${q.type} 추가 (${r.status})`)
    createdQs.push(r.body)
  }

  section('[5] 문항 수정 (PATCH /api/questions/[id])')
  const firstQ = createdQs[0]
  const upd = await api(`/api/questions/${firstQ.id}`, {
    method: 'PATCH', headers: pauth,
    body: JSON.stringify({ text: 'MC 수정됨', points: 7 }),
  })
  assert(upd.body.text === 'MC 수정됨', 'text 수정 반영')
  assert(upd.body.points === 7, 'points 수정 반영')

  section('[6] 문항 삭제 (DELETE /api/questions/[id])')
  const del = await api(`/api/questions/${createdQs[3].id}`, { method: 'DELETE', headers: pauth })
  assert(del.status === 204, 'essay 삭제 204')

  const qList = await api(`/api/quizzes/${newQuizId}/questions`, { headers: pauth })
  assert(qList.body.length === 3, `남은 문항 3개 (실제 ${qList.body.length})`)

  section('[7] 엣지케이스 — 빈 제목 거부')
  try {
    const bad = await api('/api/quizzes', {
      method: 'POST', headers: pauth,
      body: JSON.stringify({ title: '', courseCode: 'CS301' }),
    })
    assert(bad.status === 400, `빈 제목 거부 (status ${bad.status})`)
  } catch (e: any) {
    fail(`빈 제목 거부 실패: ${e.message}`)
  }

  section('[8] 엣지케이스 — 잘못된 timeLimit (음수)')
  const badTime = await api(`/api/quizzes/${newQuizId}`, {
    method: 'PATCH', headers: pauth,
    body: JSON.stringify({ timeLimit: -10 }),
  })
  assert([400, 422].includes(badTime.status), `timeLimit 음수 거부 (${badTime.status})`)

  section('[9] 학생 로그인 후 본인 quiz 수정 시도 (권한 차단)')
  const sLogin = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 's01@xn.test' }),
  })
  const sauth = { Authorization: `Bearer ${sLogin.body.token}` }
  const studentPatch = await api(`/api/quizzes/${newQuizId}`, {
    method: 'PATCH', headers: sauth,
    body: JSON.stringify({ title: '해킹시도' }),
  })
  assert([401, 403].includes(studentPatch.status), `학생이 퀴즈 수정 차단 (${studentPatch.status})`)

  section('[10] 토큰 없이 조회 (401)')
  const noAuth = await api('/api/quizzes')
  assert(noAuth.status === 401, `미인증 조회 차단 (${noAuth.status})`)

  section('[11] 퀴즈 삭제 (DELETE /api/quizzes/[id])')
  const delQuiz = await api(`/api/quizzes/${newQuizId}`, { method: 'DELETE', headers: pauth })
  assert(delQuiz.status === 204, `삭제 204`)

  const afterDel = await api(`/api/quizzes/${newQuizId}`, { headers: pauth })
  assert(afterDel.status === 404, `삭제 후 404`)

  section('[12] 응시 제출된 퀴즈 조회 — /api/quizzes/1/questions')
  const q1 = await api('/api/quizzes/1/questions', { headers: pauth })
  assert(q1.status === 200 && q1.body.length > 0, `quiz 1 문항 ${q1.body.length}개`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━')
  if (process.exitCode) {
    console.log('✗ 회귀 실패 — 위 ✗ 항목 확인')
  } else {
    console.log('✓ 전체 회귀 통과')
  }
}

main().catch(e => { console.error('\n[fatal]', e); process.exit(1) })
