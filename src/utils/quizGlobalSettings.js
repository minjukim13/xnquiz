// 퀴즈 기본 설정(과목 기본값) 저장/조회 유틸 — 전역 1벌 (xnq_global_settings)
// D-05 과목 기본값: 신규 퀴즈 생성 시 자동 적용. 미설정 시 시스템 기본값(R-003) 사용.
// 정답 판정/부분 점수는 채점 시점(mockData)에서도 같은 키를 읽는다.

const STORAGE_KEY = 'xnq_global_settings'

// 시스템 기본값 (R-003): 응시 1회 / 성적 반영 최고점 / 결과 공개 비공개
export const GLOBAL_SETTINGS_DEFAULTS = {
  // 채점 관련 (기존)
  multipleAnswersScoringMode: 'all_correct',
  penaltyMethod: 'none',
  caseSensitive: false,
  whitespaceSensitive: false,
  // 신규 퀴즈 기본값 (D-05 R-001 / R-003)
  defaultAllowAttempts: 1,             // 1, N(>=2), 또는 -1(무제한)
  defaultScorePolicy: '최고 점수 유지', // 최고/최신/평균
  defaultScoreRevealEnabled: false,    // 결과 공개 (기본 비공개)
  defaultScoreRevealTiming: 'immediately', // 공개 시 시점 (immediately/after_due/period)
  // 응시 편의 지원 (Accommodation, 7.7): 과목 단위 1벌. 학생별 추가 시간을
  // 비율(%) 또는 절대 분(分) 단위로 등록하면 이 과목의 모든 시간 제한 퀴즈에 자동 적용된다.
  // 날짜 연장은 추가 할당이 담당. 데모 시드: 학생 A(s1) +50%.
  // 항목 스키마: { studentId, extraAmount: number, extraUnit: 'percent' | 'minutes' }
  accommodations: [{ studentId: 's1', extraAmount: 50, extraUnit: 'percent' }],
}

export function getGlobalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...GLOBAL_SETTINGS_DEFAULTS, ...JSON.parse(raw) } : { ...GLOBAL_SETTINGS_DEFAULTS }
  } catch {
    return { ...GLOBAL_SETTINGS_DEFAULTS }
  }
}

export function saveGlobalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

// 과목 기본값을 신규 퀴즈 폼 초기값 형태로 변환
export function getQuizDefaultsForForm() {
  const g = getGlobalSettings()
  const unlimited = g.defaultAllowAttempts === -1
  return {
    allowAttempts: unlimited ? 2 : (g.defaultAllowAttempts ?? 1),
    unlimitedAttempts: unlimited,
    scorePolicy: g.defaultScorePolicy ?? '최고 점수 유지',
    scoreRevealEnabled: !!g.defaultScoreRevealEnabled,
    scoreRevealTiming: g.defaultScoreRevealTiming ?? 'immediately',
  }
}

// ── 응시 편의 지원 (Accommodation, 7.7) ──
// 과목 단위 학생별 제한 시간 추가 비율. QuizSettingsDialog 에서 등록하고 QuizAttempt 타이머가 읽는다.
export function getAccommodations() {
  return getGlobalSettings().accommodations || []
}

export function getAccommodation(studentId) {
  if (!studentId) return null
  return getAccommodations().find(a => a.studentId === studentId) || null
}

// 항목에서 (단위, 수량) 정규화 — 구 스키마(extraTimePercent) 하위호환 포함
function _normalizeAccommodation(acc) {
  if (!acc) return { unit: null, amount: 0 }
  const unit = acc.extraUnit ?? (acc.extraTimePercent != null ? 'percent' : 'minutes')
  const amount = Number(acc.extraAmount ?? acc.extraTimePercent) || 0
  return { unit, amount }
}

// 학생의 유효 제한 시간(분). 비율(%)이면 base x (1+amount/100), 분이면 base + amount.
// 비대상/무제한 퀴즈/수량 0 이하는 원본 반환.
export function getEffectiveTimeLimit(baseMinutes, studentId) {
  if (!baseMinutes) return baseMinutes
  const { unit, amount } = _normalizeAccommodation(getAccommodation(studentId))
  if (amount <= 0) return baseMinutes
  return unit === 'minutes' ? baseMinutes + amount : Math.round(baseMinutes * (1 + amount / 100))
}

// 응시 화면 배지용 라벨 ("+50%" / "+30분"). 수량 0 이하면 null.
export function formatAccommodationLabel(acc) {
  const { unit, amount } = _normalizeAccommodation(acc)
  if (amount <= 0) return null
  return unit === 'minutes' ? `+${amount}분` : `+${amount}%`
}

// 현재 폼 값이 과목 기본값과 다른지 항목별로 판정 (R-002 재정의 표시용)
// 반환: { attempts, scorePolicy, scoreReveal } 각 boolean (true = 기본값과 다름)
export function diffFromDefaults(form) {
  const g = getGlobalSettings()
  const effectiveAttempts = form.unlimitedAttempts ? -1 : form.allowAttempts
  const isMulti = form.unlimitedAttempts || form.allowAttempts >= 2

  const attempts = effectiveAttempts !== (g.defaultAllowAttempts ?? 1)
  // 성적 반영 방식은 다중 응시일 때만 의미가 있음
  const scorePolicy = isMulti && form.scorePolicy !== (g.defaultScorePolicy ?? '최고 점수 유지')
  // 결과 공개: 켬/끔이 다르거나, 둘 다 켜졌는데 시점이 다른 경우
  const revealOnOff = !!form.scoreRevealEnabled !== !!g.defaultScoreRevealEnabled
  const revealTiming = form.scoreRevealEnabled && g.defaultScoreRevealEnabled &&
    form.scoreRevealTiming !== (g.defaultScoreRevealTiming ?? 'immediately')
  const scoreReveal = revealOnOff || revealTiming

  return { attempts, scorePolicy, scoreReveal }
}
