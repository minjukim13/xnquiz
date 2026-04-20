/**
 * Quizzes 데이터 레이어
 *
 * VITE_DATA_SOURCE=mock  → mockData.js 함수 호출 (동기를 Promise 로 감쌈)
 * VITE_DATA_SOURCE=api   → fetch('/api/quizzes/...')
 */
import { api } from '@/lib/api'
import {
  mockQuizzes,
  addQuiz as mockAdd,
  updateQuiz as mockUpdate,
  removeQuiz as mockRemove,
  getQuizQuestions as mockGetQuestions,
  setQuizQuestions as mockSetQuestions,
} from '@/data/mockData'

const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

// ISO("2026-04-21T00:00:00.000Z") → "YYYY-MM-DD HH:mm" (브라우저 로컬 시간대, mockData 포맷과 호환)
function normalizeDate(iso) {
  if (!iso) return iso ?? null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// api 응답 Quiz → mockData 포맷 호환으로 정규화 (날짜 · 평균점수 반올림)
function normalizeQuiz(q) {
  if (!q) return q
  return {
    ...q,
    startDate: normalizeDate(q.startDate),
    dueDate: normalizeDate(q.dueDate),
    lockDate: normalizeDate(q.lockDate),
    lateSubmitDeadline: normalizeDate(q.lateSubmitDeadline),
    scoreRevealStart: normalizeDate(q.scoreRevealStart),
    scoreRevealEnd: normalizeDate(q.scoreRevealEnd),
    avgScore: typeof q.avgScore === 'number' ? Math.round(q.avgScore * 10) / 10 : q.avgScore,
  }
}

// "CS301 데이터베이스" 같은 라벨에서 코드만 추출 ("CS301")
function extractCourseCode(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const first = s.split(/\s+/)[0]
  return first.toUpperCase()
}

// mock-shape quiz body → api createQuiz body 로 변환
function toApiQuizBody(body) {
  return {
    title: body.title,
    courseCode: body.courseCode || extractCourseCode(body.course),
    description: body.description ?? undefined,
    status: body.status ?? 'draft',
    visible: body.visible ?? true,
    hasFileUpload: body.hasFileUpload ?? false,
    startDate: body.startDate || null,
    dueDate: body.dueDate || null,
    lockDate: body.lockDate || null,
    week: body.week ?? null,
    session: body.session ?? null,
    timeLimit: typeof body.timeLimit === 'number' ? body.timeLimit : null,
    allowAttempts: typeof body.allowAttempts === 'number' ? body.allowAttempts : 1,
    scorePolicy: body.scorePolicy ?? null,
    scoreRevealEnabled: !!body.scoreRevealEnabled,
    scoreRevealScope: body.scoreRevealScope ?? null,
    scoreRevealTiming: body.scoreRevealTiming ?? null,
    scoreRevealStart: body.scoreRevealStart || null,
    scoreRevealEnd: body.scoreRevealEnd || null,
    allowLateSubmit: !!body.allowLateSubmit,
    lateSubmitDeadline: body.lateSubmitDeadline || null,
  }
}

// 문항 body 에서 api 전송 전 정리 (mock 에만 있는 집계 필드 제거)
function toApiQuestionBody(q) {
  const { id: _id, gradedCount: _g, totalCount: _t, avgScore: _a, bankId: _b, ...rest } = q  // eslint-disable-line no-unused-vars
  return rest
}

export async function listQuizzes(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    const rows = await api('/api/quizzes' + (qs ? '?' + qs : ''))
    return rows.map(normalizeQuiz)
  }
  return [...mockQuizzes]
}

export async function getQuiz(id) {
  if (MODE === 'api') return normalizeQuiz(await api(`/api/quizzes/${id}`))
  return mockQuizzes.find(q => q.id === id) ?? null
}

export async function getQuizQuestions(id) {
  if (MODE === 'api') return await api(`/api/quizzes/${id}/questions`)
  return mockGetQuestions(id)
}

export async function createQuiz(body) {
  if (MODE === 'api') {
    return normalizeQuiz(await api('/api/quizzes', {
      method: 'POST', body: JSON.stringify(toApiQuizBody(body)),
    }))
  }
  const newQuiz = { id: body.id ?? 'new_' + Date.now(), ...body }
  mockAdd(newQuiz)
  return newQuiz
}

export async function updateQuiz(id, body) {
  if (MODE === 'api') {
    return normalizeQuiz(await api(`/api/quizzes/${id}`, {
      method: 'PATCH', body: JSON.stringify(toApiQuizBody(body)),
    }))
  }
  return mockUpdate(id, body)
}

export async function deleteQuiz(id) {
  if (MODE === 'api') {
    await api(`/api/quizzes/${id}`, { method: 'DELETE' })
    return true
  }
  return mockRemove(id)
}

// 개별 문항 CRUD (api 모드 전용 — mock 은 setQuizQuestions 로 일괄 처리)
export async function createQuizQuestion(quizId, body) {
  if (MODE === 'api') {
    return await api(`/api/quizzes/${quizId}/questions`, {
      method: 'POST', body: JSON.stringify(toApiQuestionBody(body)),
    })
  }
  throw new Error('createQuizQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

export async function updateQuestion(id, body) {
  if (MODE === 'api') {
    return await api(`/api/questions/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }
  throw new Error('updateQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

export async function deleteQuestion(id) {
  if (MODE === 'api') {
    await api(`/api/questions/${id}`, { method: 'DELETE' })
    return true
  }
  throw new Error('deleteQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

export async function setQuizQuestions(id, questions) {
  if (MODE === 'api') {
    // api 모드: 기존 문항 전체 삭제 후 순서대로 재생성 (단순·안전)
    const existing = await getQuizQuestions(id)
    await Promise.all(existing.map(q => deleteQuestion(q.id)))
    const created = []
    for (const q of questions) {
      created.push(await createQuizQuestion(id, q))
    }
    return created
  }
  return mockSetQuestions(id, questions)
}
