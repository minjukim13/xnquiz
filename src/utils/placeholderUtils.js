/**
 * 다중 빈칸 / 드롭다운 placeholder 유틸
 * 본문에 [빈칸N] / [드롭다운N] 형태로 삽입되어 학생 화면에서 inline input/select 으로 렌더링됨
 */

export const BLANK_RE = /\[빈칸(\d+)\]/g
export const DROPDOWN_RE = /\[드롭다운(\d+)\]/g

export function countBlanks(text) {
  return (String(text || '').match(BLANK_RE) || []).length
}

export function countDropdowns(text) {
  return (String(text || '').match(DROPDOWN_RE) || []).length
}

export function hasAllBlankPlaceholders(text, n) {
  for (let i = 1; i <= n; i++) if (!String(text || '').includes(`[빈칸${i}]`)) return false
  return true
}

export function hasAllDropdownPlaceholders(text, n) {
  for (let i = 1; i <= n; i++) if (!String(text || '').includes(`[드롭다운${i}]`)) return false
  return true
}

// k번 placeholder 를 제거하고 그 이후 번호를 -1 시프트
export function removeAndShiftBlank(text, k) {
  let next = String(text || '').replace(new RegExp(`\\s*\\[빈칸${k}\\]\\s*`, 'g'), ' ')
  next = next.replace(BLANK_RE, (m, num) => {
    const n = Number(num)
    return n > k ? `[빈칸${n - 1}]` : m
  })
  return next.replace(/\s{2,}/g, ' ').trim()
}

export function removeAndShiftDropdown(text, k) {
  let next = String(text || '').replace(new RegExp(`\\s*\\[드롭다운${k}\\]\\s*`, 'g'), ' ')
  next = next.replace(DROPDOWN_RE, (m, num) => {
    const n = Number(num)
    return n > k ? `[드롭다운${n - 1}]` : m
  })
  return next.replace(/\s{2,}/g, ' ').trim()
}
