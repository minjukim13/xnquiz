// 신규 엔드포인트 검증
//   1. PUT /api/quizzes/[id]/questions — 배치 UPSERT (Answer FK 보존)
//   2. POST /api/questions/[id]/regrade — 옵션별 재채점
//
// 실행: npx tsx scripts/test-upsert-regrade.ts

const BASE = 'http://localhost:3000'

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  return { status: res.status, body: res.status === 204 ? null : await res.json() }
}

function section(title: string) { console.log(`\n━━ ${title}`) }
function pass(msg: string) { console.log(`  ✓ ${msg}`) }
function fail(msg: string) { console.log(`  ✗ ${msg}`); process.exitCode = 1 }
function assert(cond: any, msg: string) { cond ? pass(msg) : fail(msg) }

async function main() {
  // ── setup ────────────────────────────────────────────────
  section('[setup] 교수자·학생 로그인')
  const pL = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 'prof@xn.test' }),
  })
  const pauth = { Authorization: `Bearer ${pL.body.token}` }
  assert(pL.status === 200, 'prof 토큰')

  const sL = await api('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({ email: 's44@xn.test' }),
  })
  const sauth = { Authorization: `Bearer ${sL.body.token}` }
  assert(sL.status === 200, 's44 토큰')

  // 퀴즈 생성
  const qz = await api('/api/quizzes', {
    method: 'POST', headers: pauth,
    body: JSON.stringify({ title: 'upsert·regrade 검증 퀴즈', courseCode: 'CS301', status: 'open', visible: true }),
  })
  assert(qz.status === 201, `퀴즈 생성 (${qz.status})`)
  const quizId = qz.body.id

  let testQuizId = quizId
  try {
    // 문항 3개 POST — A, B, C (MC, choice 0 정답 · 10점)
    const addQ = async (label: string) => {
      const r = await api(`/api/quizzes/${quizId}/questions`, {
        method: 'POST', headers: pauth,
        body: JSON.stringify({
          type: 'multiple_choice',
          text: `${label} 문항`,
          points: 10,
          choices: ['정답', '오답1', '오답2'],
          correctAnswer: '정답',
        }),
      })
      return r.body
    }
    const qA = await addQ('A')
    const qB = await addQ('B')
    const qC = await addQ('C')
    assert(qA.id && qB.id && qC.id, `문항 3개 ID 발급 (${qA.id}, ${qB.id}, ${qC.id})`)

    // 학생 응시 — A 정답, B 오답, C 정답
    const att = await api('/api/attempts', {
      method: 'POST', headers: sauth, body: JSON.stringify({ quizId }),
    })
    assert(att.status === 200 || att.status === 201, `응시 시작 (${att.status})`)
    const attemptId = att.body.id

    const ans = await api(`/api/attempts/${attemptId}/answers`, {
      method: 'PUT', headers: sauth,
      body: JSON.stringify({
        answers: [
          { questionId: qA.id, response: '정답' },
          { questionId: qB.id, response: '오답2' },
          { questionId: qC.id, response: '정답' },
        ],
      }),
    })
    assert(ans.body.saved === 3, `답안 3개 저장 (saved=${ans.body.saved})`)

    const sub = await api(`/api/attempts/${attemptId}/submit`, {
      method: 'POST', headers: sauth,
    })
    assert(sub.status === 200, `제출 (${sub.status})`)
    assert(sub.body.totalScore === 20, `자동채점 합계 20점 (실제 ${sub.body.totalScore})`)

    // ── [PUT] 배치 UPSERT ────────────────────────────────────
    section('[PUT] /api/quizzes/[id]/questions')

    // qA 수정(points 15) + qB 빠짐(삭제) + qD 신규(id 없음)
    const put = await api(`/api/quizzes/${quizId}/questions`, {
      method: 'PUT', headers: pauth,
      body: JSON.stringify([
        {
          id: qA.id,
          type: 'multiple_choice',
          text: 'A 문항 (수정)',
          points: 15,
          choices: ['정답', '오답1', '오답2'],
          correctAnswer: '정답',
        },
        {
          id: qC.id,
          type: 'multiple_choice',
          text: 'C 문항',
          points: 10,
          choices: ['정답', '오답1', '오답2'],
          correctAnswer: '정답',
        },
        {
          type: 'multiple_choice',
          text: 'D 신규 문항',
          points: 10,
          choices: ['정답', '오답1', '오답2'],
          correctAnswer: '정답',
        },
      ]),
    })
    assert(put.status === 200, `PUT 성공 (${put.status})`)
    assert(put.body.length === 3, `결과 3개 (실제 ${put.body.length})`)
    assert(put.body[0].id === qA.id, 'A ID 유지 (UPDATE)')
    assert(put.body[0].points === 15, `A points 15 반영 (실제 ${put.body[0].points})`)
    assert(put.body[1].id === qC.id, 'C ID 유지 (UPDATE)')
    assert(put.body[2].id && put.body[2].id !== qA.id && put.body[2].id !== qC.id, `D 새 cuid 발급 (${put.body[2].id})`)
    assert(put.body[0].order === 1 && put.body[1].order === 2 && put.body[2].order === 3, 'order 1·2·3 재부여')

    // Answer FK 보존 검증 — 응시 재조회
    const attAfter = await api(`/api/attempts?quizId=${quizId}`, { headers: pauth })
    const studAtt = attAfter.body.find((a: any) => a.userId === 's44')
    assert(studAtt, 's44 응시 레코드 유지')
    const ansMap: Record<string, any> = {}
    for (const a of studAtt.answers) ansMap[a.questionId] = a
    assert(ansMap[qA.id], `A 답안 유지 (FK 보존)`)
    assert(!ansMap[qB.id], 'B 답안 cascade 삭제')
    assert(ansMap[qC.id], 'C 답안 유지')

    // 학생 PUT 차단
    const sPut = await api(`/api/quizzes/${quizId}/questions`, {
      method: 'PUT', headers: sauth, body: JSON.stringify([]),
    })
    assert([401, 403].includes(sPut.status), `학생 PUT 차단 (${sPut.status})`)

    // 잘못된 입력 (type 누락)
    const badPut = await api(`/api/quizzes/${quizId}/questions`, {
      method: 'PUT', headers: pauth,
      body: JSON.stringify([{ text: 'no type', points: 5 }]),
    })
    assert(badPut.status === 400, `type 누락 거부 (${badPut.status})`)

    // ── [POST] regrade ──────────────────────────────────────
    section('[POST] /api/questions/[id]/regrade')

    // (1) no_regrade — 즉시 0 반환
    const noR = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: pauth, body: JSON.stringify({ option: 'no_regrade' }),
    })
    assert(noR.status === 200 && noR.body.changedAnswers === 0, `no_regrade → 0 (${noR.body.changedAnswers})`)

    // (2) invalid option → 400
    const badOpt = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: pauth, body: JSON.stringify({ option: 'unknown' }),
    })
    assert(badOpt.status === 400, `잘못된 option 거부 (${badOpt.status})`)

    // (3) 학생 호출 차단
    const sReg = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: sauth, body: JSON.stringify({ option: 'full_points' }),
    })
    assert([401, 403].includes(sReg.status), `학생 재채점 차단 (${sReg.status})`)

    // (4) full_points — A(15점 만점) 답안을 만점 부여
    //     현재 A 답안 autoScore는 points 변경 전 기준이라 낡은 상태.
    //     full_points 로 15점으로 올라가야 함.
    const full = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: pauth, body: JSON.stringify({ option: 'full_points' }),
    })
    assert(full.status === 200, `full_points 200 (${full.status})`)
    assert(full.body.changedAnswers >= 1, `변경 답안 ≥1 (${full.body.changedAnswers})`)
    assert(full.body.regradedStudents >= 1, `영향 학생 ≥1 (${full.body.regradedStudents})`)

    // A 답안이 15점으로 올라갔는지
    const att2 = await api(`/api/attempts?quizId=${quizId}`, { headers: pauth })
    const s44att = att2.body.find((a: any) => a.userId === 's44')
    const aAns = s44att.answers.find((x: any) => x.questionId === qA.id)
    assert(aAns.autoScore === 15, `A 답안 autoScore=15 (실제 ${aAns.autoScore})`)
    // Attempt 합계 재계산 검증 — A(15) + C(10) = 25
    assert(s44att.totalScore === 25, `Attempt totalScore=25 (실제 ${s44att.totalScore})`)

    // (5) new_answer_only — 정답을 바꾼 뒤 재채점
    //     A 의 correctAnswer 를 '오답1' 로 바꿈 → 학생('정답') 은 오답 → 0점
    await api(`/api/questions/${qA.id}`, {
      method: 'PATCH', headers: pauth,
      body: JSON.stringify({ correctAnswer: '오답1' }),
    })
    const na = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: pauth, body: JSON.stringify({ option: 'new_answer_only' }),
    })
    assert(na.status === 200, `new_answer_only 200 (${na.status})`)
    const att3 = await api(`/api/attempts?quizId=${quizId}`, { headers: pauth })
    const aAns3 = att3.body.find((a: any) => a.userId === 's44').answers.find((x: any) => x.questionId === qA.id)
    assert(aAns3.autoScore === 0, `new_answer_only 후 A=0점 (실제 ${aAns3.autoScore})`)

    // (6) award_both — 이전 정답('정답')과 새 정답('오답1') 중 높은 점수
    //     학생은 '정답' 이므로 이전 정답 기준 만점 → 15점
    const aw = await api(`/api/questions/${qA.id}/regrade`, {
      method: 'POST', headers: pauth,
      body: JSON.stringify({ option: 'award_both', oldCorrectAnswer: '정답' }),
    })
    assert(aw.status === 200, `award_both 200 (${aw.status})`)
    const att4 = await api(`/api/attempts?quizId=${quizId}`, { headers: pauth })
    const aAns4 = att4.body.find((a: any) => a.userId === 's44').answers.find((x: any) => x.questionId === qA.id)
    assert(aAns4.autoScore === 15, `award_both 후 A=15점 (실제 ${aAns4.autoScore})`)
  } finally {
    // cleanup — 응시·답안 cascade 삭제
    const del = await api(`/api/quizzes/${testQuizId}`, { method: 'DELETE', headers: pauth })
    if (del.status === 204) console.log(`\n[cleanup] 퀴즈 삭제 204`)
    else console.log(`\n[cleanup] 퀴즈 삭제 실패 (${del.status}) — quizId=${testQuizId}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━')
  if (process.exitCode) console.log('✗ 일부 실패')
  else console.log('✓ 전체 통과')
}

main().catch(e => { console.error('\n[fatal]', e); process.exit(1) })
