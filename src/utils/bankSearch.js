// 문제모음 통합 검색 — 문항의 본문·보기·정답 텍스트를 한 문자열로 평탄화한다.
export function questionSearchText(q) {
  const parts = [q.text]
  if (Array.isArray(q.options)) parts.push(...q.options)
  if (Array.isArray(q.choices)) parts.push(...q.choices)
  if (Array.isArray(q.pairs)) q.pairs.forEach(p => parts.push(p?.left, p?.right))
  if (typeof q.correctAnswer === 'string') parts.push(q.correctAnswer)
  if (Array.isArray(q.correctAnswer)) parts.push(...(q.correctAnswer.flat?.() ?? q.correctAnswer))
  return parts.filter(Boolean).join(' ').toLowerCase()
}
