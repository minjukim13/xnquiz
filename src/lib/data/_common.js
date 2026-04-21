/**
 * 데이터 레이어 공용 유틸
 * VITE_DATA_SOURCE 환경변수를 한 곳에서 관리하고, mock/api 포맷 정합성 헬퍼 제공
 */

export const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

// ISO 문자열을 "YYYY-MM-DD HH:mm" (브라우저 로컬) 으로 정규화 — mockData 포맷과 호환
export function normalizeDate(iso) {
  if (!iso) return iso ?? null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
