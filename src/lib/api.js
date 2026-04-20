/**
 * API 클라이언트
 *
 * fetch 래퍼. localStorage 에 저장된 JWT 를 자동으로 Authorization 헤더에 첨부.
 * RoleToggle 이 역할 전환 시 devLogin() 을 호출해 토큰을 교체한다.
 *
 * 사용:
 *   import { api, devLogin, getToken, clearToken } from '@/lib/api'
 *   const quizzes = await api('/api/quizzes')
 */

const TOKEN_KEY = 'xnq_token'

export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* quota / private mode */ }
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
}

/**
 * fetch 래퍼 — JSON 기본, Authorization 자동 첨부
 * @param {string} path - '/api/...'
 * @param {RequestInit} [options]
 * @returns {Promise<any>} 파싱된 JSON
 */
export async function api(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * 개발용 로그인 — email 로 JWT 발급받아 localStorage 저장
 * Canvas SSO 연동 시 이 함수는 폐기됨
 * @param {string} email
 * @returns {Promise<object>} 토큰 주인의 사용자 정보
 */
export async function devLogin(email) {
  const data = await api('/api/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  setToken(data.token)
  return data.user
}
