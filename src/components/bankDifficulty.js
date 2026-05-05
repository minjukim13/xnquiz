// 문제모음 난이도 공통 상수 — AddBank/Export/Import 모달 공통 사용
export const DIFFICULTY_META = {
  high:   { label: '상', cls: 'text-destructive bg-incorrect-bg', textCls: 'text-destructive' },
  medium: { label: '중', cls: 'text-amber-500 bg-amber-50', textCls: 'text-amber-500' },
  low:    { label: '하', cls: 'text-correct bg-correct-bg', textCls: 'text-correct' },
}

export const DIFF_LABEL = { '': '미지정', high: '상', medium: '중', low: '하' }

// 문제모음(bank)이 선택된 문항 묶음을 받을 수 있는지 판단.
// 난이도가 미지정인 문제모음은 모든 문항을 허용하고, 고정 난이도가 있는 문제모음은
// 모든 문항의 난이도가 일치할 때만 호환된다.
export function isBankCompatible(bank, questions) {
  if (!bank?.difficulty) return true
  if (!questions || questions.length === 0) return true
  return questions.every(q => q.difficulty === bank.difficulty)
}
