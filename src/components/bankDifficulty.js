// 문제은행 난이도 공통 상수 — AddBank/Export/Import 모달 공통 사용
export const DIFFICULTY_META = {
  high:   { label: '상', cls: 'text-destructive bg-incorrect-bg', textCls: 'text-destructive' },
  medium: { label: '중', cls: 'text-amber-500 bg-amber-50', textCls: 'text-amber-500' },
  low:    { label: '하', cls: 'text-correct bg-correct-bg', textCls: 'text-correct' },
}

export const DIFF_LABEL = { '': '미설정', high: '상', medium: '중', low: '하' }

// XQ-FRD-001 v0.3: 그룹 난이도와 문항 난이도는 독립 입력값이며
// 그룹 난이도에 따라 문항 추가/이동이 제약되지 않는다 (혼재/불일치 허용).
// 기존 호출부 호환성을 위해 함수는 남기되 항상 true 를 반환한다.
export function isBankCompatible() {
  return true
}
