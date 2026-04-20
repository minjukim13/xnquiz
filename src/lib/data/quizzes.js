/**
 * Quizzes 데이터 레이어
 *
 * VITE_DATA_SOURCE=mock  → mockData.js 함수 호출 (동기를 Promise 로 감쌈)
 * VITE_DATA_SOURCE=api   → fetch('/api/quizzes/...')
 *
 * 전환 완료 후에는 mockData 의존성 제거 가능.
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

export async function listQuizzes(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    return await api('/api/quizzes' + (qs ? '?' + qs : ''))
  }
  return [...mockQuizzes]
}

export async function getQuiz(id) {
  if (MODE === 'api') return await api(`/api/quizzes/${id}`)
  return mockQuizzes.find(q => q.id === id) ?? null
}

export async function getQuizQuestions(id) {
  if (MODE === 'api') return await api(`/api/quizzes/${id}/questions`)
  return mockGetQuestions(id)
}

export async function createQuiz(body) {
  if (MODE === 'api') {
    return await api('/api/quizzes', { method: 'POST', body: JSON.stringify(body) })
  }
  const newQuiz = { id: 'new_' + Date.now(), ...body }
  mockAdd(newQuiz)
  return newQuiz
}

export async function updateQuiz(id, body) {
  if (MODE === 'api') {
    return await api(`/api/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
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

export async function setQuizQuestions(id, questions) {
  if (MODE === 'api') {
    // 전체 교체는 단일 엔드포인트로 없어 — 개별 PATCH/DELETE/POST 조합은 별도 유틸 필요
    // 현재는 mock 전용 (쓰기 전환은 다음 스텝)
    throw new Error('setQuizQuestions: api 모드는 아직 미지원')
  }
  return mockSetQuestions(id, questions)
}
