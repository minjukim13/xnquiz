/**
 * Banks 데이터 레이어
 */
import { api } from '@/lib/api'
import { MOCK_BANKS, MOCK_BANK_QUESTIONS } from '@/data/mockData'

const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export async function listBanks(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    return await api('/api/banks' + (qs ? '?' + qs : ''))
  }
  return [...MOCK_BANKS]
}

export async function getBankQuestions(bankId) {
  if (MODE === 'api') return await api(`/api/banks/${bankId}/questions`)
  return MOCK_BANK_QUESTIONS.filter(bq => bq.bankId === bankId)
}

export async function createBank(body) {
  if (MODE === 'api') {
    return await api('/api/banks', { method: 'POST', body: JSON.stringify(body) })
  }
  // mock: 전역 배열 수정은 QuestionBankContext 에서 처리 — 여기선 지원 안 함
  throw new Error('createBank: mock 모드는 QuestionBankContext 경로 사용')
}

export async function createBankQuestion(bankId, body) {
  if (MODE === 'api') {
    return await api(`/api/banks/${bankId}/questions`, {
      method: 'POST', body: JSON.stringify(body),
    })
  }
  throw new Error('createBankQuestion: mock 모드는 QuestionBankContext 경로 사용')
}
