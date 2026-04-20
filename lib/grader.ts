// 자동채점 순수 함수
//
// 반환:
//   number — 자동채점 점수 (0 ~ points)
//   null   — 수동채점 필요 (essay · file_upload · text · 정답 없음)
//
// 지원 타입: multiple_choice · true_false · multiple_answers · short_answer · numerical
// 미지원 타입 (formula · matching · 다중빈칸 · 드롭다운) 은 null 반환 → 수동채점 대기

export type GradableQuestion = {
  type: string
  points: number
  correctAnswer?: unknown // JSON
  scoringMode?: string | null
}

export function autoGradeAnswer(question: GradableQuestion, response: unknown): number | null {
  if (question.type === 'essay' || question.type === 'file_upload' || question.type === 'text') {
    return null
  }

  if (response === null || response === undefined || response === '') return 0

  const correct = question.correctAnswer
  if (correct === undefined || correct === null) return null

  const pts = question.points

  switch (question.type) {
    case 'multiple_choice':
    case 'true_false': {
      return eq(response, correct) ? pts : 0
    }

    case 'multiple_answers': {
      const corrArr = toArray(correct)
      const respArr = toArray(response)
      const corrSet = new Set(corrArr.map(norm))
      const respSet = new Set(respArr.map(norm))

      const mode = question.scoringMode ?? 'all_correct'
      if (mode === 'partial') {
        if (corrArr.length === 0) return null
        const correctCount = respArr.filter(r => corrSet.has(norm(r))).length
        return Math.round((correctCount / corrArr.length) * pts * 2) / 2
      }
      // all_correct: 정답 전부 선택 + 오답 없음
      const allIncluded = corrArr.every(c => respSet.has(norm(c)))
      const noWrong     = respArr.every(r => corrSet.has(norm(r)))
      return allIncluded && noWrong ? pts : 0
    }

    case 'short_answer': {
      const candidates = Array.isArray(correct) ? correct : [correct]
      return candidates.some(c => eq(c, response)) ? pts : 0
    }

    case 'numerical': {
      const num    = Number(response)
      const target = Number(Array.isArray(correct) ? correct[0] : correct)
      if (Number.isNaN(num) || Number.isNaN(target)) return 0
      // tolerance 는 프로토타입 단계에서 정확 일치만 지원
      return num === target ? pts : 0
    }

    default:
      return null // 미지원 타입 → 수동채점
  }
}

function norm(v: unknown): string {
  // .normalize('NFC'): 한글 자모 결합형 통일 (macOS NFD ↔ Windows NFC 차이 방지)
  return String(v ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, '')
}

function eq(a: unknown, b: unknown): boolean {
  return norm(a) === norm(b)
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    // "CREATE, ALTER, DROP" 같은 쉼표 문자열도 지원
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }
  return [v]
}
