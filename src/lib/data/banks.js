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
  throw new Error('createBank: mock 모드는 QuestionBankContext 경로 사용')
}

export async function updateBank(id, body) {
  if (MODE === 'api') {
    return await api(`/api/banks/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }
  throw new Error('updateBank: mock 모드는 QuestionBankContext 경로 사용')
}

export async function deleteBank(id) {
  if (MODE === 'api') {
    await api(`/api/banks/${id}`, { method: 'DELETE' })
    return true
  }
  throw new Error('deleteBank: mock 모드는 QuestionBankContext 경로 사용')
}

export async function createBankQuestion(bankId, body) {
  if (MODE === 'api') {
    return await api(`/api/banks/${bankId}/questions`, {
      method: 'POST', body: JSON.stringify(body),
    })
  }
  throw new Error('createBankQuestion: mock 모드는 QuestionBankContext 경로 사용')
}

export async function updateBankQuestion(id, body) {
  if (MODE === 'api') {
    return await api(`/api/bank-questions/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    })
  }
  throw new Error('updateBankQuestion: mock 모드는 QuestionBankContext 경로 사용')
}

export async function deleteBankQuestion(id) {
  if (MODE === 'api') {
    await api(`/api/bank-questions/${id}`, { method: 'DELETE' })
    return true
  }
  throw new Error('deleteBankQuestion: mock 모드는 QuestionBankContext 경로 사용')
}
