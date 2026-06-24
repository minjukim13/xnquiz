// XQ-D-02 R-006: 접근 제한 허용 IP/CIDR 형식 검증
// 쉼표 또는 줄바꿈으로 구분된 IPv4 주소(선택적 CIDR 표기) 목록을 검사한다.

const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4_RE = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`)

// 단일 토큰(IPv4 또는 IPv4/CIDR)이 유효한지 판정. 빈 토큰은 유효로 간주(무시 대상).
export function isValidIpOrCidr(token) {
  const t = (token ?? '').trim()
  if (!t) return true
  const parts = t.split('/')
  if (parts.length > 2) return false
  const [ip, mask] = parts
  if (!IPV4_RE.test(ip)) return false
  if (mask !== undefined) {
    if (!/^\d{1,2}$/.test(mask)) return false
    const m = Number(mask)
    if (m < 0 || m > 32) return false
  }
  return true
}

// 형식 오류 토큰 목록 반환(쉼표/줄바꿈 구분). 비어 있거나 모두 유효하면 빈 배열.
export function getInvalidIpTokens(text) {
  if (!text) return []
  return text
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(t => !isValidIpOrCidr(t))
}
